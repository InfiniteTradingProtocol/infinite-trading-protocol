// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IManagedVaultFactory {
    function MULTICALL3() external view returns (address);
    function feeTreasury() external view returns (address);
    function tradeFeeBps() external view returns (uint16);
    function executorFeeShareBps() external view returns (uint16);
    function isApprovedAsset(address token) external view returns (bool);
    function isApprovedRouter(address router) external view returns (bool);
    function isApprovedExecutor(address executor) external view returns (bool);
    function setFeeConfig(uint16 tradeFeeBps, uint16 executorFeeShareBps) external;
}
