// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/src/Script.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

/// @notice Deploys a new UniV3AutoCompounder implementation (v3).
///         After deployment, use src/Typescript/proposeUpgradeV3.ts to propose
///         the upgrade transactions through the DAO Safe multisig.
contract DeployImplV3 is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        UniV3AutoCompounder newImpl = new UniV3AutoCompounder();
        vm.stopBroadcast();

        console.log("New implementation (v3):", address(newImpl));
        console.log("Next: run proposeUpgradeV3.ts with this address.");
    }
}
