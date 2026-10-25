// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { IAeroV2Pool } from "./IAeroV2.sol";
import { AeroVaultV2 } from "./AeroVaultV2.sol";

interface IAeroZapV2Factory {
    function isVault(address vault) external view returns (bool);
}

/// @notice Optional single-token router for AeroVaultV2. Users can always deposit LP or both tokens directly.
/// Holds nothing between calls; every swap is bounded by caller minimums.
contract AeroZapV2 is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    IAeroZapV2Factory public immutable factory;

    event ZappedIn(address indexed user, address indexed vault, address tokenIn, uint256 amountIn, uint256 shares);
    event ZappedOut(address indexed user, address indexed vault, uint256 shares, address tokenOut, uint256 amountOut);

    error InvalidVault();
    error InvalidToken();
    error Slippage();

    constructor(address factory_) {
        factory = IAeroZapV2Factory(factory_);
    }

    /// @notice Amount of `tokenIn` to swap so the remainder pairs with the output (fee ignored; dust refunded).
    function quoteSwapAmount(address vault, address tokenIn, uint256 amountIn) public view returns (uint256) {
        (IAeroV2Pool pool, bool zeroIn) = _pool(vault, tokenIn);
        (uint256 r0, uint256 r1,) = pool.getReserves();
        uint256 r = zeroIn ? r0 : r1;
        if (AeroVaultV2(vault).stablePool()) return amountIn / 2;
        return Math.sqrt(r * (r + amountIn)) - r;
    }

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
        (IAeroV2Pool pool, bool zeroIn) = _pool(vault, tokenIn);
        address tokenOut = zeroIn ? pool.token1() : pool.token0();
        uint256 before = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        amountIn = IERC20(tokenIn).balanceOf(address(this)) - before;
        if (swapAmount == 0 || swapAmount >= amountIn) revert Slippage();
        uint256 out = _swap(pool, tokenIn, tokenOut, zeroIn, swapAmount);
        if (out < minSwapOut) revert Slippage();
        uint256 amount0 = zeroIn ? amountIn - swapAmount : out;
        uint256 amount1 = zeroIn ? out : amountIn - swapAmount;
        address t0 = pool.token0();
        address t1 = pool.token1();
        IERC20(t0).forceApprove(vault, amount0);
        IERC20(t1).forceApprove(vault, amount1);
        (shares,,) = AeroVaultV2(vault).depositTokens(amount0, amount1, minShares, msg.sender);
        IERC20(t0).forceApprove(vault, 0);
        IERC20(t1).forceApprove(vault, 0);
        _refund(t0);
        _refund(t1);
        emit ZappedIn(msg.sender, vault, tokenIn, amountIn, shares);
    }

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
        (IAeroV2Pool pool, bool zeroOut) = _pool(vault, tokenOut);
        IERC20(vault).safeTransferFrom(msg.sender, address(this), shares);
        (uint256 a0, uint256 a1) = AeroVaultV2(vault).redeemTokens(shares, 0, 0, address(this));
        address other = zeroOut ? pool.token1() : pool.token0();
        uint256 otherAmount = zeroOut ? a1 : a0;
        amountOut = (zeroOut ? a0 : a1) + (otherAmount == 0 ? 0 : _swap(pool, other, tokenOut, !zeroOut, otherAmount));
        if (amountOut < minOut) revert Slippage();
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        emit ZappedOut(msg.sender, vault, shares, tokenOut, amountOut);
    }

    function _pool(address vault, address token) private view returns (IAeroV2Pool pool, bool isToken0) {
        if (!factory.isVault(vault)) revert InvalidVault();
        pool = IAeroV2Pool(AeroVaultV2(vault).asset());
        isToken0 = token == pool.token0();
        if (!isToken0 && token != pool.token1()) revert InvalidToken();
    }

    function _swap(
        IAeroV2Pool pool,
        address tokenIn,
        address tokenOut,
        bool zeroIn,
        uint256 amountIn
    )
        private
        returns (uint256 out)
    {
        out = pool.getAmountOut(amountIn, tokenIn);
        uint256 before = IERC20(tokenOut).balanceOf(address(this));
        IERC20(tokenIn).safeTransfer(address(pool), amountIn);
        pool.swap(zeroIn ? 0 : out, zeroIn ? out : 0, address(this), "");
        if (IERC20(tokenOut).balanceOf(address(this)) - before < out) revert Slippage();
    }

    function _refund(address token) private {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance != 0) IERC20(token).safeTransfer(msg.sender, balance);
    }
}
