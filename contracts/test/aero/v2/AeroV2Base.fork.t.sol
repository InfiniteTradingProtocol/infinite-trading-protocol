// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test, console2 } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroChains } from "../../../src/aero/AeroChains.sol";
import { AeroTwapOracle } from "../../../src/aero/v2/AeroTwapOracle.sol";
import { AeroFactoryV2 } from "../../../src/aero/v2/AeroFactoryV2.sol";
import { AeroVaultV2 } from "../../../src/aero/v2/AeroVaultV2.sol";
import { AeroZapV2 } from "../../../src/aero/v2/AeroZapV2.sol";
import { IAeroV2Pool } from "../../../src/aero/v2/IAeroV2.sol";

/// v2 on Base AERO/USDC with the real gauge, real emissions and the deferred-emission handler (local fork).
contract AeroV2BaseForkTest is Test {
    address constant DAO = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant KEEPER = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
    address constant POOL = 0xF634058dC94e6BF8e828E27621320C423bC8B18E; // AERO/USDC volatile
    address constant GAUGE = 0xd424BA8ca9d4E278753DE76651a0095451e65cD1;
    address constant AERO = 0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address alice = address(0xa11ce);

    AeroTwapOracle oracle;
    AeroFactoryV2 factory;
    AeroVaultV2 vault;
    AeroZapV2 zap;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_BASE_FORK_RPC_URL", string("https://mainnet.base.org")));
        (address sg, address vg) = AeroChains.gaugeFactories(8453);
        oracle = new AeroTwapOracle();
        factory = new AeroFactoryV2(
            DAO,
            DAO,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            sg,
            vg,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(8453),
            address(oracle),
            KEEPER
        );
        zap = new AeroZapV2(address(factory));
        vault = AeroVaultV2(factory.createVault(POOL, address(0), 0, "Infinite Aero AERO/USDC", "acAERO-USDC"));
        vault.transferOwnership(DAO);
        vm.startPrank(DAO);
        vault.acceptOwnership();
        vault.setGauge(GAUGE);
        vault.setStaking(true); // reward token is a pool token: no route needed
        factory.setOfficial(address(vault), true);
        vm.stopPrank();
    }

    function test_BaseStakedLifecycle() public {
        assertEq(vault.token0(), AERO);
        assertEq(vault.token1(), USDC);
        deal(USDC, alice, 2000e6);
        vm.startPrank(alice);
        IERC20(USDC).approve(address(zap), 2000e6);
        uint256 s = zap.quoteSwapAmount(address(vault), USDC, 2000e6);
        uint256 shares = zap.zapIn(
            address(vault), USDC, 2000e6, s, IAeroV2Pool(POOL).getAmountOut(s, USDC) * 99 / 100, 1
        );
        vm.stopPrank();
        assertEq(IERC20(POOL).balanceOf(address(vault)), 0, "no idle LP");
        assertGt(vault.stakedLp(), 0, "LP staked in the real gauge");
        oracle.update(POOL);
        uint256 t0 = vm.getBlockTimestamp();
        vm.warp(t0 + 6 hours);
        vm.roll(block.number + 10_800);
        uint256 pps0 = vault.totalAssets() * 1e18 / vault.totalSupply();
        vm.prank(KEEPER);
        uint256 liq = vault.harvest(0);
        console2.log("harvest LP (real emissions; 0 if deferred below threshold)", liq);
        console2.log("AERO dao owed", vault.daoOwed(AERO));
        vm.warp(t0 + 6 hours + 24 hours);
        uint256 pps1 = vault.totalAssets() * 1e18 / vault.totalSupply();
        assertGe(pps1, pps0);
        vm.startPrank(alice);
        vault.approve(address(zap), shares);
        uint256 out = zap.zapOut(address(vault), shares, USDC, 1);
        vm.stopPrank();
        console2.log("alice USDC out of 2000", out);
        assertGt(out, 1960e6);
        // Emergency unstake path by the DAO.
        vm.prank(DAO);
        vault.setStaking(false);
        assertEq(vault.stakedLp(), 0);
    }
}
