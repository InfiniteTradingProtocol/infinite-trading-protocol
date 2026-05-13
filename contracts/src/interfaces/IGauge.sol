// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGauge {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getReward(address account) external;
    function earned(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function rewardPerToken() external view returns (uint256);
    function stakingToken() external view returns (address);
    function notifyRewardAmount(address token, uint256 amount) external;
}
