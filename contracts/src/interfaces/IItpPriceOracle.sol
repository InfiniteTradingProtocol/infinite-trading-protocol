// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice USD price source for ITP used by AgentSeats. Implementations must be manipulation resistant (TWAP) and
///         revert rather than return a stale or unreliable price.
interface IItpPriceOracle {
    /// @return price USD per 1 ITP, scaled by 1e18.
    function itpUsdPrice() external view returns (uint256 price);
}
