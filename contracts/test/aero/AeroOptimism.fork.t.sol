// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroChains } from "../../src/aero/AeroChains.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroZap, IAeroZapPool } from "../../src/aero/AeroZap.sol";

/// @notice Optimism ITP/USDC classic pool (no gauge yet). Remote state is read-only; every tx runs in the local fork.
/// AERO_FORK_TESTS=true FOUNDRY_PROFILE=aero forge test --match-path test/aero/AeroOptimism.fork.t.sol
contract AeroOptimismForkTest is Test {
    address constant POOL = 0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01;
    address constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address constant USDC = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address constant ALICE = address(0xa11ce);
    address constant BOB = address(0xb0b);
    address constant TRADER = address(0x7ade);
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
        vm.createSelectFork(vm.envOr("AERO_OP_FORK_RPC_URL", string("https://mainnet.optimism.io")));
        address[] memory keepers = new address[](1);
        keepers[0] = KEEPER;
        (address stableGauge, address volatileGauge) = AeroChains.gaugeFactories(10);
        factory = new AeroFactory(
            address(this),
            TREASURY,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            stableGauge,
            volatileGauge,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(10),
            address(0),
            keepers
        );
        factory.setDaoFees(1000, 1000);
        vault = AeroVault(
            factory.createVault(
                AeroVault.Config(
                    POOL,
                    address(0),
                    AeroChains.rewardToken(10),
                    address(this),
                    TREASURY,
                    0,
                    100,
                    10,
                    10,
                    "Infinite Aero ITP/USDC",
                    "iaITP-USDC"
                )
            )
        );
        zap = new AeroZap(address(factory));
        assertEq(vault.token0(), ITP);
        assertEq(vault.token1(), USDC);
    }

    function _fund(address who, uint256 itp, uint256 usdc) private {
        deal(ITP, who, itp);
        deal(USDC, who, usdc);
        vm.startPrank(who);
        IERC20(ITP).approve(address(zap), type(uint256).max);
        IERC20(USDC).approve(address(zap), type(uint256).max);
        IERC20(address(vault)).approve(address(zap), type(uint256).max);
        vm.stopPrank();
    }

    function _usdValue(uint256 itp, uint256 usdc) private view returns (uint256) {
        (uint256 r0, uint256 r1,) = IAeroZapPool(POOL).getReserves();
        return usdc + itp * r1 / r0;
    }

    function _zapUsdc(address who, uint256 amount) private returns (uint256 shares) {
        uint256 swapAmount = zap.quoteSwapAmount(address(vault), USDC, amount);
        uint256 minOut = IAeroZapPool(POOL).getAmountOut(swapAmount, USDC) * 99 / 100;
        vm.prank(who);
        shares = zap.zapIn(address(vault), USDC, amount, swapAmount, minOut, 1);
    }

    function _generateFees() private {
        _fund(TRADER, 400e18, 4e6);
        vm.startPrank(TRADER);
        for (uint256 i; i < 4; ++i) {
            uint256 out = IAeroZapPool(POOL).getAmountOut(1e6, USDC);
            IERC20(USDC).transfer(POOL, 1e6);
            IAeroZapPool(POOL).swap(out, 0, TRADER, "");
            out = IAeroZapPool(POOL).getAmountOut(100e18, ITP);
            IERC20(ITP).transfer(POOL, 100e18);
            IAeroZapPool(POOL).swap(0, out, TRADER, "");
        }
        vm.stopPrank();
    }

    function test_LpDepositAndRedeem() public {
        deal(POOL, ALICE, 1e12);
        vm.startPrank(ALICE);
        IERC20(POOL).approve(address(vault), 1e12);
        uint256 shares = vault.deposit(1e12, 1, [uint256(0), 0, 0]);
        vault.redeem(shares, 1, [uint256(0), 0, 0]);
        vm.stopPrank();
        // 0.1% entry, 0.1% exit, 1000 dead shares on first deposit.
        assertApproxEqRel(IERC20(POOL).balanceOf(ALICE), 1e12 * 998 / 1000, 0.001e18);
        assertGt(IERC20(POOL).balanceOf(TREASURY), 0);
    }

    function test_ZapInUsdcLeavesLittleDust() public {
        _fund(ALICE, 0, 5e6);
        uint256 shares = _zapUsdc(ALICE, 5e6);
        assertGt(shares, 0);
        assertEq(vault.balanceOf(ALICE), shares);
        assertLt(_usdValue(IERC20(ITP).balanceOf(ALICE), IERC20(USDC).balanceOf(ALICE)), 5e6 / 100);
        assertEq(IERC20(USDC).balanceOf(address(zap)), 0);
        assertEq(IERC20(ITP).balanceOf(address(zap)), 0);
        assertEq(IERC20(POOL).balanceOf(address(zap)), 0);
    }

    function test_ZapInItp() public {
        _fund(ALICE, 300e18, 0);
        uint256 swapAmount = zap.quoteSwapAmount(address(vault), ITP, 300e18);
        vm.prank(ALICE);
        uint256 shares = zap.zapIn(address(vault), ITP, 300e18, swapAmount, 1, 1);
        assertGt(shares, 0);
        assertLt(_usdValue(IERC20(ITP).balanceOf(ALICE), IERC20(USDC).balanceOf(ALICE)), 30_000);
    }

    function test_DepositTokensRefundsExcess() public {
        _fund(ALICE, 500e18, 1e6);
        vm.prank(ALICE);
        uint256 shares = zap.depositTokens(address(vault), 500e18, 1e6, 1);
        assertGt(shares, 0);
        // ~171 ITP/USDC: 1 USDC pairs with ~171 ITP, the rest is refunded.
        assertGt(IERC20(ITP).balanceOf(ALICE), 300e18);
        assertEq(IERC20(USDC).balanceOf(ALICE), 0);
    }

    function test_HarvestCompoundsFeesAndPaysDaoAndKeeper() public {
        _fund(ALICE, 0, 5e6);
        _zapUsdc(ALICE, 5e6);
        _generateFees();
        uint256 beforeAssets = vault.totalAssets();
        (uint256 p0, uint256 p1) = IAeroZapPool(POOL).pendingFees(address(vault));
        assertGt(p0 + p1, 0);
        vm.prank(KEEPER);
        uint256 lp = vault.harvest(new AeroVault.Swap[](0), 1, block.timestamp + 60);
        assertGt(lp, 0);
        assertEq(vault.totalAssets(), beforeAssets + lp);
        assertGt(IERC20(USDC).balanceOf(TREASURY), 0);
        assertGt(IERC20(USDC).balanceOf(KEEPER), 0);
        // Keeper gets 1% of the 90% left after the 10% DAO cut.
        assertApproxEqRel(IERC20(USDC).balanceOf(KEEPER) * 1000, IERC20(USDC).balanceOf(TREASURY) * 90, 0.05e18);
    }

    function test_SecondZapWhileBasketHoldsFees() public {
        _fund(ALICE, 0, 5e6);
        _zapUsdc(ALICE, 5e6);
        _generateFees();
        _fund(BOB, 0, 3e6);
        uint256 shares = _zapUsdc(BOB, 3e6);
        uint256[3] memory basket = vault.basketBalances();
        assertGt(basket[0] + basket[1], 0, "fees sit in basket until harvest");
        assertGt(shares, 0);
        assertLt(_usdValue(IERC20(ITP).balanceOf(BOB), IERC20(USDC).balanceOf(BOB)), 3e6 / 20);
    }

    function test_WithdrawTokensAndZapOut() public {
        _fund(ALICE, 0, 5e6);
        uint256 shares = _zapUsdc(ALICE, 5e6);
        _generateFees();
        vm.prank(ALICE);
        (uint256 out0, uint256 out1) = zap.withdrawTokens(address(vault), shares / 2, 1, 1);
        assertGt(out0, 0);
        assertGt(out1, 0);
        uint256 usdcBefore = IERC20(USDC).balanceOf(ALICE);
        uint256 rest = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 got = zap.zapOut(address(vault), rest, USDC, 1);
        assertEq(IERC20(USDC).balanceOf(ALICE) - usdcBefore, got);
        assertEq(vault.balanceOf(ALICE), 0);
        assertGt(_usdValue(IERC20(ITP).balanceOf(ALICE), IERC20(USDC).balanceOf(ALICE)), 5e6 * 90 / 100);
        assertEq(IERC20(USDC).balanceOf(address(zap)) + IERC20(ITP).balanceOf(address(zap)), 0);
    }

    function test_ZapOutRespectsMinOut() public {
        _fund(ALICE, 0, 5e6);
        uint256 shares = _zapUsdc(ALICE, 5e6);
        vm.prank(ALICE);
        vm.expectRevert(AeroZap.Slippage.selector);
        zap.zapOut(address(vault), shares, USDC, 10e6);
    }

    function test_RejectsUnknownVaultAndToken() public {
        vm.expectRevert(AeroZap.InvalidVault.selector);
        zap.depositTokens(POOL, 1, 1, 1);
        vm.expectRevert(AeroZap.InvalidToken.selector);
        zap.zapIn(address(vault), address(0xdead), 2, 1, 1, 1);
    }
}
