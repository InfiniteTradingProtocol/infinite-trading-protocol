// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Classic (Solidly-style) Aero pool. Selectors verified against the live Optimism implementation.
interface IAeroV2Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function totalSupply() external view returns (uint256);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast);
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    /// @dev Reserve cumulatives (not price cumulatives), including the counterfactual current-block update.
    function currentCumulativePrices()
        external
        view
        returns (uint256 reserve0Cumulative, uint256 reserve1Cumulative, uint256 blockTimestamp);
    function pendingFees(address account) external view returns (uint256, uint256);
    function claimFees(address recipient) external returns (uint256, uint256);
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

interface IAeroV2PoolFactory {
    function isPool(address pool) external view returns (bool);
}

interface IAeroV2Gauge {
    function stakingToken() external view returns (address);
    function voter() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function earned(address account) external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimEmissions(address account, address recipient) external;
}

interface IAeroV2GaugeFactory {
    function computeGaugeAddress(address pool) external view returns (address);
    function isGauge(address gauge) external view returns (bool);
}

interface IAeroV2Voter {
    function isActivated(address gauge) external view returns (bool);
}

interface IAeroV2Oracle {
    function update(address pool) external returns (bool);
    function averageReserves(address pool) external view returns (bool ok, uint256 reserve0, uint256 reserve1);
}

interface IAeroV2Factory {
    function dao() external view returns (address);
    function treasury() external view returns (address);
    function oracle() external view returns (IAeroV2Oracle);
    function rewardToken() external view returns (address);
    function daoFeeBps() external view returns (uint16);
    function defaultKeeper() external view returns (address);
    function isKeeper(address account) external view returns (bool);
    function approvedPool(address pool) external view returns (bool);
    function isPool(address pool) external view returns (bool);
    function isStablePool(address pool) external view returns (bool);
    function isGauge(address pool, address gauge) external view returns (bool);
}
