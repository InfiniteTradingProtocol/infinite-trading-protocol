// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroZap, IAeroZapPool } from "../../src/aero/AeroZap.sol";

contract AeroOptimismWstEthForkTest is Test {
    address constant FACTORY = 0x8f378C71368Fb50084c2A540592502F0b1Ef8787;
    address constant VAULT = 0xA15a7219EE74630AA7B5B0413C3082f2b775220D;
    address constant POOL = 0x76817cf226aa94b164295AED4f62e7a1EEd41d36;
    address constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address constant WSTETH = 0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb;
    address constant ALICE = address(0xa11ce);
    AeroZap zap;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_OP_FORK_RPC_URL", string("https://mainnet.optimism.io")));
        zap = AeroZap(0xb797413B59882f42B1Ceb18214911d6eA189c561);
        assertEq(address(zap.factory()), FACTORY);
        assertEq(AeroVault(VAULT).asset(), POOL);
        assertEq(AeroVault(VAULT).token0(), ITP);
        assertEq(AeroVault(VAULT).token1(), WSTETH);
    }

    function _deposit(address token, uint256 amount) private returns (uint256 shares) {
        deal(token, ALICE, amount);
        vm.startPrank(ALICE);
        IERC20(token).approve(address(zap), amount);
        uint256 swap = zap.quoteSwapAmount(VAULT, token, amount);
        uint256 minOut = IAeroZapPool(POOL).getAmountOut(swap, token) * 99 / 100;
        shares = zap.zapIn(VAULT, token, amount, swap, minOut, 1);
        IERC20(VAULT).approve(address(zap), shares);
        vm.stopPrank();
        assertGt(shares, 0);
        assertEq(IERC20(ITP).balanceOf(address(zap)), 0);
        assertEq(IERC20(WSTETH).balanceOf(address(zap)), 0);
        assertEq(IERC20(POOL).balanceOf(address(zap)), 0);
    }

    function test_WstEthInAndOut() public {
        uint256 shares = _deposit(WSTETH, 0.001 ether);
        uint256 beforeBalance = IERC20(WSTETH).balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 received = zap.zapOut(VAULT, shares, WSTETH, 1);
        assertGt(received, 0.0009 ether);
        assertEq(IERC20(WSTETH).balanceOf(ALICE), beforeBalance + received);
        assertEq(IERC20(VAULT).balanceOf(ALICE), 0);
    }

    function test_ItpInAndBothTokensOut() public {
        uint256 shares = _deposit(ITP, 100 ether);
        vm.prank(ALICE);
        (uint256 amount0, uint256 amount1) = zap.withdrawTokens(VAULT, shares, 1, 1);
        assertGt(amount0, 0);
        assertGt(amount1, 0);
        assertEq(IERC20(VAULT).balanceOf(ALICE), 0);
    }

    function test_SlippageRevertsAtomically() public {
        uint256 shares = _deposit(WSTETH, 0.001 ether);
        vm.prank(ALICE);
        vm.expectRevert(AeroZap.Slippage.selector);
        zap.zapOut(VAULT, shares, WSTETH, 1 ether);
        assertEq(IERC20(VAULT).balanceOf(ALICE), shares);
    }

    function test_BothTokensInAndLpOut() public {
        (uint256 r0, uint256 r1,) = IAeroZapPool(POOL).getReserves();
        uint256 amount0 = 100 ether;
        uint256 amount1 = amount0 * r1 / r0 + 1;
        deal(ITP, ALICE, amount0);
        deal(WSTETH, ALICE, amount1);
        vm.startPrank(ALICE);
        IERC20(ITP).approve(address(zap), amount0);
        IERC20(WSTETH).approve(address(zap), amount1);
        uint256 shares = zap.depositTokens(VAULT, amount0, amount1, 1);
        uint256 lp = AeroVault(VAULT).redeem(shares, 1, [uint256(0), 0, 0]);
        vm.stopPrank();
        assertGt(lp, 0);
        assertEq(IERC20(POOL).balanceOf(ALICE), lp);
        assertEq(IERC20(VAULT).balanceOf(ALICE), 0);
    }
}
