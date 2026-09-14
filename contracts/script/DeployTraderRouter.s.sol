// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/src/Script.sol";
import { TraderRouter } from "../src/TraderRouter.sol";

/// @notice Deploys TraderRouter deterministically so it lands on the SAME address
///         on every network. That keeps the backend config to a single constant
///         and makes the multisig's `setTrader` calldata identical everywhere.
///
/// Usage:
///   TRADER_ROUTER_OWNER=0x...      # DAO multisig / timelock
///   TRADER_ROUTER_GUARDIAN=0x...   # fast pause responder (may be 0x0)
///   TRADER_ROUTER_OPERATORS=0x..,0x..   # initial hot gas wallets
///   forge script script/DeployTraderRouter.s.sol --rpc-url base --broadcast --verify
contract DeployTraderRouter is Script {
    /// @dev Any change to this salt or to the contract bytecode changes the address.
    bytes32 constant SALT = keccak256("InfiniteTrading.TraderRouter.v1");

    function run() external {
        address owner = vm.envAddress("TRADER_ROUTER_OWNER");
        address guardian = vm.envOr("TRADER_ROUTER_GUARDIAN", address(0));
        address[] memory operators = vm.envOr("TRADER_ROUTER_OPERATORS", ",", new address[](0));

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        TraderRouter router = new TraderRouter{ salt: SALT }(owner, guardian, operators);
        vm.stopBroadcast();

        console.log("TraderRouter deployed at:", address(router));
        console.log("Owner   :", owner);
        console.log("Guardian:", guardian);
        for (uint256 i; i < operators.length; ++i) {
            console.log("Operator:", operators[i]);
        }
        console.log("");
        console.log("Next steps:");
        console.log("1. Multisig: PoolManagerLogic.setTrader(router) on each vault (one-time).");
        console.log("2. Verify with router.unmigratedVaults([...]) - must return an empty array.");
        console.log("3. Set TRADER_ROUTER_ADDRESS in the backend and flip TRADER_ROUTER_ENABLED.");
    }
}
