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

/// v2 against the real Aero classic pools on Optimism (local fork; nothing is broadcast).
contract AeroV2OptimismForkTest is Test {
    address constant DAO = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant KEEPER = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
    address constant POOL = 0x76817cf226aa94b164295AED4f62e7a1EEd41d36; // ITP/wstETH
    address constant XAERO_USDC = 0x686c9942020a80EE853EaEF7663A266ae7991965;
    address constant ITP_USDC = 0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01;
    address constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address constant WST = 0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb;
    address constant XAERO = 0xbdEaeA5205d16f34Cb40038052d91235D87B4C54;
    address alice = address(0xa11ce);
    address bob = address(0xb0b);

    AeroTwapOracle oracle;
    AeroFactoryV2 factory;
    AeroVaultV2 vault;
    AeroZapV2 zap;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_OP_FORK_RPC_URL", string("https://mainnet.optimism.io")));
        (address sg, address vg) = AeroChains.gaugeFactories(10);
        oracle = new AeroTwapOracle();
        factory = new AeroFactoryV2(
            DAO,
            DAO,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            sg,
            vg,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(10),
            address(oracle),
            KEEPER
        );
        zap = new AeroZapV2(address(factory));
        vault = AeroVaultV2(factory.createVault(POOL, address(0), 0, "Infinite Aero ITP/wstETH", "acITP-wstETH"));
        vault.transferOwnership(DAO);
        vm.startPrank(DAO);
        vault.acceptOwnership();
        factory.setApprovedPool(XAERO_USDC, true);
        factory.setApprovedPool(ITP_USDC, true);
        factory.setOfficial(address(vault), true);
        address[] memory route = new address[](2);
        route[0] = XAERO_USDC;
        route[1] = ITP_USDC;
        vault.setRewardRoute(route);
        vm.stopPrank();
    }

    function _zapIn(address who, address token, uint256 amount) internal returns (uint256 shares) {
        deal(token, who, amount);
        vm.startPrank(who);
        IERC20(token).approve(address(zap), amount);
        uint256 s = zap.quoteSwapAmount(address(vault), token, amount);
        uint256 minOut = IAeroV2Pool(POOL).getAmountOut(s, token) * 99 / 100;
        shares = zap.zapIn(address(vault), token, amount, s, minOut, 1);
        vm.stopPrank();
    }

    function test_LiveLifecycleWithMultiHopReward() public {
        assertEq(vault.token0(), ITP);
        assertEq(vault.token1(), WST);
        uint256 a = _zapIn(alice, WST, 0.0005 ether);
        uint256 b = _zapIn(bob, ITP, 500 ether);
        oracle.updateMany(_pools());
        vm.warp(block.timestamp + 31 minutes);
        uint256 before = vault.totalAssets() * 1e18 / vault.totalSupply();
        deal(XAERO, address(vault), 1 ether); // simulated gauge emissions
        deal(ITP, address(vault), 50 ether); // simulated pool fees
        vm.prank(KEEPER);
        uint256 liq = vault.harvest(1);
        vm.warp(block.timestamp + 12 hours); // harvested LP unlocks over profitUnlockTime
        uint256 afterPps = vault.totalAssets() * 1e18 / vault.totalSupply();
        console2.log("harvest LP", liq);
        console2.log("xAERO left (clamped to maxSwapBps)", vault.freeBalance(XAERO));
        assertGt(afterPps, before);
        assertEq(IERC20(0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85).balanceOf(address(vault)), 0, "no USDC stuck");
        assertEq(vault.daoOwed(XAERO), 0.02 ether);
        assertEq(vault.feesOwed(KEEPER, XAERO), 0.005 ether);

        vm.startPrank(alice);
        vault.approve(address(zap), a);
        uint256 out = zap.zapOut(address(vault), a, WST, 1);
        vm.stopPrank();
        vm.prank(bob);
        (uint256 b0, uint256 b1) = vault.redeemTokens(b, 1, 1, bob);
        console2.log("alice wstETH out", out);
        console2.log("bob ITP / wstETH out", b0, b1);
        assertEq(vault.totalSupply(), vault.balanceOf(vault.DEAD()));
        vault.payDao(XAERO);
        assertEq(IERC20(XAERO).balanceOf(DAO) >= 0.02 ether, true);
    }

    function test_LiveUnseededOracleNeverSwaps() public {
        _zapIn(alice, WST, 0.0005 ether);
        deal(XAERO, address(vault), 1 ether);
        vm.prank(KEEPER);
        assertEq(vault.harvest(0), 0);
        assertGt(vault.freeBalance(XAERO), 0.97 ether);
    }

    function test_LiveGaugeNotYetDeployed() public {
        (, address vg) = AeroChains.gaugeFactories(10);
        (bool ok, bytes memory d) = vg.staticcall(abi.encodeWithSignature("computeGaugeAddress(address)", POOL));
        assertTrue(ok);
        address g = abi.decode(d, (address));
        vm.prank(DAO);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setGauge(g); // no code yet; the DAO attaches it once Aero creates and activates it
    }

    function _pools() internal pure returns (address[] memory p) {
        p = new address[](3);
        p[0] = POOL;
        p[1] = XAERO_USDC;
        p[2] = ITP_USDC;
    }
}
