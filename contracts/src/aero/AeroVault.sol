// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IAeroPool, IAeroGauge, IAeroAutomationFactory, IAeroDeferredHandler } from "./IAero.sol";

/// @notice Shared classic-pool vault. Shares own LP plus a pro-rata basket of uninvested rewards.
/// @dev New deployments only: deliberately not an upgrade of InfiniteVaultStrategy.
contract AeroVault is ERC20, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_SHARES = 1000;
    address public constant DEAD = address(0xdead);
    IAeroAutomationFactory public immutable automationFactory;
    address public immutable asset;
    address public immutable gauge;
    address public immutable rewardToken;
    address public immutable token0;
    address public immutable token1;
    address[3] public rewardTokens;
    uint256[3] private accounted;
    address public strategist;
    uint16 public strategistBps;
    uint16 public keeperBps;
    uint16 public entryBps;
    uint16 public exitBps;
    bool public stakingEnabled;
    mapping(address => bool) public extraKeepers;
    mapping(address => uint256) public deferredCredits;
    uint256 public totalDeferredCredits;
    uint256 public deferredReserved;

    struct Config {
        address pool;
        address gauge;
        address rewardToken;
        address owner;
        address strategist;
        uint16 strategistBps;
        uint16 keeperBps;
        uint16 entryBps;
        uint16 exitBps;
        string name;
        string symbol;
    }

    struct Swap {
        address pool;
        address tokenIn;
        uint256 amountIn;
        uint256 minOut;
    }

    event FeesUpdated(address strategist, uint16 strategistBps, uint16 keeperBps, uint16 entryBps, uint16 exitBps);
    event KeeperUpdated(address indexed keeper, bool enabled);
    event RewardFees(address indexed token, address indexed keeper, uint256 dao, uint256 strategist, uint256 caller);
    event EntryExitFees(address indexed token, bool entry, uint256 dao, uint256 strategist);
    event Deposited(address indexed user, uint256 lp, uint256 shares);
    event Redeemed(address indexed user, uint256 lp, uint256 shares);
    event Harvested(address indexed keeper, uint256 lp);
    event StakingUpdated(bool enabled);
    event DeferredCredit(address indexed user, uint256 grossReward);
    event DeferredClaimed(address indexed user, uint256 grossReward);

    error InvalidConfig();
    error UnauthorizedKeeper();
    error ProtectedKeeper();
    error InvalidAmount();
    error Slippage();
    error InvalidSwap();
    error UnsupportedToken();

    constructor(address factory_, Config memory c) ERC20(c.name, c.symbol) Ownable(c.owner) {
        automationFactory = IAeroAutomationFactory(factory_);
        asset = c.pool;
        gauge = c.gauge;
        rewardToken = c.rewardToken;
        token0 = IAeroPool(c.pool).token0();
        token1 = IAeroPool(c.pool).token1();
        if (
            token0 == token1 || token0 == address(0) || token1 == address(0) || c.rewardToken == address(0)
                || c.rewardToken == c.pool
        ) revert InvalidConfig();
        rewardTokens[0] = token0;
        rewardTokens[1] = token1;
        if (rewardToken != token0 && rewardToken != token1) rewardTokens[2] = rewardToken;
        stakingEnabled = c.gauge != address(0);
        _setFees(c.strategist, c.strategistBps, c.keeperBps, c.entryBps, c.exitBps);
    }

    function totalAssets() public view returns (uint256) {
        return
            IERC20(asset).balanceOf(address(this))
                + (gauge == address(0) ? 0 : IAeroGauge(gauge).balanceOf(address(this)));
    }

    function isKeeper(address account) public view returns (bool) {
        return automationFactory.mandatoryKeepers(account) || extraKeepers[account];
    }

    function setKeeper(address keeper, bool enabled) external onlyOwner {
        if (keeper == address(0)) revert InvalidConfig();
        if (!enabled && automationFactory.mandatoryKeepers(keeper)) revert ProtectedKeeper();
        extraKeepers[keeper] = enabled;
        emit KeeperUpdated(keeper, enabled);
    }

    function setFees(address recipient, uint16 strategy, uint16 keeper, uint16 entry, uint16 exit) external onlyOwner {
        _setFees(recipient, strategy, keeper, entry, exit);
    }

    function _setFees(address recipient, uint16 strategy, uint16 keeper, uint16 entry, uint16 exit) private {
        if (
            recipient == address(0) || recipient == address(this) || strategy > 1000 || keeper < 10 || keeper > 200
                || entry > 200 || exit > 200
        ) revert InvalidConfig();
        strategist = recipient;
        strategistBps = strategy;
        keeperBps = keeper;
        entryBps = entry;
        exitBps = exit;
        emit FeesUpdated(recipient, strategy, keeper, entry, exit);
    }

    function setStaking(bool enabled) external onlyOwner nonReentrant {
        if (gauge == address(0)) revert InvalidConfig();
        stakingEnabled = enabled;
        if (!enabled) {
            uint256 staked = IAeroGauge(gauge).balanceOf(address(this));
            if (staked != 0) IAeroGauge(gauge).withdraw(staked);
            _collect(automationFactory.defaultKeeper());
        } else {
            _stake();
        }
        emit StakingUpdated(enabled);
    }

    /// @notice Pay LP and the proportional reward basket; maxExtra is in rewardTokens order.
    /// @dev Settling fees before pricing plus basket contributions prevents pending-reward dilution.
    function deposit(
        uint256 lp,
        uint256 minShares,
        uint256[3] calldata maxExtra
    )
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (lp == 0) revert InvalidAmount();
        _collect(automationFactory.defaultKeeper());
        uint256 supply = totalSupply();
        uint256 assets = totalAssets();
        uint256 net = lp - Math.mulDiv(lp, entryBps, BPS);
        if (supply == 0) {
            if (net <= MINIMUM_SHARES) revert InvalidAmount();
            shares = net - MINIMUM_SHARES;
            _mint(DEAD, assets + MINIMUM_SHARES);
        } else {
            if (assets == 0) revert InvalidAmount();
            shares = Math.mulDiv(net, supply, assets);
            for (uint256 i; i < 3; ++i) {
                address token = rewardTokens[i];
                if (token == address(0)) continue;
                uint256 basket = _freeBalance(token);
                if (token == rewardToken) {
                    uint256 pending = pendingDeferredRewards();
                    (uint256 d, uint256 s, uint256 k) = splitReward(pending);
                    basket += pending - d - s - k;
                }
                uint256 needed = Math.mulDiv(basket, net, assets, Math.Rounding.Ceil);
                uint256 gross = Math.mulDiv(needed, BPS, BPS - entryBps, Math.Rounding.Ceil);
                if (gross > maxExtra[i]) revert Slippage();
                _pull(token, gross);
                _entryExit(token, gross, true);
            }
        }
        if (shares == 0 || shares < minShares) revert Slippage();
        _pull(asset, lp);
        _entryExit(asset, lp, true);
        _mint(msg.sender, shares);
        _sync();
        _stake();
        emit Deposited(msg.sender, lp, shares);
    }

    /// @notice Returns LP and each uninvested reward token without performing a swap.
    function redeem(
        uint256 shares,
        uint256 minLp,
        uint256[3] calldata minRewards
    )
        external
        nonReentrant
        returns (uint256 lp)
    {
        if (shares == 0 || shares > balanceOf(msg.sender)) revert InvalidAmount();
        uint256 supply = totalSupply();
        uint256 gross = Math.mulDiv(totalAssets(), shares, supply);
        uint256 idle = IERC20(asset).balanceOf(address(this));
        if (gross > idle) IAeroGauge(gauge).withdraw(gross - idle);
        _collect(automationFactory.defaultKeeper());
        uint256 credit = Math.mulDiv(pendingDeferredRewards(), shares, supply);
        if (credit != 0) {
            deferredCredits[msg.sender] += credit;
            totalDeferredCredits += credit;
            emit DeferredCredit(msg.sender, credit);
        }
        _burn(msg.sender, shares);
        lp = gross - _entryExit(asset, gross, false);
        if (lp < minLp) revert Slippage();
        IERC20(asset).safeTransfer(msg.sender, lp);
        for (uint256 i; i < 3; ++i) {
            address token = rewardTokens[i];
            if (token == address(0)) continue;
            uint256 amount = Math.mulDiv(_freeBalance(token), shares, supply);
            amount -= _entryExit(token, amount, false);
            if (amount < minRewards[i]) revert Slippage();
            if (amount != 0) IERC20(token).safeTransfer(msg.sender, amount);
        }
        _sync();
        emit Redeemed(msg.sender, lp, shares);
    }

    function harvest(
        Swap[] calldata swaps,
        uint256 minLiquidity,
        uint256 deadline
    )
        external
        nonReentrant
        returns (uint256 liquidity)
    {
        if (!isKeeper(msg.sender)) revert UnauthorizedKeeper();
        if (deadline < block.timestamp || deadline > block.timestamp + 5 minutes) revert InvalidAmount();
        _collect(msg.sender);
        for (uint256 i; i < swaps.length; ++i) {
            _swap(swaps[i]);
        }
        uint256 amount0 = _freeBalance(token0);
        uint256 amount1 = _freeBalance(token1);
        (uint256 r0, uint256 r1,) = IAeroPool(asset).getReserves();
        if (r0 == 0 || r1 == 0 || minLiquidity == 0) revert InvalidAmount();
        uint256 optimal1 = Math.mulDiv(amount0, r1, r0);
        if (optimal1 <= amount1) amount1 = optimal1;
        else amount0 = Math.mulDiv(amount1, r0, r1);
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();
        uint256 quoted = Math.min(
            Math.mulDiv(amount0, IERC20(asset).totalSupply(), r0), Math.mulDiv(amount1, IERC20(asset).totalSupply(), r1)
        );
        uint256 beforeLp = IERC20(asset).balanceOf(address(this));
        IERC20(token0).safeTransfer(asset, amount0);
        IERC20(token1).safeTransfer(asset, amount1);
        IAeroPool(asset).mint(address(this));
        liquidity = IERC20(asset).balanceOf(address(this)) - beforeLp;
        if (liquidity < minLiquidity || liquidity < Math.mulDiv(quoted, 9900, BPS)) revert Slippage();
        _sync();
        _stake();
        emit Harvested(msg.sender, liquidity);
    }

    function _swap(Swap calldata s) private {
        if (!automationFactory.isPool(s.pool) || s.amountIn == 0 || s.minOut == 0) revert InvalidSwap();
        _requireReward(s.tokenIn);
        if (s.amountIn > _freeBalance(s.tokenIn)) revert InvalidSwap();
        address a = IAeroPool(s.pool).token0();
        address b = IAeroPool(s.pool).token1();
        if (s.tokenIn != a && s.tokenIn != b) revert InvalidSwap();
        address out = s.tokenIn == a ? b : a;
        _requireReward(out);
        uint256 quoted = IAeroPool(s.pool).getAmountOutWithTotalFee(s.amountIn, s.tokenIn);
        if (quoted == 0) revert InvalidSwap();
        if (quoted < s.minOut) revert Slippage();
        uint256 output = quoted;
        uint256 beforeOut = IERC20(out).balanceOf(address(this));
        IERC20(s.tokenIn).safeTransfer(s.pool, s.amountIn);
        IAeroPool(s.pool).swap(s.tokenIn == b ? output : 0, s.tokenIn == a ? output : 0, address(this), "");
        if (IERC20(out).balanceOf(address(this)) - beforeOut < output) revert Slippage();
    }

    function _requireReward(address token) private view {
        if (token != token0 && token != token1 && token != rewardToken) revert UnsupportedToken();
    }

    function _collect(address keeper) private {
        if (gauge != address(0)) IAeroGauge(gauge).claimEmissions(address(this), address(this));
        IAeroPool(asset).claimFees(address(this));
        for (uint256 i; i < 3; ++i) {
            address token = rewardTokens[i];
            if (token == address(0)) continue;
            uint256 actual = IERC20(token).balanceOf(address(this));
            uint256 fresh = actual - accounted[i];
            if (token == rewardToken) {
                uint256 funding = Math.min(fresh, totalDeferredCredits - deferredReserved);
                deferredReserved += funding;
                fresh -= funding;
            }
            (uint256 daoFee, uint256 strategyFee, uint256 callFee) = splitReward(fresh);
            _pay(token, automationFactory.treasury(), daoFee);
            _pay(token, strategist, strategyFee);
            _pay(token, keeper, callFee);
            if (fresh != 0) emit RewardFees(token, keeper, daoFee, strategyFee, callFee);
        }
        _sync();
    }

    function splitReward(uint256 gross) public view returns (uint256 daoFee, uint256 strategyFee, uint256 callFee) {
        daoFee = Math.mulDiv(gross, automationFactory.daoRewardBps(), BPS);
        uint256 remaining = gross - daoFee;
        strategyFee = Math.mulDiv(remaining, strategistBps, BPS);
        callFee = Math.mulDiv(remaining, keeperBps, BPS);
    }

    /// @notice Token-denominated estimate, including projected gauge emissions; not a USD/gas-profit quote.
    function estimateKeeperReward() external view returns (address[3] memory tokens, uint256[3] memory amounts) {
        tokens = rewardTokens;
        (uint256 pending0, uint256 pending1) = IAeroPool(asset).pendingFees(address(this));
        uint256 pendingGauge = gauge == address(0) ? 0 : IAeroGauge(gauge).earned(address(this));
        for (uint256 i; i < 3; ++i) {
            address token = tokens[i];
            if (token == address(0)) continue;
            uint256 fresh = IERC20(token).balanceOf(address(this)) - accounted[i];
            if (token == token0) fresh += pending0;
            if (token == token1) fresh += pending1;
            if (token == rewardToken) {
                fresh += pendingGauge;
                address handler = automationFactory.deferredHandler();
                if (handler != address(0)) fresh += IAeroDeferredHandler(handler).pendingRedeems(address(this));
                fresh -= Math.min(fresh, totalDeferredCredits - deferredReserved);
            }
            (,, amounts[i]) = splitReward(fresh);
        }
    }

    function basketBalances() external view returns (uint256[3] memory amounts) {
        for (uint256 i; i < 3; ++i) {
            if (rewardTokens[i] != address(0)) amounts[i] = _freeBalance(rewardTokens[i]);
        }
    }

    /// @notice Base can defer emissions below Aero's redemption threshold. Exiting shares retain a claim.
    function pendingDeferredRewards() public view returns (uint256) {
        address handler = automationFactory.deferredHandler();
        if (handler == address(0)) return 0;
        uint256 pending = IAeroDeferredHandler(handler).pendingRedeems(address(this));
        uint256 owed = totalDeferredCredits - deferredReserved;
        return pending > owed ? pending - owed : 0;
    }

    function claimDeferredRewards() external nonReentrant {
        _collect(automationFactory.defaultKeeper());
        uint256 gross = deferredCredits[msg.sender];
        if (gross == 0 || gross > deferredReserved) revert InvalidAmount();
        delete deferredCredits[msg.sender];
        totalDeferredCredits -= gross;
        deferredReserved -= gross;
        (uint256 d, uint256 s, uint256 k) = splitReward(gross);
        _pay(rewardToken, automationFactory.treasury(), d);
        _pay(rewardToken, strategist, s);
        _pay(rewardToken, automationFactory.defaultKeeper(), k);
        uint256 net = gross - d - s - k;
        net -= _entryExit(rewardToken, net, false);
        _pay(rewardToken, msg.sender, net);
        _sync();
        emit RewardFees(rewardToken, automationFactory.defaultKeeper(), d, s, k);
        emit DeferredClaimed(msg.sender, gross);
    }

    function _freeBalance(address token) private view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        return token == rewardToken ? balance - deferredReserved : balance;
    }

    function _entryExit(address token, uint256 gross, bool entry) private returns (uint256 fee) {
        fee = Math.mulDiv(gross, entry ? entryBps : exitBps, BPS);
        uint256 daoFee = Math.mulDiv(fee, automationFactory.daoEntryExitShareBps(), BPS);
        _pay(token, automationFactory.treasury(), daoFee);
        _pay(token, strategist, fee - daoFee);
        if (fee != 0) emit EntryExitFees(token, entry, daoFee, fee - daoFee);
    }

    function _pull(address token, uint256 amount) private {
        if (amount == 0) return;
        uint256 beforeBal = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - beforeBal != amount) revert UnsupportedToken();
    }

    function _pay(address token, address recipient, uint256 amount) private {
        if (amount != 0) IERC20(token).safeTransfer(recipient, amount);
    }

    function _sync() private {
        for (uint256 i; i < 3; ++i) {
            if (rewardTokens[i] != address(0)) accounted[i] = IERC20(rewardTokens[i]).balanceOf(address(this));
        }
    }

    function _stake() private {
        uint256 idle = IERC20(asset).balanceOf(address(this));
        if (stakingEnabled && idle != 0) {
            IERC20(asset).forceApprove(gauge, idle);
            IAeroGauge(gauge).deposit(idle);
            IERC20(asset).forceApprove(gauge, 0);
        }
    }
}
