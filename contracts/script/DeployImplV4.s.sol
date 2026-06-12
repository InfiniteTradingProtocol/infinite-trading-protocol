// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/src/Script.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

/// @notice Deploys UniV3AutoCompounder implementation v4.
///         Fixes:
///         - In-range compound where swap fails leaving one token at zero:
///           previously caused a doomed increaseLiquidity(0, X) that reverted
///           (L=0) and left tokens untracked in the vault forever.
///         - All failure paths (catch block, early returns) now save remaining
///           tokens to pendingReinvest so protocol fees aren't charged again.
///
///         After deployment, run proposeUpgradeV4.ts to batch-upgrade all proxies.
contract DeployImplV4 is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        UniV3AutoCompounder newImpl = new UniV3AutoCompounder();
        vm.stopBroadcast();

        console.log("New implementation (v4):", address(newImpl));
        console.log("Next: run proposeUpgradeV4.ts with this address.");
    }
}
