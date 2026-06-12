// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/src/Script.sol";
import {console} from "forge-std/src/console.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  Deploy UniV3AutoCompounder on Base
//
//  All parameters are supplied via environment variables so the entire
//  deployment is a single terminal command.
//
//  Required env vars:
//    DEPLOYER_PRIVATE_KEY   – deployer wallet private key (no 0x prefix)
//    TOKEN0                 – lower-address token of the pair
//    TOKEN1                 – higher-address token of the pair
//    POOL_FEE               – Uniswap V3 fee tier: 500 | 3000 | 10000
//    POOL                   – Uniswap V3 pool address
//    KEEPER_ADDRESS         – address authorised to call compound()
//    ITP_DAO                – DAO multisig; receives 1.5% fee & ownership
//    BASE_RPC_URL           – Base mainnet RPC endpoint
//    BASE_ETHERSCAN_API_KEY – Basescan API key (only needed for --verify)
//
//  ── Common presets (already set in .env) ────────────────────────────────────
//  WETH/USDC 0.05%:
//    TOKEN0=0x4200000000000000000000000000000000000006
//    TOKEN1=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
//    POOL_FEE=500
//    POOL=0xd0b53D9277642d899DF5C87A3966A349A798F224
//
//  ── One-line deploy + verify ─────────────────────────────────────────────────
//    source .env && forge script script/DeployUniV3AutoCompounder.s.sol \
//      --rpc-url $BASE_RPC_URL --broadcast --verify \
//      --etherscan-api-key $BASE_ETHERSCAN_API_KEY -vvvv
//
//  ── Dry-run (no broadcast, no gas) ──────────────────────────────────────────
//    source .env && forge script script/DeployUniV3AutoCompounder.s.sol \
//      --rpc-url $BASE_RPC_URL -vvvv
// ─────────────────────────────────────────────────────────────────────────────

contract DeployUniV3AutoCompounder is Script {

    function run() external {
        // ── Read all params from environment ─────────────────────────────────
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address token0      = vm.envAddress("TOKEN0");
        address token1      = vm.envAddress("TOKEN1");
        uint24  poolFee     = uint24(vm.envUint("POOL_FEE"));
        address pool        = vm.envAddress("POOL");
        address keeper      = vm.envAddress("KEEPER_ADDRESS");
        address keeper2     = vm.envAddress("KEEPER_ADDRESS_2");
        address itpDao      = vm.envAddress("ITP_DAO");

        address deployer = vm.addr(deployerKey);

        console.log("=== UniV3AutoCompounder Deployment ===");
        console.log("Deployer:        ", deployer);
        console.log("token0:          ", token0);
        console.log("token1:          ", token1);
        console.log("poolFee:         ", poolFee);
        console.log("pool:            ", pool);
        console.log("Initial keeper:  ", keeper);
        console.log("Second keeper:   ", keeper2);
        console.log("ITP DAO:         ", itpDao);
        console.log("Fees: 1.5% DAO / 0.5% executor / 98% re-compounded");

        vm.startBroadcast(deployerKey);

        // 1. Deploy the logic implementation (constructor disables direct initialization)
        UniV3AutoCompounder impl = new UniV3AutoCompounder();

        // 2. Encode the initialize() call
        bytes memory initData = abi.encodeCall(
            impl.initialize,
            (token0, token1, poolFee, pool, keeper, itpDao, keeper2)
        );

        // 3. Deploy ERC1967 proxy – calls initialize() atomically
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        UniV3AutoCompounder vault = UniV3AutoCompounder(address(proxy));

        vm.stopBroadcast();

        console.log("--------------------------------------");
        console.log("Implementation:  ", address(impl));
        console.log("Proxy (vault):   ", address(vault));
        console.log("Owner (DAO):     ", vault.owner());
        console.log("DAO address:     ", vault.dao());
        console.log("Initial keeper:  ", keeper);
        console.log("Second keeper:   ", keeper2);
        console.log("DAO fee bps:     ", vault.DAO_FEE_BPS());
        console.log("Exec fee bps:    ", vault.EXECUTOR_FEE_BPS());
    }
}
