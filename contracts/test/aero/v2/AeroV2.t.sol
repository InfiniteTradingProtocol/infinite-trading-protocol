// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { AeroTwapOracle } from "../../../src/aero/v2/AeroTwapOracle.sol";
import { AeroFactoryV2 } from "../../../src/aero/v2/AeroFactoryV2.sol";
import { AeroVaultV2 } from "../../../src/aero/v2/AeroVaultV2.sol";
import { AeroZapV2 } from "../../../src/aero/v2/AeroZapV2.sol";
import {
    V2Token,
    V2PoolMock,
    V2PoolFactoryMock,
    V2GaugeFactoryMock,
    V2VoterMock,
    V2GaugeMock
} from "./AeroV2Mocks.sol";

contract AeroV2Test is Test {
    address dao = makeAddr("dao");
    address treasury = makeAddr("treasury");
    address keeper = makeAddr("keeper");
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address eve = makeAddr("eve");

    V2Token itp;
    V2Token weth;
    V2Token usdc;
    V2Token xaero;
    V2PoolMock pool;
    V2PoolMock rewardPool; // xAERO/USDC
    V2PoolMock bridgePool; // ITP/USDC
    V2PoolFactoryMock stableF;
    V2PoolFactoryMock volatileF;
    V2GaugeFactoryMock gaugeF;
    V2VoterMock voter;
    AeroTwapOracle oracle;
    AeroFactoryV2 factory;
    AeroVaultV2 vault;
    AeroZapV2 zap;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        itp = new V2Token("ITP");
        weth = new V2Token("WETH");
        usdc = new V2Token("USDC");
        xaero = new V2Token("xAERO");
        pool = _pool(itp, weth, 1_000_000 ether, 100 ether);
        rewardPool = _pool(xaero, usdc, 100_000 ether, 100_000 ether);
        bridgePool = _pool(itp, usdc, 1_000_000 ether, 50_000 ether);
        stableF = new V2PoolFactoryMock();
        volatileF = new V2PoolFactoryMock();
        volatileF.allow(address(pool));
        volatileF.allow(address(rewardPool));
        volatileF.allow(address(bridgePool));
        gaugeF = new V2GaugeFactoryMock();
        voter = new V2VoterMock();
        oracle = new AeroTwapOracle();
        factory = new AeroFactoryV2(
            dao,
            treasury,
            address(stableF),
            address(volatileF),
            address(gaugeF),
            address(gaugeF),
            address(voter),
            address(xaero),
            address(oracle),
            keeper
        );
        zap = new AeroZapV2(address(factory));
        vm.prank(owner);
        vault = AeroVaultV2(factory.createVault(address(pool), address(0), 0, "Infinite ITP-WETH", "acITP-WETH"));
    }

    // ── helpers
    // ──────────────────────────────────────────────────────────────

    function _pool(V2Token a, V2Token b, uint256 x, uint256 y) internal returns (V2PoolMock p) {
        p = new V2PoolMock(address(a), address(b));
        a.mint(address(p), x);
        b.mint(address(p), y);
        p.mint(address(this));
    }

    function _lp(address user, uint256 amountItp) internal returns (uint256 lp) {
        (uint256 r0, uint256 r1,) = pool.getReserves();
        uint256 amountWeth = amountItp * r1 / r0;
        itp.mint(address(pool), amountItp);
        weth.mint(address(pool), amountWeth);
        lp = pool.mint(user);
    }

    function _deposit(address user, uint256 amountItp) internal returns (uint256 shares) {
        uint256 lp = _lp(user, amountItp);
        vm.startPrank(user);
        pool.approve(address(vault), lp);
        shares = vault.deposit(lp, 1, user);
        vm.stopPrank();
    }

    /// Seed TWAP history and age it past MIN_WINDOW.
    function _seedOracle() internal {
        oracle.update(address(pool));
        oracle.update(address(rewardPool));
        oracle.update(address(bridgePool));
        vm.warp(block.timestamp + 31 minutes);
    }

    function _lpPerShare() internal view returns (uint256) {
        return vault.totalAssets() * 1e18 / vault.totalSupply();
    }

    // ── factory / access control
    // ─────────────────────────────────────────────

    function test_Defaults() public view {
        assertEq(factory.daoFeeBps(), 200);
        assertEq(vault.strategistBps(), 0);
        assertEq(vault.keeperBps(), 50);
        assertEq(vault.exitBps(), 0);
        assertEq(vault.owner(), owner);
        assertEq(vault.strategist(), owner);
        assertTrue(factory.isKeeper(keeper));
        assertEq(factory.defaultKeeper(), keeper);
        assertFalse(vault.openHarvest());
        assertTrue(factory.isVault(address(vault)));
        assertFalse(factory.isOfficial(address(vault)));
        assertEq(vault.gauge(), address(0));
    }

    function test_AnyoneLaunchesOnlyDaoMarksOfficial() public {
        vm.prank(eve);
        address v = factory.createVault(address(pool), eve, 1000, "Fake", "FAKE");
        assertEq(AeroVaultV2(v).owner(), eve);
        vm.prank(eve);
        vm.expectRevert(AeroFactoryV2.OnlyDao.selector);
        factory.setOfficial(v, true);
        vm.prank(dao);
        factory.setOfficial(address(vault), true);
        assertTrue(factory.isOfficial(address(vault)));
        vm.prank(dao);
        vm.expectRevert(AeroFactoryV2.InvalidConfig.selector);
        factory.setOfficial(eve, true);
    }

    function test_CannotLaunchOnUnknownPool() public {
        V2PoolMock fake = new V2PoolMock(address(itp), address(weth));
        vm.expectRevert(AeroFactoryV2.InvalidPool.selector);
        factory.createVault(address(fake), address(0), 0, "x", "x");
    }

    function test_ImplementationAndClonesCannotBeReinitialized() public {
        AeroVaultV2 impl = AeroVaultV2(factory.implementation());
        vm.expectRevert();
        impl.initialize(address(pool), eve, eve, 0, "x", "x");
        vm.prank(address(factory));
        vm.expectRevert();
        impl.initialize(address(pool), eve, eve, 0, "x", "x");
        vm.expectRevert();
        vault.initialize(address(pool), eve, eve, 0, "x", "x");
    }

    function test_DaoManagesKeepersFeesPoolsTreasury() public {
        address k2 = makeAddr("k2");
        vm.startPrank(eve);
        vm.expectRevert(AeroFactoryV2.OnlyDao.selector);
        factory.setKeeper(k2, true);
        vm.expectRevert(AeroFactoryV2.OnlyDao.selector);
        factory.setDaoFee(0);
        vm.expectRevert(AeroFactoryV2.OnlyDao.selector);
        factory.setApprovedPool(address(rewardPool), true);
        vm.expectRevert(AeroFactoryV2.OnlyDao.selector);
        factory.setTreasury(eve);
        vm.stopPrank();
        vm.startPrank(dao);
        factory.setKeeper(k2, true);
        factory.setDefaultKeeper(k2);
        factory.setKeeper(keeper, false); // old default keeper is now removable
        vm.expectRevert(AeroFactoryV2.InvalidConfig.selector);
        factory.setKeeper(k2, false); // current default keeper is protected
        vm.expectRevert(AeroFactoryV2.InvalidConfig.selector);
        factory.setDaoFee(1001);
        factory.setDaoFee(1000);
        vm.expectRevert(AeroFactoryV2.InvalidPool.selector);
        factory.setApprovedPool(eve, true);
        vm.stopPrank();
        assertFalse(vault.isKeeper(keeper));
        assertTrue(vault.isKeeper(k2));
    }

    function test_OwnerFeeAndRiskBounds() public {
        vm.startPrank(owner);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setFees(owner, 1001, 50, 0);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setFees(owner, 0, 201, 0);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setFees(owner, 0, 50, 101);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setFees(address(0), 0, 50, 0);
        vault.setFees(owner, 1000, 200, 100);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setRisk(5, 200, 50);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setRisk(300, 501, 50);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setRisk(300, 200, 501);
        vm.stopPrank();
        vm.prank(eve);
        vm.expectRevert();
        vault.setFees(eve, 1000, 200, 100);
    }

    // ── deposits / redeems
    // ───────────────────────────────────────────────────

    function test_LpRoundTripWithDeadShares() public {
        uint256 lp = _lp(alice, 1000 ether);
        vm.startPrank(alice);
        pool.approve(address(vault), lp);
        uint256 shares = vault.deposit(lp, lp - 1000, alice);
        assertEq(shares, lp - 1000);
        assertEq(vault.balanceOf(vault.DEAD()), 1000);
        uint256 out = vault.redeem(shares, shares, alice);
        vm.stopPrank();
        assertEq(out, shares);
        assertEq(pool.balanceOf(alice), shares);
    }

    function test_DepositTokensAndRedeemTokens() public {
        itp.mint(alice, 1000 ether);
        weth.mint(alice, 1 ether); // more WETH than the ratio needs: only the matched amount is pulled
        vm.startPrank(alice);
        itp.approve(address(vault), type(uint256).max);
        weth.approve(address(vault), type(uint256).max);
        (uint256 shares, uint256 used0, uint256 used1) = vault.depositTokens(1000 ether, 1 ether, 1, alice);
        assertEq(used0, 1000 ether);
        assertEq(used1, 0.1 ether);
        assertEq(weth.balanceOf(alice), 0.9 ether);
        (uint256 a0, uint256 a1) = vault.redeemTokens(shares, 1, 1, alice);
        vm.stopPrank();
        assertApproxEqRel(a0, 1000 ether, 1e15);
        assertApproxEqRel(a1, 0.1 ether, 1e15);
        assertEq(itp.balanceOf(address(vault)) + weth.balanceOf(address(vault)), 0);
    }

    function test_MinSharesAndMinOutProtect() public {
        uint256 lp = _lp(alice, 1000 ether);
        vm.startPrank(alice);
        pool.approve(address(vault), lp);
        vm.expectRevert(AeroVaultV2.Slippage.selector);
        vault.deposit(lp, lp, alice);
        uint256 shares = vault.deposit(lp, 1, alice);
        vm.expectRevert(AeroVaultV2.Slippage.selector);
        vault.redeem(shares, shares + 1, alice);
        vm.stopPrank();
    }

    function test_ExitFeeStaysWithHolders() public {
        vm.prank(owner);
        vault.setFees(owner, 0, 50, 100);
        uint256 a = _deposit(alice, 1000 ether);
        _deposit(bob, 1000 ether);
        uint256 before = _lpPerShare();
        vm.prank(alice);
        uint256 out = vault.redeem(a, 1, alice);
        assertEq(out, a - a / 100);
        assertGt(_lpPerShare(), before);
    }

    function test_DustDonationsDoNotBlockDeposits() public {
        _deposit(alice, 1000 ether);
        xaero.mint(address(vault), 1);
        itp.mint(address(vault), 1);
        weth.mint(address(vault), 1);
        _deposit(bob, 1000 ether); // v1 reverted here (basket pull); v2 has no basket
        assertGt(vault.balanceOf(bob), 0);
    }

    // ── harvest / fees
    // ───────────────────────────────────────────────────────

    function test_HarvestClosedByDefaultOpenByOwner() public {
        _deposit(alice, 1000 ether);
        vm.prank(eve);
        vm.expectRevert(AeroVaultV2.Unauthorized.selector);
        vault.harvest(0);
        vm.prank(owner);
        vault.setKeeper(eve, true);
        vm.prank(eve);
        vault.harvest(0);
        vm.prank(owner);
        vault.setKeeper(eve, false);
        vm.prank(bob);
        vm.expectRevert(AeroVaultV2.Unauthorized.selector);
        vault.harvest(0);
        vm.prank(owner);
        vault.setOpenHarvest(true);
        vm.prank(bob);
        vault.harvest(0);
    }

    function test_FeesAreIndependentShares() public {
        vm.prank(owner);
        vault.setFees(owner, 1000, 50, 0);
        _deposit(alice, 1000 ether);
        itp.mint(address(pool), 10_000 ether);
        pool.addFees(address(vault), 10_000 ether, 0);
        vm.prank(keeper);
        vault.harvest(0);
        assertEq(vault.daoOwed(address(itp)), 200 ether); // 2% of gross
        assertEq(vault.feesOwed(owner, address(itp)), 1000 ether); // 10% of gross
        assertEq(vault.feesOwed(keeper, address(itp)), 50 ether); // 0.5% of gross
        assertEq(vault.reservedFees(address(itp)), 1250 ether);
        vm.prank(eve);
        vault.payDao(address(itp));
        assertEq(itp.balanceOf(treasury), 200 ether);
        vault.claimFees(owner, address(itp));
        assertEq(itp.balanceOf(owner), 1000 ether);
        assertEq(vault.reservedFees(address(itp)), 50 ether);
    }

    function test_BlockedStrategistCannotFreezeRedeem() public {
        V2Token usdcLike = new V2Token("USDC");
        V2PoolMock p = _pool(itp, usdcLike, 1_000_000 ether, 50_000 ether);
        volatileF.allow(address(p));
        vm.prank(owner);
        AeroVaultV2 v = AeroVaultV2(factory.createVault(address(p), address(0), 1000, "x", "x"));
        usdcLike.block_(owner, true); // strategist blacklisted by the token
        itp.mint(address(p), 1000 ether);
        usdcLike.mint(address(p), 50 ether);
        uint256 lp = p.mint(alice);
        vm.startPrank(alice);
        p.approve(address(v), lp);
        uint256 shares = v.deposit(lp, 1, alice);
        vm.stopPrank();
        usdcLike.mint(address(p), 100 ether);
        p.addFees(address(v), 0, 100 ether);
        vm.prank(keeper);
        v.harvest(0); // fees accrue instead of being pushed
        vm.prank(alice);
        v.redeem(shares, 1, alice);
        assertEq(p.balanceOf(alice), shares);
        assertEq(v.feesOwed(owner, address(usdcLike)), 10 ether);
    }

    function test_NoTwapMeansNoSwapButFeesStillCharged() public {
        _deposit(alice, 1000 ether);
        itp.mint(address(pool), 1000 ether);
        pool.addFees(address(vault), 1000 ether, 0);
        vm.prank(keeper);
        uint256 liq = vault.harvest(0);
        assertEq(liq, 0);
        assertEq(vault.daoOwed(address(itp)), 20 ether);
        vm.prank(keeper);
        vm.expectRevert(AeroVaultV2.Slippage.selector);
        vault.harvest(1);
    }

    function test_HarvestCompoundsAfterTwapSeeded() public {
        _deposit(alice, 1000 ether);
        _deposit(bob, 1000 ether);
        _seedOracle();
        uint256 before = _lpPerShare();
        itp.mint(address(pool), 2000 ether);
        weth.mint(address(pool), 0.1 ether);
        pool.addFees(address(vault), 2000 ether, 0.1 ether);
        vm.prank(keeper);
        uint256 liq = vault.harvest(1);
        assertGt(liq, 0);
        assertEq(_lpPerShare(), before); // locked at first
        vm.warp(block.timestamp + 12 hours);
        assertGt(_lpPerShare(), before);
        // only fee reserves (plus rounding dust) remain as tokens
        assertLe(vault.freeBalance(address(itp)), 50 ether);
    }

    function test_ManipulatedSpotSkipsCompounding() public {
        _deposit(alice, 1000 ether);
        _seedOracle();
        // Attacker pushes spot 10% away from the TWAP.
        itp.mint(address(pool), 50_000 ether);
        pool.swap(0, pool.getAmountOut(50_000 ether, address(itp)), eve, "");
        itp.mint(address(pool), 1000 ether);
        pool.addFees(address(vault), 1000 ether, 0);
        uint256 before = _lpPerShare();
        vm.prank(keeper);
        uint256 liq = vault.harvest(0);
        assertEq(liq, 0);
        assertEq(_lpPerShare(), before);
        _deposit(bob, 1000 ether); // deposits still work while the pool is off-TWAP
        assertGt(vault.balanceOf(bob), 0);
    }

    function test_RewardRouteNeedsApprovedPools() public {
        address[] memory route = new address[](2);
        route[0] = address(rewardPool);
        route[1] = address(bridgePool);
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.InvalidRoute.selector);
        vault.setRewardRoute(route);
        vm.startPrank(dao);
        factory.setApprovedPool(address(rewardPool), true);
        factory.setApprovedPool(address(bridgePool), true);
        vm.stopPrank();
        vm.prank(eve);
        vm.expectRevert();
        vault.setRewardRoute(route);
        address[] memory bad = new address[](1);
        bad[0] = address(rewardPool); // ends in USDC, not a pool token
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.InvalidRoute.selector);
        vault.setRewardRoute(bad);
        vm.prank(owner);
        vault.setRewardRoute(route);
        assertEq(vault.rewardRoute().length, 2);
    }

    function test_MultiHopRewardCompounds() public {
        vm.startPrank(dao);
        factory.setApprovedPool(address(rewardPool), true);
        factory.setApprovedPool(address(bridgePool), true);
        vm.stopPrank();
        address[] memory route = new address[](2);
        route[0] = address(rewardPool);
        route[1] = address(bridgePool);
        vm.prank(owner);
        vault.setRewardRoute(route);
        _deposit(alice, 1000 ether);
        _seedOracle();
        xaero.mint(address(vault), 100 ether);
        uint256 before = _lpPerShare();
        vm.prank(keeper);
        uint256 liq = vault.harvest(1);
        assertGt(liq, 0);
        vm.warp(block.timestamp + 12 hours);
        assertGt(_lpPerShare(), before);
        assertEq(usdc.balanceOf(address(vault)), 0); // no intermediate token left behind
        assertEq(vault.freeBalance(address(xaero)), 0);
    }

    function test_OversizedRewardIsClampedNotDumped() public {
        vm.startPrank(dao);
        factory.setApprovedPool(address(rewardPool), true);
        factory.setApprovedPool(address(bridgePool), true);
        vm.stopPrank();
        address[] memory route = new address[](2);
        route[0] = address(rewardPool);
        route[1] = address(bridgePool);
        vm.prank(owner);
        vault.setRewardRoute(route);
        _deposit(alice, 1000 ether);
        _seedOracle();
        xaero.mint(address(vault), 50_000 ether); // 50% of the xAERO pool
        vm.prank(keeper);
        vault.harvest(0);
        uint256 left = vault.freeBalance(address(xaero));
        assertGt(left, 40_000 ether); // only ~maxSwapBps of reserves sold per harvest
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_PoolClaimFailureNeverBlocksDepositOrRedeem() public {
        uint256 a = _deposit(alice, 1000 ether);
        pool.setFailClaims(true);
        _deposit(bob, 1000 ether);
        vm.prank(alice);
        vault.redeem(a, 1, alice);
        vm.prank(keeper);
        vm.expectRevert();
        vault.harvest(0); // keepers see the failure
    }

    // ── gauge
    // ────────────────────────────────────────────────────────────────

    function _gauge() internal returns (V2GaugeMock g) {
        g = new V2GaugeMock(address(pool), address(voter), xaero);
        gaugeF.register(address(pool), address(g));
        voter.setActivated(address(g), true);
    }

    function test_OnlyDaoAttachesValidGaugeAndEnablesStaking() public {
        V2GaugeMock g = _gauge();
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.OnlyDao.selector);
        vault.setGauge(address(g));
        V2GaugeMock rogue = new V2GaugeMock(address(pool), address(voter), xaero);
        vm.prank(dao);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setGauge(address(rogue));
        voter.setActivated(address(g), false);
        vm.prank(dao);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setGauge(address(g));
        voter.setActivated(address(g), true);
        vm.prank(dao);
        vault.setGauge(address(g));
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.OnlyDao.selector);
        vault.setStaking(true);
        _deposit(alice, 1000 ether);
        _routeBoth();
        vm.prank(dao);
        vault.setStaking(true);
        assertEq(vault.stakedLp(), g.balanceOf(address(vault)));
        assertEq(pool.balanceOf(address(vault)), 0);
        vm.prank(dao);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setGauge(address(0)); // cannot swap gauge while staked
    }

    function test_StakedLifecycleAndEmergencyUnstakeByOwner() public {
        V2GaugeMock g = _gauge();
        _routeBoth();
        vm.startPrank(dao);
        vault.setGauge(address(g));
        vault.setStaking(true);
        vm.stopPrank();
        uint256 a = _deposit(alice, 1000 ether);
        _deposit(bob, 1000 ether);
        assertEq(pool.balanceOf(address(vault)), 0);
        g.setReward(10 ether);
        g.setFail(true, true); // claims and deposits revert (killed gauge)
        _deposit(eve, 1000 ether); // still works: LP stays idle
        assertGt(pool.balanceOf(address(vault)), 0);
        vm.prank(alice);
        vault.redeem(a, 1, alice); // still works
        vm.prank(owner);
        vault.setStaking(false); // emergency unstake
        assertEq(vault.stakedLp(), 0);
        assertEq(g.balanceOf(address(vault)), 0);
        assertEq(pool.balanceOf(address(vault)), vault.totalAssets());
    }

    function test_GaugeEmissionsCharged() public {
        V2GaugeMock g = _gauge();
        _routeBoth();
        vm.startPrank(dao);
        vault.setGauge(address(g));
        vault.setStaking(true);
        vm.stopPrank();
        _deposit(alice, 1000 ether);
        g.setReward(100 ether);
        vm.prank(keeper);
        vault.harvest(0);
        assertEq(vault.daoOwed(address(xaero)), 2 ether);
        assertEq(vault.feesOwed(keeper, address(xaero)), 0.5 ether);
        assertEq(vault.freeBalance(address(xaero)), 97.5 ether); // no route yet: waits, owned by holders
    }

    // ── zap
    // ──────────────────────────────────────────────────────────────────

    function test_ZapInOutLeavesNothing() public {
        _deposit(alice, 1000 ether);
        itp.mint(bob, 2000 ether);
        vm.startPrank(bob);
        itp.approve(address(zap), 2000 ether);
        uint256 s = zap.quoteSwapAmount(address(vault), address(itp), 2000 ether);
        uint256 shares = zap.zapIn(address(vault), address(itp), 2000 ether, s, 1, 1);
        vault.approve(address(zap), shares);
        uint256 out = zap.zapOut(address(vault), shares, address(itp), 1);
        vm.stopPrank();
        assertGt(out, 0);
        assertApproxEqRel(itp.balanceOf(bob), 2000 ether, 2e16); // includes `out` and the zap-in refund
        assertEq(itp.balanceOf(address(zap)) + weth.balanceOf(address(zap)) + vault.balanceOf(address(zap)), 0);
    }

    function test_ZapRejectsForeignVault() public {
        vm.expectRevert(AeroZapV2.InvalidVault.selector);
        zap.zapIn(eve, address(itp), 1, 1, 0, 0);
    }

    // ── review regressions (v2 audit)
    // ───────────────────────────────────

    function _routeBoth() internal {
        vm.startPrank(dao);
        factory.setApprovedPool(address(rewardPool), true);
        factory.setApprovedPool(address(bridgePool), true);
        vm.stopPrank();
        address[] memory route = new address[](2);
        route[0] = address(rewardPool);
        route[1] = address(bridgePool);
        vm.prank(owner);
        vault.setRewardRoute(route);
    }

    /// H-01: deposit (spot pushed off-TWAP) -> restore -> redeem used to capture pending income.
    function test_JitSandwichCapturesNothing() public {
        _deposit(alice, 10_000 ether);
        _seedOracle();
        itp.mint(address(pool), 1000 ether);
        weth.mint(address(pool), 0.1 ether);
        pool.addFees(address(vault), 1000 ether, 0.1 ether);
        uint256 eveLp = _lp(eve, 50_000 ether);
        vm.startPrank(eve);
        pool.approve(address(vault), eveLp);
        uint256 s = vault.deposit(eveLp, 1, eve);
        vm.stopPrank();
        vm.prank(keeper);
        vault.harvest(1); // the harvest lands while Eve is in
        vm.prank(eve);
        uint256 out = vault.redeem(s, 1, eve);
        assertLe(out, eveLp, "no instant profit");
        vm.warp(block.timestamp + 24 hours);
        assertGt(_lpPerShare(), 1e18, "income went to the holders who stayed");
    }

    function test_ProfitUnlocksLinearly() public {
        _deposit(alice, 10_000 ether);
        _seedOracle();
        itp.mint(address(pool), 1000 ether);
        weth.mint(address(pool), 0.1 ether);
        pool.addFees(address(vault), 1000 ether, 0.1 ether);
        uint256 base = vault.totalAssets();
        vm.prank(keeper);
        uint256 liq = vault.harvest(1);
        uint256 t0 = vm.getBlockTimestamp();
        assertEq(vault.totalAssets(), base);
        vm.warp(t0 + 12 hours);
        assertApproxEqAbs(vault.totalAssets(), base + liq / 2, 2);
        // Owner shortening the unlock mid-schedule does not release profit early.
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setProfitUnlockTime(59 minutes);
        vm.prank(owner);
        vault.setProfitUnlockTime(1 hours);
        assertApproxEqAbs(vault.totalAssets(), base + liq / 2, 2);
        assertEq(vault.profitUnlockTime(), 24 hours);
        vm.warp(t0 + 24 hours);
        assertEq(vault.totalAssets(), base + liq);
    }

    /// L-01: deposits/redeems no longer trade, so they cannot be used to trigger swaps.
    function test_UserActionsNeverSwapOrCompound() public {
        _routeBoth();
        _deposit(alice, 1000 ether);
        _seedOracle();
        xaero.mint(address(vault), 100 ether);
        (uint256 r0, uint256 r1,) = rewardPool.getReserves();
        _deposit(bob, 1 ether);
        vm.prank(bob);
        vault.redeem(1, 0, bob);
        (uint256 r0b, uint256 r1b,) = rewardPool.getReserves();
        assertEq(r0, r0b);
        assertEq(r1, r1b);
        assertEq(xaero.balanceOf(address(vault)), 100 ether);
    }

    /// M-01: an intermediate hop that binds the size cap still converges.
    function test_ClampConvergesOnIntermediateHop() public {
        _routeBoth();
        _deposit(alice, 1000 ether);
        _seedOracle();
        // 500 xAERO = cap on hop 0; ~497 USDC > 250 USDC cap on hop 1 (bridge pool is half as deep).
        xaero.mint(address(vault), 10_000 ether);
        vm.prank(keeper);
        vault.harvest(1);
        assertLt(vault.freeBalance(address(xaero)), 10_000 ether * 975 / 1000, "some reward was swapped");
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    /// L-02: revoking an approved pool stops existing routes through it.
    function test_RevokedPoolStopsRoute() public {
        _routeBoth();
        _deposit(alice, 1000 ether);
        _seedOracle();
        vm.prank(dao);
        factory.setApprovedPool(address(bridgePool), false);
        xaero.mint(address(vault), 100 ether);
        vm.prank(keeper);
        vault.harvest(0);
        assertEq(vault.freeBalance(address(xaero)), 97.5 ether);
    }

    function test_StakingNeedsRewardRoute() public {
        V2GaugeMock g = _gauge();
        vm.startPrank(dao);
        vault.setGauge(address(g));
        vm.expectRevert(AeroVaultV2.InvalidConfig.selector);
        vault.setStaking(true);
        vm.stopPrank();
        _routeBoth();
        vm.prank(dao);
        vault.setStaking(true);
        assertTrue(vault.stakingEnabled());
        vm.prank(owner);
        vm.expectRevert(AeroVaultV2.InvalidRoute.selector);
        vault.setRewardRoute(new address[](0)); // cannot strand emissions while staked
    }

    // ── fuzz
    // ─────────────────────────────────────────────────────────────────

    function testFuzz_RoundTripNeverGainsLp(uint96 x, uint96 y) public {
        uint256 ax = bound(x, 1 ether, 100_000 ether);
        uint256 ay = bound(y, 1 ether, 100_000 ether);
        uint256 lpA = _lp(alice, ax);
        uint256 lpB = _lp(bob, ay);
        vm.prank(alice);
        pool.approve(address(vault), lpA);
        vm.prank(alice);
        uint256 sa = vault.deposit(lpA, 1, alice);
        vm.prank(bob);
        pool.approve(address(vault), lpB);
        vm.prank(bob);
        uint256 sb = vault.deposit(lpB, 1, bob);
        vm.prank(bob);
        uint256 outB = vault.redeem(sb, 1, bob);
        vm.prank(alice);
        uint256 outA = vault.redeem(sa, 1, alice);
        assertLe(outA, lpA);
        assertLe(outB, lpB);
        assertGe(vault.totalAssets(), 1000);
    }
}
