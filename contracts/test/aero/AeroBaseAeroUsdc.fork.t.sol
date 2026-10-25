// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroChains } from "../../src/aero/AeroChains.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroZap, IAeroZapPool } from "../../src/aero/AeroZap.sol";
import { IAeroGauge } from "../../src/aero/IAero.sol";

/// @notice Base AERO/USDC classic pool with its live gauge. Remote state is read-only; every tx runs in the local fork.
/// AERO_FORK_TESTS=true FOUNDRY_PROFILE=aero forge test --match-path test/aero/AeroBaseAeroUsdc.fork.t.sol
contract AeroBaseAeroUsdcForkTest is Test {
    address constant POOL = 0xF634058dC94e6BF8e828E27621320C423bC8B18E;
    address constant GAUGE = 0xd424BA8ca9d4E278753DE76651a0095451e65cD1;
    address constant AERO = 0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant ALICE = address(0xa11ce);
    address constant BOB = address(0xb0b);
    address constant KEEPER = address(0xcafe);
    address constant TREASURY = address(0xfee);
    AeroFactory factory;
    AeroVault vault;
    AeroZap zap;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_FORK_RPC_URL", string("https://base-rpc.publicnode.com")));
        address[] memory keepers = new address[](1);
        keepers[0] = KEEPER;
        (address stableGauge, address volatileGauge) = AeroChains.gaugeFactories(8453);
        factory = new AeroFactory(
            address(this),
            TREASURY,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            stableGauge,
            volatileGauge,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(8453),
            AeroChains.ROOT_HANDLER,
            keepers
        );
        factory.setDaoFees(1000, 1000);
        vault = AeroVault(
            factory.createVault(
                AeroVault.Config(
                    POOL,
                    GAUGE,
                    AeroChains.rewardToken(8453),
                    address(this),
                    TREASURY,
                    0,
                    100,
                    10,
                    10,
                    "Infinite Aero AERO/USDC",
                    "iaAERO-USDC"
                )
            )
        );
        zap = new AeroZap(address(factory));
        assertEq(vault.token0(), AERO);
        assertEq(vault.token1(), USDC);
        assertEq(vault.rewardTokens(2), address(0), "AERO reward is token0");
    }

    function _fund(address who, uint256 aero, uint256 usdc) private {
        deal(AERO, who, aero);
        deal(USDC, who, usdc);
        vm.startPrank(who);
        IERC20(AERO).approve(address(zap), type(uint256).max);
        IERC20(USDC).approve(address(zap), type(uint256).max);
        IERC20(POOL).approve(address(zap), type(uint256).max);
        IERC20(address(vault)).approve(address(zap), type(uint256).max);
        vm.stopPrank();
    }

    function _usd(uint256 aero, uint256 usdc) private view returns (uint256) {
        (uint256 r0, uint256 r1,) = IAeroZapPool(POOL).getReserves();
        return usdc + aero * r1 / r0;
    }

    function _zapUsdc(address who, uint256 amount) private returns (uint256 shares) {
        uint256 swapAmount = zap.quoteSwapAmount(address(vault), USDC, amount);
        uint256 minOut = IAeroZapPool(POOL).getAmountOut(swapAmount, USDC) * 99 / 100;
        vm.prank(who);
        shares = zap.zapIn(address(vault), USDC, amount, swapAmount, minOut, 1);
    }

    function test_ZapInStakesInGauge() public {
        _fund(ALICE, 0, 1000e6);
        uint256 shares = _zapUsdc(ALICE, 1000e6);
        assertGt(shares, 0);
        assertGt(IAeroGauge(GAUGE).balanceOf(address(vault)), 0);
        assertEq(IERC20(POOL).balanceOf(address(vault)), 0, "all LP staked");
        assertLt(_usd(IERC20(AERO).balanceOf(ALICE), IERC20(USDC).balanceOf(ALICE)), 5e6);
    }

    function test_SecondZapWhileEmissionsPending() public {
        _fund(ALICE, 0, 1000e6);
        _zapUsdc(ALICE, 1000e6);
        vm.warp(block.timestamp + 1 days);
        assertGt(IAeroGauge(GAUGE).earned(address(vault)) + vault.pendingDeferredRewards(), 0, "emissions accrue");
        _fund(BOB, 500e18, 500e6);
        vm.prank(BOB);
        uint256 shares = zap.depositTokens(address(vault), 500e18, 500e6, 1);
        assertGt(shares, 0);
        _fund(BOB, 0, 300e6);
        assertGt(_zapUsdc(BOB, 300e6), 0);
    }

    function test_HarvestCompoundsEmissions() public {
        _fund(ALICE, 0, 1000e6);
        _zapUsdc(ALICE, 1000e6);
        vm.warp(block.timestamp + 3 days);
        uint256 beforeAssets = vault.totalAssets();
        // Sell roughly half of the expected AERO reward into USDC in the same pool, then compound.
        uint256 earned = IAeroGauge(GAUGE).earned(address(vault));
        AeroVault.Swap[] memory swaps;
        if (earned > 1e15) {
            swaps = new AeroVault.Swap[](1);
            uint256 sell = earned * 40 / 100;
            swaps[0] = AeroVault.Swap(POOL, AERO, sell, IAeroZapPool(POOL).getAmountOut(sell, AERO) * 98 / 100);
        }
        vm.prank(KEEPER);
        try vault.harvest(swaps, 1, block.timestamp + 60) returns (uint256 lp) {
            assertGt(lp, 0);
            assertEq(vault.totalAssets(), beforeAssets + lp);
            assertGt(IERC20(AERO).balanceOf(TREASURY), 0, "10% DAO cut");
            assertGt(IERC20(AERO).balanceOf(KEEPER), 0, "1% keeper cut");
        } catch {
            // Base may defer small emissions; then nothing is claimable yet and harvest has nothing to mint.
            assertGt(vault.pendingDeferredRewards(), 0, "harvest only fails when rewards are deferred");
        }
    }

    function test_WithdrawPaths() public {
        _fund(ALICE, 0, 1000e6);
        uint256 shares = _zapUsdc(ALICE, 1000e6);
        vm.warp(block.timestamp + 1 days);
        uint256 half = shares / 2;
        vm.prank(ALICE);
        try zap.zapOut(address(vault), half, USDC, 1) returns (uint256 out) {
            assertGt(out, 400e6);
        } catch (bytes memory err) {
            assertEq(bytes4(err), AeroZap.DeferredRewardsPending.selector);
            // Fallback the UI uses: redeem directly (keeps the deferred credit), then zap the LP.
            vm.startPrank(ALICE);
            uint256 lp = vault.redeem(half, 1, [uint256(0), 0, 0]);
            uint256 out = zap.zapOutLp(address(vault), lp, USDC, 1);
            vm.stopPrank();
            assertGt(out, 400e6);
            assertGt(vault.deferredCredits(ALICE), 0);
        }
        uint256 rest = vault.balanceOf(ALICE);
        vm.startPrank(ALICE);
        uint256 lp2 = vault.redeem(rest, 1, [uint256(0), 0, 0]);
        (uint256 a, uint256 u) = zap.withdrawLpTokens(address(vault), lp2, 1, 1);
        vm.stopPrank();
        assertGt(a, 0);
        assertGt(u, 0);
        assertEq(vault.balanceOf(ALICE), 0);
        assertGt(_usd(IERC20(AERO).balanceOf(ALICE), IERC20(USDC).balanceOf(ALICE)), 985e6);
        assertEq(IERC20(AERO).balanceOf(address(zap)) + IERC20(USDC).balanceOf(address(zap)), 0);
    }
}
