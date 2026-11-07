// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice What an Infinite Subaccount and the swap sandbox read from their factory.
interface IInfiniteSubaccountFactory {
    function keepersPaused() external view returns (bool);
    function isActiveKeeper(address keeper) external view returns (bool);
    function isApprovedRouter(address router) external view returns (bool);
    function isTradableAsset(address token) external view returns (bool);
    function isAccount(address account) external view returns (bool);
    function swapSandbox() external view returns (address);
    function feeToken() external view returns (address);

    /// @notice USD value (18 decimals) of `amount` of `token` at the checked oracle price.
    function valueUsd(address token, uint256 amount) external view returns (uint256);

    /// @notice Token amount worth `usd` (18 decimals), rounded up.
    function amountForUsdUp(address token, uint256 usd) external view returns (uint256);

    /// @notice Fee for an agent swap of `amount` of `token` worth `usd`, after the account's ITP discount.
    function quoteFee(
        address account,
        address token,
        uint256 amount,
        uint256 usd,
        bool viaOperator
    )
        external
        view
        returns (uint256 fee, address treasury);

    /// @notice Called by an account after its ownership changed, so the factory index follows the real owner.
    function syncOwner() external;
}

/// @dev Chainlink AggregatorV3Interface subset.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
