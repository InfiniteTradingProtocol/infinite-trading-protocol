// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { Ownable2StepUpgradeable } from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { IAeroV2Pool, IAeroV2Gauge, IAeroV2Factory, IAeroV2Oracle } from "./IAeroV2.sol";

/// @notice Classic Aero pool auto-compounder. Shares are a claim on LP only (idle + staked).
/// @dev Non-upgradeable EIP-1167 clone of a fixed implementation. Token income (pool fees, gauge emissions,
/// donations) is compounded into LP only by harvest (keepers, or anyone if the owner opens it); the LP it mints
/// unlocks into the share price linearly over profitUnlockTime, so depositing just around a harvest earns
/// nothing extra. Every swap is checked against the pool TWAP from AeroTwapOracle; with no usable TWAP the step
/// is skipped, never priced from spot. Deposits and redeems never trade and never depend on the oracle or gauge.
contract AeroVaultV2 is ERC20Upgradeable, Ownable2StepUpgradeable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_SHARES = 1000;
    address public constant DEAD = address(0xdead);
    uint16 public constant MAX_STRATEGIST_BPS = 1000;
    uint16 public constant MAX_KEEPER_BPS = 200;
    uint16 public constant MAX_EXIT_BPS = 100;
    uint16 public constant MAX_DEVIATION_BPS = 1000;
    uint16 public constant MAX_SLIPPAGE_BPS = 500;
    uint16 public constant MAX_SWAP_BPS = 500;
    uint16 public constant MIN_RISK_BPS = 10;
    uint256 public constant MAX_ROUTE = 4;

    // Reasons emitted when a compounding step is skipped.
    uint8 internal constant OK = 0;
    uint8 internal constant NO_TWAP = 1;
    uint8 internal constant DEVIATION = 2;
    uint8 internal constant SIZE = 3;
    uint8 internal constant SLIPPAGE = 4;
    uint8 internal constant ZERO_OUT = 5;
    uint8 internal constant NOT_APPROVED = 6;

    IAeroV2Factory public immutable factory;

    address public asset;
    address public token0;
    address public token1;
    address public rewardToken;
    bool public stablePool;
    bool public stakingEnabled;
    bool public openHarvest;
    address public gauge;
    uint256 public stakedLp;

    address public strategist;
    uint16 public strategistBps;
    uint16 public keeperBps;
    uint16 public exitBps;
    uint16 public maxDeviationBps;
    uint16 public maxSlippageBps;
    uint16 public maxSwapBps;
    /// @dev LP minted by the last harvest unlocks linearly over profitUnlockTime (anti just-in-time capture).
    uint32 public profitUnlockTime;
    /// @dev Owner changes take effect at the next harvest, so the current unlock schedule cannot be shortened.
    uint32 public nextProfitUnlockTime;
    uint64 public lastHarvest;
    uint256 public lockedProfit;

    mapping(address => bool) public extraKeepers;
    address[] private _rewardRoute;
    /// @dev Free (non-fee) balance per token after the last settlement; income is anything above it.
    mapping(address token => uint256) public accounted;
    mapping(address token => uint256) public reservedFees;
    mapping(address token => uint256) public daoOwed;
    mapping(address account => mapping(address token => uint256)) public feesOwed;

    event Deposited(address indexed caller, address indexed receiver, uint256 lp, uint256 shares);
    event Redeemed(address indexed owner, address indexed receiver, uint256 shares, uint256 lp);
    event Harvested(address indexed caller, uint256 liquidity);
    event FeesCharged(address indexed token, uint256 income, uint256 dao, uint256 strategist, uint256 keeper);
    event FeesClaimed(address indexed account, address indexed token, uint256 amount);
    event StepSkipped(address indexed pool, uint8 reason);
    event GaugeCallFailed(bytes4 selector, bytes reason);
    event FeesUpdated(address strategist, uint16 strategistBps, uint16 keeperBps, uint16 exitBps);
    event RiskUpdated(uint16 maxDeviationBps, uint16 maxSlippageBps, uint16 maxSwapBps);
    event ProfitUnlockTimeUpdated(uint32 seconds_);
    event KeeperUpdated(address indexed keeper, bool enabled);
    event OpenHarvestUpdated(bool open);
    event RewardRouteUpdated(address[] pools);
    event GaugeUpdated(address indexed gauge);
    event StakingUpdated(bool enabled);

    error OnlyFactory();
    error OnlyDao();
    error Unauthorized();
    error InvalidConfig();
    error InvalidAmount();
    error InvalidRoute();
    error Slippage();

    constructor(address factory_) {
        factory = IAeroV2Factory(factory_);
        _disableInitializers();
    }

    function initialize(
        address pool,
        address owner_,
        address strategist_,
        uint16 strategistBps_,
        string calldata name_,
        string calldata symbol_
    )
        external
        initializer
    {
        if (msg.sender != address(factory)) revert OnlyFactory();
        __ERC20_init(name_, symbol_);
        __Ownable_init(owner_);
        asset = pool;
        token0 = IAeroV2Pool(pool).token0();
        token1 = IAeroV2Pool(pool).token1();
        rewardToken = factory.rewardToken();
        stablePool = factory.isStablePool(pool);
        if (token0 == token1 || token0 == address(0) || token1 == address(0) || rewardToken == pool) {
            revert InvalidConfig();
        }
        _setFees(strategist_ == address(0) ? owner_ : strategist_, strategistBps_, 50, 0);
        _setRisk(300, 200, 50);
        profitUnlockTime = 24 hours;
        nextProfitUnlockTime = 24 hours;
    }

    modifier onlyDao() {
        if (msg.sender != factory.dao()) revert OnlyDao();
        _;
    }

    // ── Views
    // ────────────────────────────────────────────────────────────────

    /// @notice LP backing shares: idle + staked, minus harvest profit that is still unlocking.
    function totalAssets() public view returns (uint256) {
        return IERC20(asset).balanceOf(address(this)) + stakedLp - lockedProfitNow();
    }

    function lockedProfitNow() public view returns (uint256) {
        uint256 end = uint256(lastHarvest) + profitUnlockTime;
        if (block.timestamp >= end) return 0;
        return Math.mulDiv(lockedProfit, end - block.timestamp, profitUnlockTime);
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? 0 : Math.mulDiv(shares, totalAssets(), supply);
    }

    function isKeeper(address account) public view returns (bool) {
        return factory.isKeeper(account) || extraKeepers[account];
    }

    function rewardRoute() external view returns (address[] memory) {
        return _rewardRoute;
    }

    function freeBalance(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this)) - reservedFees[token];
    }

    /// @notice Income not yet charged/compounded, per token (token0, token1, rewardToken or 0).
    function pendingIncome() external view returns (address[3] memory tokens, uint256[3] memory amounts) {
        tokens = _tokens();
        (uint256 fee0, uint256 fee1) = IAeroV2Pool(asset).pendingFees(address(this));
        for (uint256 i; i < 3; ++i) {
            if (tokens[i] == address(0)) continue;
            uint256 free = freeBalance(tokens[i]);
            amounts[i] = free > accounted[tokens[i]] ? free - accounted[tokens[i]] : 0;
            if (tokens[i] == token0) amounts[i] += fee0;
            if (tokens[i] == token1) amounts[i] += fee1;
        }
    }

    // ── User actions
    // ─────────────────────────────────────────────────────────

    function deposit(uint256 lp, uint256 minShares, address receiver) external nonReentrant returns (uint256 shares) {
        if (lp == 0 || receiver == address(0)) revert InvalidAmount();
        uint256 assets = totalAssets();
        uint256 supply = totalSupply();
        uint256 before = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), lp);
        if (IERC20(asset).balanceOf(address(this)) - before != lp) revert InvalidAmount();
        shares = _mintShares(lp, assets, supply, receiver, minShares);
        _stake();
    }

    /// @notice Deposit both pool tokens at the pool's current ratio; only the matched amounts are pulled.
    function depositTokens(
        uint256 amount0,
        uint256 amount1,
        uint256 minShares,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 shares, uint256 used0, uint256 used1)
    {
        if (receiver == address(0)) revert InvalidAmount();
        uint256 assets = totalAssets();
        uint256 supply = totalSupply();
        (uint256 r0, uint256 r1,) = IAeroV2Pool(asset).getReserves();
        if (r0 == 0 || r1 == 0) revert InvalidAmount();
        used0 = amount0;
        used1 = Math.mulDiv(amount0, r1, r0);
        if (used1 > amount1) {
            used1 = amount1;
            used0 = Math.mulDiv(amount1, r0, r1);
        }
        if (used0 == 0 || used1 == 0) revert InvalidAmount();
        IERC20(token0).safeTransferFrom(msg.sender, asset, used0);
        IERC20(token1).safeTransferFrom(msg.sender, asset, used1);
        uint256 lp = IAeroV2Pool(asset).mint(address(this));
        shares = _mintShares(lp, assets, supply, receiver, minShares);
        _stake();
    }

    function redeem(uint256 shares, uint256 minLp, address receiver) external nonReentrant returns (uint256 lp) {
        lp = _redeemLp(shares, receiver);
        if (lp < minLp) revert Slippage();
        IERC20(asset).safeTransfer(receiver, lp);
    }

    /// @notice Redeem straight into both pool tokens (burns the LP in the pool).
    function redeemTokens(
        uint256 shares,
        uint256 min0,
        uint256 min1,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        uint256 lp = _redeemLp(shares, receiver);
        IERC20(asset).safeTransfer(asset, lp);
        (amount0, amount1) = IAeroV2Pool(asset).burn(receiver);
        if (amount0 < min0 || amount1 < min1) revert Slippage();
    }

    /// @notice Pays accrued strategist/keeper fees to `account` (anyone may trigger; funds go to the account).
    function claimFees(address account, address token) external nonReentrant returns (uint256 amount) {
        amount = feesOwed[account][token];
        if (amount == 0) return 0;
        feesOwed[account][token] = 0;
        reservedFees[token] -= amount;
        IERC20(token).safeTransfer(account, amount);
        emit FeesClaimed(account, token, amount);
    }

    /// @notice Pays the accrued DAO fee for `token` to the factory treasury (anyone may trigger).
    function payDao(address token) external nonReentrant returns (uint256 amount) {
        amount = daoOwed[token];
        if (amount == 0) return 0;
        daoOwed[token] = 0;
        reservedFees[token] -= amount;
        address treasury = factory.treasury();
        IERC20(token).safeTransfer(treasury, amount);
        emit FeesClaimed(treasury, token, amount);
    }

    // ── Compounding
    // ──────────────────────────────────────────────────────────

    /// @notice Compound income into LP. Keepers only, unless the owner opened harvesting to everyone.
    function harvest(uint256 minLiquidity) external nonReentrant returns (uint256 liquidity) {
        if (!openHarvest && !isKeeper(msg.sender)) revert Unauthorized();
        liquidity = _settle(msg.sender);
        if (liquidity < minLiquidity) revert Slippage();
        uint256 stillLocked = lockedProfitNow();
        profitUnlockTime = nextProfitUnlockTime;
        lockedProfit = stillLocked + liquidity;
        lastHarvest = uint64(block.timestamp);
    }

    // ── Owner
    // ────────────────────────────────────────────────────────────────

    function setFees(
        address strategist_,
        uint16 strategistBps_,
        uint16 keeperBps_,
        uint16 exitBps_
    )
        external
        onlyOwner
    {
        _setFees(strategist_, strategistBps_, keeperBps_, exitBps_);
    }

    function setRisk(uint16 deviationBps, uint16 slippageBps, uint16 swapBps) external onlyOwner {
        _setRisk(deviationBps, slippageBps, swapBps);
    }

    /// @notice How long harvested LP takes to count fully in the share price (1h to 2 days); keep it at least
    /// the harvest interval. Applies from the next harvest.
    function setProfitUnlockTime(uint32 seconds_) external onlyOwner {
        if (seconds_ < 1 hours || seconds_ > 2 days) revert InvalidConfig();
        nextProfitUnlockTime = seconds_;
        emit ProfitUnlockTimeUpdated(seconds_);
    }

    function setKeeper(address keeper, bool enabled) external onlyOwner {
        if (keeper == address(0)) revert InvalidConfig();
        extraKeepers[keeper] = enabled;
        emit KeeperUpdated(keeper, enabled);
    }

    function setOpenHarvest(bool open) external onlyOwner {
        openHarvest = open;
        emit OpenHarvestUpdated(open);
    }

    /// @notice Route that turns the gauge reward token into token0 or token1, through DAO-approved pools.
    /// An empty route disables reward swaps (rewards then wait in the vault, still owned by shareholders).
    function setRewardRoute(address[] calldata pools) external onlyOwner {
        if (pools.length > MAX_ROUTE) revert InvalidRoute();
        if (pools.length != 0 && (rewardToken == token0 || rewardToken == token1)) revert InvalidRoute();
        if (pools.length == 0 && stakingEnabled && _tokens()[2] != address(0)) revert InvalidRoute();
        address tokenIn = rewardToken;
        for (uint256 i; i < pools.length; ++i) {
            address pool = pools[i];
            if (pool != asset && !factory.approvedPool(pool)) revert InvalidRoute();
            for (uint256 j; j < i; ++j) {
                if (pools[j] == pool) revert InvalidRoute();
            }
            address a = IAeroV2Pool(pool).token0();
            address b = IAeroV2Pool(pool).token1();
            if (tokenIn != a && tokenIn != b) revert InvalidRoute();
            tokenIn = tokenIn == a ? b : a;
        }
        if (pools.length != 0 && tokenIn != token0 && tokenIn != token1) revert InvalidRoute();
        _rewardRoute = pools;
        emit RewardRouteUpdated(pools);
    }

    // ── DAO: gauge
    // ───────────────────────────────────────────────────────────

    /// @notice Only the DAO attaches a gauge, and only one the Aero gauge factory and voter recognise for
    /// this pool. Can be changed while nothing is staked (e.g. if Aero replaces the gauge).
    function setGauge(address gauge_) external onlyDao {
        if (stakingEnabled || stakedLp != 0) revert InvalidConfig();
        if (gauge_ != address(0) && !factory.isGauge(asset, gauge_)) revert InvalidConfig();
        gauge = gauge_;
        emit GaugeUpdated(gauge_);
    }

    /// @notice Enabling staking is DAO-only. Disabling (emergency unstake) is allowed for the DAO or the owner
    /// and always returns all LP to the vault.
    function setStaking(bool enabled) external nonReentrant {
        if (enabled) {
            if (msg.sender != factory.dao()) revert OnlyDao();
            // Emissions must have a compounding route, or they would pile up for whoever is in at route time.
            if (gauge == address(0) || (_tokens()[2] != address(0) && _rewardRoute.length == 0)) {
                revert InvalidConfig();
            }
            stakingEnabled = true;
            _stake();
        } else {
            if (msg.sender != factory.dao() && msg.sender != owner()) revert Unauthorized();
            if (stakingEnabled) {
                try IAeroV2Gauge(gauge).claimEmissions(address(this), address(this)) { }
                catch (bytes memory r) {
                    emit GaugeCallFailed(IAeroV2Gauge.claimEmissions.selector, r);
                }
            }
            stakingEnabled = false;
            uint256 staked = stakedLp;
            if (staked != 0) {
                stakedLp = 0;
                IAeroV2Gauge(gauge).withdraw(staked);
            }
        }
        emit StakingUpdated(enabled);
    }

    // ── Internals: shares
    // ────────────────────────────────────────────────────

    function _mintShares(
        uint256 lp,
        uint256 assets,
        uint256 supply,
        address receiver,
        uint256 minShares
    )
        private
        returns (uint256 shares)
    {
        if (supply == 0) {
            if (lp <= MINIMUM_SHARES) revert InvalidAmount();
            shares = lp - MINIMUM_SHARES;
            _mint(DEAD, assets + MINIMUM_SHARES);
        } else {
            if (assets == 0) revert InvalidAmount();
            shares = Math.mulDiv(lp, supply, assets);
        }
        if (shares == 0 || shares < minShares) revert Slippage();
        _mint(receiver, shares);
        emit Deposited(msg.sender, receiver, lp, shares);
    }

    function _redeemLp(uint256 shares, address receiver) private returns (uint256 lp) {
        if (shares == 0 || shares > balanceOf(msg.sender) || receiver == address(0)) revert InvalidAmount();
        uint256 gross = Math.mulDiv(totalAssets(), shares, totalSupply());
        _burn(msg.sender, shares);
        lp = gross - Math.mulDiv(gross, exitBps, BPS);
        uint256 idle = IERC20(asset).balanceOf(address(this));
        if (lp > idle) {
            uint256 need = lp - idle;
            stakedLp -= need;
            IAeroV2Gauge(gauge).withdraw(need);
        }
        emit Redeemed(msg.sender, receiver, shares, lp);
    }

    // ── Internals: settle
    // ────────────────────────────────────────────────────

    function _settle(address keeper) private returns (uint256 liquidity) {
        // Snapshots age into usable TWAP windows; a fresh one is never used for pricing (MIN_WINDOW).
        _oracleUpdate(asset);
        for (uint256 i; i < _rewardRoute.length; ++i) {
            _oracleUpdate(_rewardRoute[i]);
        }
        if (stakingEnabled) {
            try IAeroV2Gauge(gauge).claimEmissions(address(this), address(this)) { }
            catch (bytes memory r) {
                emit GaugeCallFailed(IAeroV2Gauge.claimEmissions.selector, r);
            }
        }
        IAeroV2Pool(asset).claimFees(address(this));
        _chargeFees(keeper);
        if (_rewardRoute.length != 0) _swapReward();
        liquidity = _addLiquidity();
        _stake();
        address[3] memory tokens = _tokens();
        for (uint256 i; i < 3; ++i) {
            if (tokens[i] != address(0)) accounted[tokens[i]] = freeBalance(tokens[i]);
        }
        emit Harvested(keeper, liquidity);
    }

    function _chargeFees(address keeper) private {
        address[3] memory tokens = _tokens();
        uint256 daoBps = factory.daoFeeBps();
        for (uint256 i; i < 3; ++i) {
            address token = tokens[i];
            if (token == address(0)) continue;
            uint256 free = freeBalance(token);
            uint256 prior = accounted[token];
            if (free <= prior) continue;
            uint256 income = free - prior;
            uint256 d = Math.mulDiv(income, daoBps, BPS);
            uint256 s = Math.mulDiv(income, strategistBps, BPS);
            uint256 k = Math.mulDiv(income, keeperBps, BPS);
            daoOwed[token] += d;
            feesOwed[strategist][token] += s;
            feesOwed[keeper][token] += k;
            reservedFees[token] += d + s + k;
            emit FeesCharged(token, income, d, s, k);
        }
    }

    function _swapReward() private {
        address[] memory route = _rewardRoute;
        uint256 amountIn = freeBalance(rewardToken);
        if (amountIn == 0) return;
        uint256[] memory outs;
        uint8 reason;
        uint256 hop;
        // Clamp the input so every hop stays within maxSwapBps of its pool's reserves. Output is concave, so a
        // pure ratio rescale can overshoot an intermediate hop's cap: rescale with a 2% margin and re-plan.
        for (uint256 attempt; attempt < 4; ++attempt) {
            uint256 hopIn;
            uint256 hopCap;
            (outs, reason, hop, hopIn, hopCap) = _planRoute(route, amountIn);
            if (reason != SIZE || attempt == 3) break;
            amountIn = Math.mulDiv(amountIn, hopCap * 98, hopIn * 100);
            if (amountIn == 0) break;
        }
        if (reason != OK || amountIn == 0) {
            emit StepSkipped(route[hop], reason);
            return;
        }
        address tokenIn = rewardToken;
        for (uint256 i; i < route.length; ++i) {
            tokenIn = _executeSwap(route[i], tokenIn, amountIn, outs[i]);
            amountIn = outs[i];
        }
    }

    function _planRoute(
        address[] memory route,
        uint256 amountIn
    )
        private
        view
        returns (uint256[] memory outs, uint8 reason, uint256 hop, uint256 hopIn, uint256 hopCap)
    {
        outs = new uint256[](route.length);
        address tokenIn = rewardToken;
        for (hop = 0; hop < route.length; ++hop) {
            hopIn = amountIn;
            // Re-check the DAO allowlist at swap time: revoking a pool stops every route through it.
            if (route[hop] != asset && !factory.approvedPool(route[hop])) {
                return (outs, NOT_APPROVED, hop, hopIn, 0);
            }
            address tokenOut;
            (outs[hop], tokenOut, reason, hopCap) = _quoteHop(route[hop], tokenIn, amountIn);
            if (reason != OK) return (outs, reason, hop, hopIn, hopCap);
            tokenIn = tokenOut;
            amountIn = outs[hop];
        }
        hop = 0;
    }

    /// @dev TWAP-guarded quote. Never prices from spot alone: no TWAP means no trade.
    function _quoteHop(
        address pool,
        address tokenIn,
        uint256 amountIn
    )
        private
        view
        returns (uint256 out, address tokenOut, uint8 reason, uint256 cap)
    {
        bool zeroIn = tokenIn == IAeroV2Pool(pool).token0();
        tokenOut = zeroIn ? IAeroV2Pool(pool).token1() : IAeroV2Pool(pool).token0();
        (bool ok, uint256 t0, uint256 t1) = factory.oracle().averageReserves(pool);
        if (!ok) return (0, tokenOut, NO_TWAP, 0);
        (uint256 r0, uint256 r1,) = IAeroV2Pool(pool).getReserves();
        if (!_withinDeviation(r0, r1, t0, t1)) return (0, tokenOut, DEVIATION, 0);
        cap = Math.mulDiv(zeroIn ? r0 : r1, maxSwapBps, BPS);
        if (amountIn > cap) return (0, tokenOut, SIZE, cap);
        out = IAeroV2Pool(pool).getAmountOut(amountIn, tokenIn);
        if (out == 0) return (0, tokenOut, ZERO_OUT, cap);
        if (!factory.isStablePool(pool)) {
            uint256 fair = zeroIn ? Math.mulDiv(amountIn, t1, t0) : Math.mulDiv(amountIn, t0, t1);
            if (out < Math.mulDiv(fair, BPS - maxSlippageBps, BPS)) return (0, tokenOut, SLIPPAGE, cap);
        }
    }

    function _executeSwap(
        address pool,
        address tokenIn,
        uint256 amountIn,
        uint256 out
    )
        private
        returns (address tokenOut)
    {
        bool zeroIn = tokenIn == IAeroV2Pool(pool).token0();
        tokenOut = zeroIn ? IAeroV2Pool(pool).token1() : IAeroV2Pool(pool).token0();
        uint256 before = IERC20(tokenOut).balanceOf(address(this));
        IERC20(tokenIn).safeTransfer(pool, amountIn);
        IAeroV2Pool(pool).swap(zeroIn ? 0 : out, zeroIn ? out : 0, address(this), "");
        if (IERC20(tokenOut).balanceOf(address(this)) - before < out) revert Slippage();
    }

    function _addLiquidity() private returns (uint256 liquidity) {
        address pool = asset;
        uint256 a0 = freeBalance(token0);
        uint256 a1 = freeBalance(token1);
        if (a0 == 0 && a1 == 0) return 0;
        (bool ok, uint256 t0, uint256 t1) = factory.oracle().averageReserves(pool);
        (uint256 r0, uint256 r1,) = IAeroV2Pool(pool).getReserves();
        if (!ok || !_withinDeviation(r0, r1, t0, t1)) {
            emit StepSkipped(pool, ok ? DEVIATION : NO_TWAP);
            return 0;
        }
        // Swap the unmatched side so both tokens can be added at the pool ratio.
        if (a0 * r1 > a1 * r0) {
            uint256 swapIn = _zapAmount(a0 - Math.mulDiv(a1, r0, r1), r0);
            if (swapIn != 0) _balanceSwap(pool, token0, swapIn);
        } else if (a1 * r0 > a0 * r1) {
            uint256 swapIn = _zapAmount(a1 - Math.mulDiv(a0, r1, r0), r1);
            if (swapIn != 0) _balanceSwap(pool, token1, swapIn);
        }
        a0 = freeBalance(token0);
        a1 = freeBalance(token1);
        (r0, r1,) = IAeroV2Pool(pool).getReserves();
        uint256 amount0 = a0;
        uint256 amount1 = Math.mulDiv(a0, r1, r0);
        if (amount1 > a1) {
            amount1 = a1;
            amount0 = Math.mulDiv(a1, r0, r1);
        }
        if (amount0 == 0 || amount1 == 0) return 0;
        IERC20(token0).safeTransfer(pool, amount0);
        IERC20(token1).safeTransfer(pool, amount1);
        liquidity = IAeroV2Pool(pool).mint(address(this));
    }

    function _balanceSwap(address pool, address tokenIn, uint256 amountIn) private {
        (uint256 out,, uint8 reason,) = _quoteHop(pool, tokenIn, amountIn);
        if (reason != OK) {
            emit StepSkipped(pool, reason);
            return;
        }
        _executeSwap(pool, tokenIn, amountIn, out);
    }

    /// @dev Volatile pools: optimal single-sided swap ignoring the fee, sqrt(r*(r+x)) - r. Stable: half.
    /// Capped at maxSwapBps of the input reserve; any remainder is compounded on later harvests.
    function _zapAmount(uint256 excess, uint256 reserveIn) private view returns (uint256 amount) {
        amount = stablePool ? excess / 2 : Math.sqrt(reserveIn * (reserveIn + excess)) - reserveIn;
        uint256 cap = Math.mulDiv(reserveIn, maxSwapBps, BPS);
        if (amount > cap) amount = cap;
    }

    function _withinDeviation(uint256 r0, uint256 r1, uint256 t0, uint256 t1) private view returns (bool) {
        if (r0 == 0 || r1 == 0) return false;
        uint256 spot = r1 * t0;
        uint256 twap = t1 * r0;
        uint256 diff = spot > twap ? spot - twap : twap - spot;
        return diff * BPS <= twap * maxDeviationBps;
    }

    function _oracleUpdate(address pool) private {
        try factory.oracle().update(pool) { } catch { }
    }

    function _stake() private {
        if (!stakingEnabled) return;
        uint256 idle = IERC20(asset).balanceOf(address(this));
        if (idle == 0) return;
        address g = gauge;
        IERC20(asset).forceApprove(g, idle);
        try IAeroV2Gauge(g).deposit(idle) {
            stakedLp += idle;
        } catch (bytes memory r) {
            emit GaugeCallFailed(IAeroV2Gauge.deposit.selector, r);
        }
        IERC20(asset).forceApprove(g, 0);
    }

    function _tokens() private view returns (address[3] memory tokens) {
        tokens[0] = token0;
        tokens[1] = token1;
        if (rewardToken != token0 && rewardToken != token1) tokens[2] = rewardToken;
    }

    // ── Internals: config
    // ────────────────────────────────────────────────────

    function _setFees(address strategist_, uint16 strategistBps_, uint16 keeperBps_, uint16 exitBps_) private {
        if (
            strategist_ == address(0) || strategist_ == address(this) || strategistBps_ > MAX_STRATEGIST_BPS
                || keeperBps_ > MAX_KEEPER_BPS || exitBps_ > MAX_EXIT_BPS
        ) revert InvalidConfig();
        strategist = strategist_;
        strategistBps = strategistBps_;
        keeperBps = keeperBps_;
        exitBps = exitBps_;
        emit FeesUpdated(strategist_, strategistBps_, keeperBps_, exitBps_);
    }

    function _setRisk(uint16 deviationBps, uint16 slippageBps, uint16 swapBps) private {
        if (
            deviationBps < MIN_RISK_BPS || deviationBps > MAX_DEVIATION_BPS || slippageBps < MIN_RISK_BPS
                || slippageBps > MAX_SLIPPAGE_BPS || swapBps < MIN_RISK_BPS || swapBps > MAX_SWAP_BPS
        ) revert InvalidConfig();
        maxDeviationBps = deviationBps;
        maxSlippageBps = slippageBps;
        maxSwapBps = swapBps;
        emit RiskUpdated(deviationBps, slippageBps, swapBps);
    }
}
