// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { IVelodromePool } from "../VelodromeItpOracle.sol";

/// @dev Quotes at a fixed TWAP rate (token1 per token0, 1e18) and exposes settable reserves / observation time.
contract MockVelodromePool {
    address public token0;
    address public token1;
    uint256 public rate;
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public observedAt;

    constructor(address token0_, address token1_, uint256 rate_, uint256 reserve0_, uint256 reserve1_) {
        (token0, token1, rate, reserve0, reserve1, observedAt) =
        (token0_, token1_, rate_, reserve0_, reserve1_, block.timestamp);
    }

    function set(uint256 rate_, uint256 reserve0_, uint256 reserve1_, uint256 observedAt_) external {
        (rate, reserve0, reserve1, observedAt) = (rate_, reserve0_, reserve1_, observedAt_);
    }

    function getReserves() external view returns (uint256, uint256, uint256) {
        return (reserve0, reserve1, observedAt);
    }

    function lastObservation() external view returns (IVelodromePool.Observation memory o) {
        o.timestamp = observedAt;
    }

    function quote(address tokenIn, uint256 amountIn, uint256) external view returns (uint256) {
        if (tokenIn == token0) return amountIn * rate / 1e18;
        require(tokenIn == token1, "token");
        return amountIn * 1e18 / rate;
    }
}
