// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRateReader} from "../interfaces/IRateReader.sol";
import {IComet} from "../interfaces/IExternal.sol";

/// @title CompoundV3RateReader
/// @notice Supply APR of a Comet market at current utilization. `target` is the Comet proxy.
/// @dev Comet rates are per-second WAD. COMP rewards are excluded (they are not auto-compounded into the vault).
contract CompoundV3RateReader is IRateReader {
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    function supplyRate(address target) external view returns (uint256) {
        IComet comet = IComet(target);
        return uint256(comet.getSupplyRate(comet.getUtilization())) * SECONDS_PER_YEAR;
    }
}
