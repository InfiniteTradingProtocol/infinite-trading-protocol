// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/src/Script.sol";
import { console2 } from "forge-std/src/console2.sol";
import { AeroChains } from "../../../src/aero/AeroChains.sol";
import { AeroTwapOracle } from "../../../src/aero/v2/AeroTwapOracle.sol";
import { AeroFactoryV2 } from "../../../src/aero/v2/AeroFactoryV2.sol";
import { AeroZapV2 } from "../../../src/aero/v2/AeroZapV2.sol";
import { AeroVaultV2 } from "../../../src/aero/v2/AeroVaultV2.sol";

/// @notice Deploys oracle + factory (+ vault implementation) + zap, and optionally one vault.
/// Env: AERO_DAO, AERO_TREASURY, AERO_KEEPER; optional AERO_VAULT_POOL, AERO_VAULT_NAME, AERO_VAULT_SYMBOL.
/// DAO follow-ups (Safe batch, not broadcast here): setApprovedPool for reward-route pools, setOfficial(vault),
/// acceptOwnership on the vault, and later setGauge + setStaking(true) once the pool has an active gauge.
contract DeployAeroV2 is Script {
    function run() external returns (AeroFactoryV2 factory, AeroZapV2 zap, address vault) {
        address dao = vm.envAddress("AERO_DAO");
        address treasury = vm.envAddress("AERO_TREASURY");
        address keeper = vm.envAddress("AERO_KEEPER");
        require(dao.code.length != 0 && treasury.code.length != 0, "Verify deployed DAO/treasury Safe on this chain");
        (address stableGauge, address volatileGauge) = AeroChains.gaugeFactories(block.chainid);
        address pool = vm.envOr("AERO_VAULT_POOL", address(0));

        vm.startBroadcast();
        AeroTwapOracle oracle = new AeroTwapOracle();
        factory = new AeroFactoryV2(
            dao,
            treasury,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            stableGauge,
            volatileGauge,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(block.chainid),
            address(oracle),
            keeper
        );
        zap = new AeroZapV2(address(factory));
        if (pool != address(0)) {
            vault = factory.createVault(
                pool, address(0), 0, vm.envString("AERO_VAULT_NAME"), vm.envString("AERO_VAULT_SYMBOL")
            );
            oracle.update(pool);
            AeroVaultV2(vault).transferOwnership(dao);
        }
        vm.stopBroadcast();

        console2.log("Chain", block.chainid);
        console2.log("Oracle", address(oracle));
        console2.log("FactoryV2", address(factory));
        console2.log("Vault implementation", factory.implementation());
        console2.log("ZapV2", address(zap));
        if (vault != address(0)) console2.log("Vault (DAO must acceptOwnership)", vault);
    }
}
