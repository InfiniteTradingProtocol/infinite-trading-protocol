// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IAeroPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function factory() external view returns (address);
    function getReserves() external view returns (uint256, uint256, uint256);
    function getAmountOutWithTotalFee(uint256 amountIn, address tokenIn) external view returns (uint256);
    function pendingFees(address account) external view returns (uint256, uint256);
    function claimFees(address recipient) external returns (uint256, uint256);
    function mint(address recipient) external returns (uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

interface IAeroPoolFactory {
    function isPool(address pool) external view returns (bool);
}

interface IAeroGauge {
    function stakingToken() external view returns (address);
    function voter() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function earned(address account) external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimEmissions(address account, address recipient) external;
}

interface IAeroGaugeFactory {
    function computeGaugeAddress(address pool) external view returns (address);
    function isGauge(address gauge) external view returns (bool);
}

interface IAeroVoter {
    function isActivated(address gauge) external view returns (bool);
}

interface IAeroAutomationFactory {
    function dao() external view returns (address);
    function treasury() external view returns (address);
    function daoRewardBps() external view returns (uint16);
    function daoEntryExitShareBps() external view returns (uint16);
    function defaultKeeper() external view returns (address);
    function mandatoryKeepers(address keeper) external view returns (bool);
    function isPool(address pool) external view returns (bool);
    function deferredHandler() external view returns (address);
}

interface IAeroDeferredHandler {
    function pendingRedeems(address account) external view returns (uint256);
}
