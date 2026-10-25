// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import { Test, console2 } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroZap, IAeroZapPool } from "../../src/aero/AeroZap.sol";

/// Live-fork lifecycle of the deployed ITP/wstETH Aero vault: deposit -> rewards -> harvest -> withdraw.
contract AeroOptimismLiveCycleForkTest is Test {
    AeroVault constant V = AeroVault(0xA15a7219EE74630AA7B5B0413C3082f2b775220D);
    AeroZap constant Z = AeroZap(0xb797413B59882f42B1Ceb18214911d6eA189c561);
    address constant POOL = 0x76817cf226aa94b164295AED4f62e7a1EEd41d36;
    address constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address constant WST = 0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb;
    address constant KEEPER = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
    address constant OWNER = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address alice = address(0xa11ce);
    address bob = address(0xb0b);
    address eve = address(0xe5e);

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_OP_FORK_RPC_URL", string("https://mainnet.optimism.io")));
    }

    function _zapIn(address who, address token, uint256 amt) internal returns (uint256 sh) {
        deal(token, who, amt);
        vm.startPrank(who);
        IERC20(token).approve(address(Z), amt);
        uint256 s = Z.quoteSwapAmount(address(V), token, amt);
        sh = Z.zapIn(address(V), token, amt, s, IAeroZapPool(POOL).getAmountOut(s, token) * 99 / 100, 1);
        vm.stopPrank();
    }

    function test_fullLifecycle() public {
        uint256 a = _zapIn(alice, WST, 0.002 ether);
        uint256 b = _zapIn(bob, ITP, 5000 ether);
        uint256 lpPerShareBefore = V.totalAssets() * 1e18 / V.totalSupply();
        // simulate accrued rewards (pool fees) landing in the vault
        deal(ITP, address(V), IERC20(ITP).balanceOf(address(V)) + 200 ether);
        deal(WST, address(V), IERC20(WST).balanceOf(address(V)) + 0.0004 ether);
        // non-keeper cannot harvest
        vm.prank(eve);
        vm.expectRevert(AeroVault.UnauthorizedKeeper.selector);
        V.harvest(new AeroVault.Swap[](0), 1, block.timestamp + 60);
        vm.prank(KEEPER);
        uint256 liq = V.harvest(new AeroVault.Swap[](0), 1, block.timestamp + 60);
        uint256 lpPerShareAfter = V.totalAssets() * 1e18 / V.totalSupply();
        console2.log("harvest LP minted", liq);
        assertGt(lpPerShareAfter, lpPerShareBefore, "compounding raised LP per share");
        // owner cannot freeze or seize: no pause, fees capped
        vm.prank(OWNER);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        V.setFees(OWNER, 1001, 50, 10, 10);
        vm.prank(OWNER);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        V.setFees(OWNER, 1000, 50, 201, 10);
        // both exit fully
        vm.startPrank(alice);
        IERC20(address(V)).approve(address(Z), a);
        uint256 outA = Z.zapOut(address(V), a, WST, 1);
        vm.stopPrank();
        vm.startPrank(bob);
        IERC20(address(V)).approve(address(Z), b);
        (uint256 b0, uint256 b1) = Z.withdrawTokens(address(V), b, 1, 1);
        vm.stopPrank();
        console2.log("alice wstETH out (in 0.002)", outA);
        console2.log("bob ITP out / wstETH out", b0, b1);
        assertEq(V.balanceOf(alice) + V.balanceOf(bob), 0);
        assertEq(
            IERC20(ITP).balanceOf(address(Z)) + IERC20(WST).balanceOf(address(Z)) + IERC20(POOL).balanceOf(address(Z)),
            0,
            "zap holds nothing"
        );
        // only DEAD shares remain
        assertEq(V.totalSupply(), V.balanceOf(address(0xdead)));
    }

    address constant XAERO = 0xbdEaeA5205d16f34Cb40038052d91235D87B4C54;

    /// Finding ITP-AERO-01: 1 wei of xAERO donated to the vault makes every later zap deposit revert.
    function test_xAeroDustBlocksZapDeposits() public {
        _zapIn(alice, WST, 0.002 ether); // first deposit works
        deal(XAERO, eve, 1);
        vm.prank(eve); // 1 wei griefing donation
        IERC20(XAERO).transfer(address(V), 1);
        deal(WST, bob, 0.001 ether);
        vm.startPrank(bob);
        IERC20(WST).approve(address(Z), 0.001 ether);
        uint256 s = Z.quoteSwapAmount(address(V), WST, 0.001 ether);
        uint256 minOut = IAeroZapPool(POOL).getAmountOut(s, WST) * 99 / 100;
        vm.expectRevert();
        Z.zapIn(address(V), WST, 0.001 ether, s, minOut, 1);
        vm.stopPrank();
        // redeem still works for alice (no lock), and the dust never fully leaves (DEAD shares keep a slice)
        uint256 a = V.balanceOf(alice);
        vm.prank(alice);
        V.redeem(a, 1, [uint256(0), 0, 0]);
        assertEq(V.balanceOf(alice), 0);
    }
}
