// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroZap, IAeroZapPool } from "../../src/aero/AeroZap.sol";
import { IAeroGauge } from "../../src/aero/IAero.sol";

contract AeroBaseReplacementForkTest is Test {
    address constant FACTORY = 0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB;
    address constant DAO = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant POOL = 0xF634058dC94e6BF8e828E27621320C423bC8B18E;
    address constant GAUGE = 0xd424BA8ca9d4E278753DE76651a0095451e65cD1;
    address constant AERO = 0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant ALICE = address(0xa11ce);
    AeroVault vault;
    AeroZap zap;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_FORK_RPC_URL", string("https://base-rpc.publicnode.com")));
        if (vm.envOr("AERO_TEST_DEPLOYED_REPLACEMENT", false)) {
            vault = AeroVault(0x8a69C3b16FECd6865210858D3E67B948BF71395f);
            zap = AeroZap(0x64Bf868a02CfA1bce82a0711eB090E28a9dc8688);
            return;
        }
        vault = AeroVault(
            AeroFactory(FACTORY)
                .createVault(
                    AeroVault.Config(
                        POOL, GAUGE, AERO, address(this), DAO, 0, 100, 10, 10, "Infinite Aero AERO/USDC", "iaAERO-USDC"
                    )
                )
        );
        zap = new AeroZap(FACTORY);
    }

    function _deposit(address token, uint256 amount) private returns (uint256 shares) {
        deal(token, ALICE, amount);
        vm.startPrank(ALICE);
        IERC20(token).approve(address(zap), amount);
        uint256 swap = zap.quoteSwapAmount(address(vault), token, amount);
        uint256 minOut = IAeroZapPool(POOL).getAmountOut(swap, token) * 99 / 100;
        shares = zap.zapIn(address(vault), token, amount, swap, minOut, 1);
        IERC20(address(vault)).approve(address(zap), shares);
        IERC20(POOL).approve(address(zap), type(uint256).max);
        vm.stopPrank();
        assertGt(shares, 0);
        assertGt(IAeroGauge(GAUGE).balanceOf(address(vault)), 0);
        _assertNoDust();
    }

    function _assertNoDust() private view {
        assertEq(IERC20(AERO).balanceOf(address(zap)), 0);
        assertEq(IERC20(USDC).balanceOf(address(zap)), 0);
        assertEq(IERC20(POOL).balanceOf(address(zap)), 0);
    }

    function test_NewFactoryAndOwnership() public {
        assertTrue(AeroFactory(FACTORY).isVault(address(vault)));
        assertEq(address(vault.automationFactory()), FACTORY);
        assertEq(address(zap.factory()), FACTORY);
        assertEq(AeroFactory(FACTORY).dao(), DAO);
        assertEq(AeroFactory(FACTORY).daoRewardBps(), 200);
        assertTrue(vault.isKeeper(AeroFactory(FACTORY).defaultKeeper()));
        address priorOwner = vault.owner();
        vm.prank(priorOwner);
        vault.transferOwnership(DAO);
        assertEq(vault.pendingOwner(), DAO);
        assertEq(vault.owner(), priorOwner);
        vm.prank(DAO);
        vault.acceptOwnership();
        assertEq(vault.owner(), DAO);
        vm.expectRevert();
        vault.setStaking(false);
    }

    function test_UsdcInAndOut() public {
        uint256 shares = _deposit(USDC, 100e6);
        uint256 beforeBalance = IERC20(USDC).balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 received = zap.zapOut(address(vault), shares, USDC, 98e6);
        assertEq(IERC20(USDC).balanceOf(ALICE), beforeBalance + received);
        assertEq(vault.balanceOf(ALICE), 0);
        _assertNoDust();
    }

    function test_AeroInAndBothTokensOut() public {
        uint256 shares = _deposit(AERO, 100 ether);
        vm.prank(ALICE);
        (uint256 a, uint256 u) = zap.withdrawTokens(address(vault), shares, 1, 1);
        assertGt(a, 0);
        assertGt(u, 0);
        assertEq(vault.balanceOf(ALICE), 0);
        _assertNoDust();
    }

    function test_BothTokensInAndLpOut() public {
        (uint256 r0, uint256 r1,) = IAeroZapPool(POOL).getReserves();
        uint256 amount0 = 100 ether;
        uint256 amount1 = amount0 * r1 / r0 + 1;
        deal(AERO, ALICE, amount0);
        deal(USDC, ALICE, amount1);
        vm.startPrank(ALICE);
        IERC20(AERO).approve(address(zap), amount0);
        IERC20(USDC).approve(address(zap), amount1);
        uint256 shares = zap.depositTokens(address(vault), amount0, amount1, 1);
        uint256 lp = vault.redeem(shares, 1, [uint256(0), 0, 0]);
        vm.stopPrank();
        assertGt(lp, 0);
        assertEq(vault.balanceOf(ALICE), 0);
        _assertNoDust();
    }

    function test_DeferredWithdrawalPreservesUserCredit() public {
        uint256 shares = _deposit(USDC, 100e6);
        vm.warp(block.timestamp + 1 days);
        vm.prank(ALICE);
        try zap.zapOut(address(vault), shares, USDC, 1) returns (uint256 out) {
            assertGt(out, 98e6);
        } catch (bytes memory reason) {
            assertEq(bytes4(reason), AeroZap.DeferredRewardsPending.selector);
            vm.startPrank(ALICE);
            uint256 lp = vault.redeem(shares, 1, [uint256(0), 0, 0]);
            uint256 out = zap.zapOutLp(address(vault), lp, USDC, 1);
            vm.stopPrank();
            assertGt(out, 98e6);
            assertGt(vault.deferredCredits(ALICE), 0);
            assertEq(vault.deferredCredits(address(zap)), 0);
        }
        assertEq(vault.balanceOf(ALICE), 0);
        _assertNoDust();
    }

    function test_WrongFactoryZapRejectsReplacement() public {
        AeroZap oldZap = AeroZap(0xe06e1bd3B29b999C027DcE40bed147F97D3299e2);
        vm.expectRevert(AeroZap.InvalidVault.selector);
        oldZap.quoteSwapAmount(address(vault), USDC, 100e6);
    }

    function test_SlippageRevertsWithoutBurningShares() public {
        uint256 shares = _deposit(USDC, 100e6);
        vm.prank(ALICE);
        vm.expectRevert(AeroZap.Slippage.selector);
        zap.zapOut(address(vault), shares, USDC, 1000e6);
        assertEq(vault.balanceOf(ALICE), shares);
    }
}
