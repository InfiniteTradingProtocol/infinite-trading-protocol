// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAeroZapPool {
    function getReserves() external view returns (uint256, uint256, uint256);
    function totalSupply() external view returns (uint256);
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    function pendingFees(address account) external view returns (uint256, uint256);
    function mint(address to) external returns (uint256);
    function burn(address to) external returns (uint256, uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

interface IAeroZapVault {
    function asset() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function rewardTokens(uint256 index) external view returns (address);
    function entryBps() external view returns (uint16);
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function basketBalances() external view returns (uint256[3] memory);
    function gauge() external view returns (address);
    function rewardToken() external view returns (address);
    function pendingDeferredRewards() external view returns (uint256);
    function deferredCredits(address account) external view returns (uint256);
    function deposit(uint256 lp, uint256 minShares, uint256[3] calldata maxExtra) external returns (uint256);
    function redeem(uint256 shares, uint256 minLp, uint256[3] calldata minRewards) external returns (uint256);
}

interface IAeroZapGauge {
    function earned(address account) external view returns (uint256);
}

interface IAeroZapFactory {
    function isVault(address vault) external view returns (bool);
}

/// @notice Stateless token-in/token-out router for AeroVault classic-pool vaults. Holds no funds between calls.
/// @dev Uses the vault's own pool for swaps and mints; slippage is bounded by caller minimums.
/// Deposits revert while the vault holds idle rewards in a third token (rewardTokens[2]); the zap cannot supply them.
/// Share-based exits revert if the vault would book a deferred-reward credit to this contract (Base): callers then
/// redeem from the vault directly (credit stays with them) and convert the LP with withdrawLpTokens/zapOutLp.
contract AeroZap is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;
    uint256 private constant BASKET_MARGIN_BPS = 100;
    IAeroZapFactory public immutable factory;

    event ZappedIn(address indexed user, address indexed vault, address tokenIn, uint256 amountIn, uint256 shares);
    event ZappedOut(address indexed user, address indexed vault, uint256 shares, uint256 amount0, uint256 amount1);

    error InvalidVault();
    error InvalidToken();
    error InvalidAmount();
    error Slippage();
    error DeferredRewardsPending();

    constructor(address factory_) {
        if (factory_.code.length == 0) revert InvalidVault();
        factory = IAeroZapFactory(factory_);
    }

    /// @notice Deposit both pool tokens; unused amounts are refunded.
    function depositTokens(
        address vault,
        uint256 amount0,
        uint256 amount1,
        uint256 minShares
    )
        external
        nonReentrant
        returns (uint256 shares)
    {
        (address pool, address t0, address t1) = _vault(vault);
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();
        IERC20(t0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(t1).safeTransferFrom(msg.sender, address(this), amount1);
        shares = _depositHeld(vault, pool, t0, t1, minShares);
        emit ZappedIn(msg.sender, vault, address(0), 0, shares);
    }

    /// @notice Deposit a single pool token. swapAmount of it is sold in the vault's pool first.
    function zapIn(
        address vault,
        address tokenIn,
        uint256 amountIn,
        uint256 swapAmount,
        uint256 minSwapOut,
        uint256 minShares
    )
        external
        nonReentrant
        returns (uint256 shares)
    {
        (address pool, address t0, address t1) = _vault(vault);
        if (tokenIn != t0 && tokenIn != t1) revert InvalidToken();
        if (amountIn == 0 || swapAmount == 0 || swapAmount >= amountIn) revert InvalidAmount();
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        _swap(pool, t0, tokenIn, swapAmount, minSwapOut);
        shares = _depositHeld(vault, pool, t0, t1, minShares);
        emit ZappedIn(msg.sender, vault, tokenIn, amountIn, shares);
    }

    /// @notice Redeem shares and return both pool tokens plus any reward basket.
    function withdrawTokens(
        address vault,
        uint256 shares,
        uint256 min0,
        uint256 min1
    )
        external
        nonReentrant
        returns (uint256 out0, uint256 out1)
    {
        (address pool, address t0, address t1) = _vault(vault);
        _redeemToLp(vault, shares);
        (out0, out1) = _burnBoth(vault, pool, t0, t1, min0, min1);
        emit ZappedOut(msg.sender, vault, shares, out0, out1);
    }

    /// @notice Redeem shares and return a single pool token (plus any reward basket).
    function zapOut(
        address vault,
        uint256 shares,
        address tokenOut,
        uint256 minOut
    )
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        (address pool, address t0, address t1) = _vault(vault);
        if (tokenOut != t0 && tokenOut != t1) revert InvalidToken();
        _redeemToLp(vault, shares);
        amountOut = _burnSingle(vault, pool, t0, t1, tokenOut, minOut);
        emit ZappedOut(msg.sender, vault, shares, tokenOut == t0 ? amountOut : 0, tokenOut == t1 ? amountOut : 0);
    }

    /// @notice Convert the caller's vault-pool LP into both tokens (after a direct vault redeem).
    function withdrawLpTokens(
        address vault,
        uint256 lp,
        uint256 min0,
        uint256 min1
    )
        external
        nonReentrant
        returns (uint256 out0, uint256 out1)
    {
        (address pool, address t0, address t1) = _vault(vault);
        if (lp == 0) revert InvalidAmount();
        IERC20(pool).safeTransferFrom(msg.sender, address(this), lp);
        (out0, out1) = _burnBoth(vault, pool, t0, t1, min0, min1);
        emit ZappedOut(msg.sender, vault, 0, out0, out1);
    }

    /// @notice Convert the caller's vault-pool LP into a single token (after a direct vault redeem).
    function zapOutLp(
        address vault,
        uint256 lp,
        address tokenOut,
        uint256 minOut
    )
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        (address pool, address t0, address t1) = _vault(vault);
        if (tokenOut != t0 && tokenOut != t1) revert InvalidToken();
        if (lp == 0) revert InvalidAmount();
        IERC20(pool).safeTransferFrom(msg.sender, address(this), lp);
        amountOut = _burnSingle(vault, pool, t0, t1, tokenOut, minOut);
        emit ZappedOut(msg.sender, vault, 0, tokenOut == t0 ? amountOut : 0, tokenOut == t1 ? amountOut : 0);
    }

    function _burnBoth(
        address vault,
        address pool,
        address t0,
        address t1,
        uint256 min0,
        uint256 min1
    )
        private
        returns (uint256 out0, uint256 out1)
    {
        IERC20(pool).safeTransfer(pool, IERC20(pool).balanceOf(address(this)));
        IAeroZapPool(pool).burn(address(this));
        out0 = IERC20(t0).balanceOf(address(this));
        out1 = IERC20(t1).balanceOf(address(this));
        if (out0 < min0 || out1 < min1) revert Slippage();
        _payAll(vault, t0, t1);
    }

    function _burnSingle(
        address vault,
        address pool,
        address t0,
        address t1,
        address tokenOut,
        uint256 minOut
    )
        private
        returns (uint256 amountOut)
    {
        IERC20(pool).safeTransfer(pool, IERC20(pool).balanceOf(address(this)));
        IAeroZapPool(pool).burn(address(this));
        address other = tokenOut == t0 ? t1 : t0;
        uint256 sell = IERC20(other).balanceOf(address(this));
        if (sell != 0) _swap(pool, t0, other, sell, 1);
        amountOut = IERC20(tokenOut).balanceOf(address(this));
        if (amountOut < minOut) revert Slippage();
        _payAll(vault, t0, t1);
    }

    /// @notice Optimal single-sided swap for a volatile x*y=k pool, using the pool's live fee.
    function quoteSwapAmount(address vault, address tokenIn, uint256 amountIn) external view returns (uint256) {
        (address pool, address t0, address t1) = _vault(vault);
        if (tokenIn != t0 && tokenIn != t1) revert InvalidToken();
        (uint256 r0, uint256 r1,) = IAeroZapPool(pool).getReserves();
        uint256 rIn = tokenIn == t0 ? r0 : r1;
        uint256 rOut = tokenIn == t0 ? r1 : r0;
        if (rIn == 0 || rOut == 0 || amountIn == 0) revert InvalidAmount();
        // Derive the fee (1e6 precision) from a 0.1% probe so the formula tracks dynamic fees.
        uint256 probe = Math.max(rIn / 1000, 1);
        uint256 quoted = IAeroZapPool(pool).getAmountOut(probe, tokenIn);
        uint256 ideal = Math.mulDiv(probe, rOut, rIn + probe);
        uint256 keep = ideal == 0 ? 1e6 : Math.min(Math.mulDiv(quoted, 1e6, ideal), 1e6);
        // s = (sqrt(r^2 (1+k)^2 + 4 k a r) - r (1+k)) / (2k), with k = 1 - fee.
        uint256 onePlusK = 1e6 + keep;
        uint256 b = rIn * onePlusK;
        uint256 disc = b * b + 4 * keep * 1e6 * amountIn * rIn;
        return (Math.sqrt(disc) - b) / (2 * keep);
    }

    function _vault(address vault) private view returns (address pool, address t0, address t1) {
        if (!factory.isVault(vault)) revert InvalidVault();
        pool = IAeroZapVault(vault).asset();
        t0 = IAeroZapVault(vault).token0();
        t1 = IAeroZapVault(vault).token1();
    }

    function _swap(address pool, address t0, address tokenIn, uint256 amountIn, uint256 minOut) private {
        uint256 out = IAeroZapPool(pool).getAmountOut(amountIn, tokenIn);
        if (out == 0 || out < minOut) revert Slippage();
        IERC20(tokenIn).safeTransfer(pool, amountIn);
        (uint256 o0, uint256 o1) = tokenIn == t0 ? (uint256(0), out) : (out, uint256(0));
        IAeroZapPool(pool).swap(o0, o1, address(this), "");
    }

    function _depositHeld(
        address vault,
        address pool,
        address t0,
        address t1,
        uint256 minShares
    )
        private
        returns (uint256 shares)
    {
        uint256 a0 = IERC20(t0).balanceOf(address(this));
        uint256 a1 = IERC20(t1).balanceOf(address(this));
        (uint256 r0, uint256 r1,) = IAeroZapPool(pool).getReserves();
        if (a0 == 0 || a1 == 0 || r0 == 0 || r1 == 0) revert InvalidAmount();
        (uint256 keep0, uint256 keep1) = _basketReserve(vault, pool, a0, a1, r0, r1);
        if (keep0 >= a0 || keep1 >= a1) revert InvalidAmount();
        a0 -= keep0;
        a1 -= keep1;
        uint256 optimal1 = Math.mulDiv(a0, r1, r0);
        if (optimal1 <= a1) a1 = optimal1;
        else a0 = Math.mulDiv(a1, r0, r1);
        IERC20(t0).safeTransfer(pool, a0);
        IERC20(t1).safeTransfer(pool, a1);
        uint256 lp = IAeroZapPool(pool).mint(address(this));

        uint256[3] memory maxExtra;
        maxExtra[0] = IERC20(t0).balanceOf(address(this));
        maxExtra[1] = IERC20(t1).balanceOf(address(this));
        IERC20(pool).forceApprove(vault, lp);
        IERC20(t0).forceApprove(vault, maxExtra[0]);
        IERC20(t1).forceApprove(vault, maxExtra[1]);
        shares = IAeroZapVault(vault).deposit(lp, minShares, maxExtra);
        IERC20(pool).forceApprove(vault, 0);
        IERC20(t0).forceApprove(vault, 0);
        IERC20(t1).forceApprove(vault, 0);
        IERC20(vault).safeTransfer(msg.sender, shares);
        _pay(t0, IERC20(t0).balanceOf(address(this)));
        _pay(t1, IERC20(t1).balanceOf(address(this)));
    }

    /// @dev Over-estimates the pro-rata basket the vault will pull, so the LP mint never starves deposit().
    function _basketReserve(
        address vault,
        address pool,
        uint256 a0,
        uint256 a1,
        uint256 r0,
        uint256 r1
    )
        private
        view
        returns (uint256 keep0, uint256 keep1)
    {
        if (IAeroZapVault(vault).totalSupply() == 0) return (0, 0);
        uint256 assets = IAeroZapVault(vault).totalAssets();
        if (assets == 0) return (0, 0);
        uint256[3] memory basket = IAeroZapVault(vault).basketBalances();
        (uint256 pending0, uint256 pending1) = IAeroZapPool(pool).pendingFees(vault);
        // deposit() first claims gauge emissions and also prices in deferred (Base) rewards.
        address reward = IAeroZapVault(vault).rewardToken();
        if (reward == IAeroZapVault(vault).token0() || reward == IAeroZapVault(vault).token1()) {
            address gauge = IAeroZapVault(vault).gauge();
            uint256 emissions = IAeroZapVault(vault).pendingDeferredRewards()
                + (gauge == address(0) ? 0 : IAeroZapGauge(gauge).earned(vault));
            if (reward == IAeroZapVault(vault).token0()) pending0 += emissions;
            else pending1 += emissions;
        }
        if (basket[0] + pending0 == 0 && basket[1] + pending1 == 0) return (0, 0);
        uint256 supply = IAeroZapPool(pool).totalSupply();
        uint256 lpEst = Math.min(Math.mulDiv(a0, supply, r0), Math.mulDiv(a1, supply, r1));
        uint256 gross = BPS + BASKET_MARGIN_BPS;
        uint256 net = BPS - IAeroZapVault(vault).entryBps();
        keep0 = Math.mulDiv(Math.mulDiv(basket[0] + pending0, lpEst, assets, Math.Rounding.Ceil), gross, net) + 1;
        keep1 = Math.mulDiv(Math.mulDiv(basket[1] + pending1, lpEst, assets, Math.Rounding.Ceil), gross, net) + 1;
    }

    function _redeemToLp(address vault, uint256 shares) private {
        if (shares == 0) revert InvalidAmount();
        IERC20(vault).safeTransferFrom(msg.sender, address(this), shares);
        uint256 creditBefore = IAeroZapVault(vault).deferredCredits(address(this));
        uint256[3] memory none;
        uint256 lp = IAeroZapVault(vault).redeem(shares, 0, none);
        if (lp == 0) revert InvalidAmount();
        if (IAeroZapVault(vault).deferredCredits(address(this)) != creditBefore) revert DeferredRewardsPending();
    }

    function _payAll(address vault, address t0, address t1) private {
        _pay(t0, IERC20(t0).balanceOf(address(this)));
        _pay(t1, IERC20(t1).balanceOf(address(this)));
        address reward = IAeroZapVault(vault).rewardTokens(2);
        if (reward != address(0)) _pay(reward, IERC20(reward).balanceOf(address(this)));
    }

    function _pay(address token, uint256 amount) private {
        if (amount != 0) IERC20(token).safeTransfer(msg.sender, amount);
    }
}
