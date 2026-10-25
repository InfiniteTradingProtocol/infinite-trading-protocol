// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/src/Script.sol";
import { console2 } from "forge-std/src/console2.sol";
import { AeroChains } from "../../src/aero/AeroChains.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";

contract DeployAero is Script {
    function run() external returns (AeroFactory factory) {
        address reward = AeroChains.rewardToken(block.chainid);
        // Explicit confirmation on every chain: the Optimism DAO Safe is not assumed deployed elsewhere.
        address dao = vm.envAddress("AERO_DAO");
        address treasury = vm.envAddress("AERO_TREASURY");
        address[] memory keepers = vm.envAddress("AERO_KEEPERS", ",");
        (address stableGauge, address volatileGauge) = AeroChains.gaugeFactories(block.chainid);
        require(dao.code.length != 0 && treasury.code.length != 0, "Verify deployed DAO/treasury Safe on this chain");
        vm.startBroadcast();
        factory = new AeroFactory(
            dao,
            treasury,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            stableGauge,
            volatileGauge,
            AeroChains.LEAF_VOTER,
            reward,
            block.chainid == 8453 ? AeroChains.ROOT_HANDLER : address(0),
            keepers
        );
        vm.stopBroadcast();
        console2.log("Aero factory", address(factory));
        console2.log("Chain", block.chainid);
        console2.log("Reward token", reward);
        console2.log("DAO", dao);
    }
}
