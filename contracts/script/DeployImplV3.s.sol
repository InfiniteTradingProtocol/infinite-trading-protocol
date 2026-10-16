// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/src/Script.sol";
/// @notice Retired: the maintained V3 contract is constructor-deployed, not UUPS-upgradeable.
contract DeployImplV3 is Script {
    function run() external pure {
        revert("V3 implementation upgrades retired; deploy a new vault instead");
    }
}
