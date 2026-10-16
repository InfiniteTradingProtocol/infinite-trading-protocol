// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Stateless on-chain supply-rate oracle for one protocol family.
/// @dev Returns the current *net* supply APR of `target` as a WAD (1e18 = 100%), simple (non-compounded) annualized.
interface IRateReader {
    function supplyRate(address target) external view returns (uint256 aprWad);
}
