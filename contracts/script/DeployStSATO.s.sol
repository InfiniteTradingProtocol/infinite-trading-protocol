// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/src/Script.sol";
import {StSATO} from "../src/stsato.sol";

contract DeployStSATO is Script {
    // SATO token on Ethereum mainnet
    address constant SATO = 0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09;

    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        StSATO stsato = new StSATO(SATO);
        vm.stopBroadcast();

        console.log("StSATO deployed at:", address(stsato));
        console.log("SATO token       :", SATO);
        console.log("Owner            :", stsato.owner());
        console.log("Next: approve 1e18 SATO to StSATO, then call setStart(1e18)");
    }
}
