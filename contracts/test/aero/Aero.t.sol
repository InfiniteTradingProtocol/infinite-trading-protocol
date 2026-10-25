// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { AeroChains } from "../../src/aero/AeroChains.sol";

contract AeroToken is ERC20 {
    constructor() ERC20("Token", "TOK") { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AeroPoolMock is ERC20 {
    address public token0;
    address public token1;
    address public factory;
    mapping(address => uint256) public fees0;
    mapping(address => uint256) public fees1;

    constructor(address a, address b, address f) ERC20("LP", "LP") {
        token0 = a;
        token1 = b;
        factory = f;
    }

    function seed(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function getReserves() external view returns (uint256, uint256, uint256) {
        return (totalSupply(), totalSupply(), 0);
    }

    function addFees(address account, uint256 a, uint256 b) external {
        fees0[account] += a;
        fees1[account] += b;
    }

    function pendingFees(address account) external view returns (uint256, uint256) {
        return (fees0[account], fees1[account]);
    }

    function claimFees(address to) external returns (uint256 a, uint256 b) {
        a = fees0[msg.sender];
        b = fees1[msg.sender];
        delete fees0[msg.sender];
        delete fees1[msg.sender];
        AeroToken(token0).mint(to, a);
        AeroToken(token1).mint(to, b);
    }

    function mint(address to) external returns (uint256 liquidity) {
        liquidity = IERC20(token0).balanceOf(address(this));
        uint256 other = IERC20(token1).balanceOf(address(this));
        if (other < liquidity) liquidity = other;
        IERC20(token0).transfer(address(0xbeef), liquidity);
        IERC20(token1).transfer(address(0xbeef), liquidity);
        _mint(to, liquidity);
    }

    function getAmountOutWithTotalFee(uint256 amount, address) external pure returns (uint256) {
        return amount;
    }

    function swap(uint256 a, uint256 b, address to, bytes calldata) external {
        if (a != 0) AeroToken(token0).mint(to, a);
        if (b != 0) AeroToken(token1).mint(to, b);
    }
}

contract AeroPoolFactoryMock {
    mapping(address => bool) public isPool;

    function allow(address pool) external {
        isPool[pool] = true;
    }
}

contract AeroGaugeFactoryMock {
    mapping(address => bool) public isGauge;
    mapping(address => address) public computeGaugeAddress;

    function register(address pool, address gauge) external {
        isGauge[gauge] = true;
        computeGaugeAddress[pool] = gauge;
    }
}

contract AeroVoterMock {
    mapping(address => bool) public isActivated;

    function setActivated(address gauge, bool active) external {
        isActivated[gauge] = active;
    }
}

contract AeroGaugeMock {
    address public stakingToken;
    address public voter;
    AeroToken public reward;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public earned;
    bool public failClaims;

    constructor(address lp, address voter_, AeroToken r) {
        stakingToken = lp;
        voter = voter_;
        reward = r;
    }

    function setReward(address to, uint256 amount) external {
        earned[to] = amount;
    }

    function setFailClaims(bool fail) external {
        failClaims = fail;
    }

    function deposit(uint256 amount) external {
        IERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        IERC20(stakingToken).transfer(msg.sender, amount);
    }

    function claimEmissions(address account, address to) external {
        require(!failClaims, "Gauge claim failed");
        uint256 amount = earned[account];
        delete earned[account];
        reward.mint(to, amount);
    }
}

contract AeroTest is Test {
    AeroFactory factory;
    AeroVault vault;
    AeroPoolMock pool;
    AeroPoolFactoryMock poolFactory;
    AeroGaugeMock gauge;
    AeroGaugeFactoryMock gaugeFactory;
    AeroVoterMock voter;
    AeroToken a;
    AeroToken b;
    AeroToken reward;
    address constant DAO = address(0xda0);
    address constant TREASURY = address(0xfee);
    address constant KEEPER = address(0xcafe);
    address constant STRATEGIST = address(0x57);
    address constant ALICE = address(0xa11ce);
    address constant BOB = address(0xb0b);

    function setUp() public virtual {
        a = new AeroToken();
        b = new AeroToken();
        reward = new AeroToken();
        poolFactory = new AeroPoolFactoryMock();
        pool = new AeroPoolMock(address(a), address(b), address(poolFactory));
        poolFactory.allow(address(pool));
        gaugeFactory = new AeroGaugeFactoryMock();
        voter = new AeroVoterMock();
        address[] memory keepers = new address[](1);
        keepers[0] = KEEPER;
        factory = new AeroFactory(
            DAO, TREASURY, address(poolFactory), address(poolFactory),
            address(gaugeFactory), address(gaugeFactory), address(voter), address(reward), address(0), keepers
        );
        gauge = new AeroGaugeMock(address(pool), address(voter), reward);
        gaugeFactory.register(address(pool), address(gauge));
        voter.setActivated(address(gauge), true);
        vault = AeroVault(factory.createVault(_config(address(gauge))));
        pool.seed(address(0xbeef), 1e24);
        _fund(ALICE);
        _fund(BOB);
    }

    function _config(address gauge_) internal view returns (AeroVault.Config memory) {
        return AeroVault.Config(
            address(pool), gauge_, address(reward), address(this), STRATEGIST, 1000, 200, 0, 0, "Aero vault", "aLP"
        );
    }

    function _fund(address user) internal {
        pool.seed(user, 1e24);
        a.mint(user, 1e24);
        b.mint(user, 1e24);
        reward.mint(user, 1e24);
        vm.startPrank(user);
        pool.approve(address(vault), type(uint256).max);
        a.approve(address(vault), type(uint256).max);
        b.approve(address(vault), type(uint256).max);
        reward.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function _deposit(address user, uint256 amount) internal {
        uint256[3] memory maximum = [type(uint256).max, type(uint256).max, type(uint256).max];
        vm.prank(user);
        vault.deposit(amount, 1, maximum);
    }

    function _redeem(address user) internal {
        uint256 shares = vault.balanceOf(user);
        vm.prank(user);
        vault.redeem(shares, 0, [uint256(0), uint256(0), uint256(0)]);
    }

    function test_DefaultDaoFeesAndKeeperProtection() public {
        assertEq(factory.daoRewardBps(), 200);
        assertEq(factory.daoEntryExitShareBps(), 1000);
        assertTrue(vault.isKeeper(KEEPER));
        vm.expectRevert(AeroVault.ProtectedKeeper.selector);
        vault.setKeeper(KEEPER, false);
        vault.setKeeper(BOB, true);
        assertTrue(vault.isKeeper(BOB));
        vault.setKeeper(BOB, false);
        assertFalse(vault.isKeeper(BOB));
    }

    function test_OnlyOwnerManagesKeepers() public {
        vm.prank(BOB);
        vm.expectRevert();
        vault.setKeeper(BOB, true);
    }

    function test_OnlyDaoChangesFactoryFees() public {
        vm.expectRevert(AeroFactory.OnlyDao.selector);
        factory.setDaoFees(500, 200);
        vm.startPrank(DAO);
        vm.expectRevert(AeroFactory.InvalidConfig.selector);
        factory.setDaoFees(0, 0);
        vm.expectRevert(AeroFactory.InvalidConfig.selector);
        factory.setDaoFees(1001, 0);
        vm.expectRevert(AeroFactory.InvalidConfig.selector);
        factory.setDaoFees(200, 1001);
        factory.setDaoFees(1, 0);
        vm.stopPrank();
        assertEq(factory.daoRewardBps(), 1);
        assertEq(factory.daoEntryExitShareBps(), 0);
    }

    function test_FeeBoundaries() public {
        vault.setFees(STRATEGIST, 0, 10, 200, 200);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        vault.setFees(STRATEGIST, 1001, 10, 0, 0);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        vault.setFees(STRATEGIST, 0, 9, 0, 0);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        vault.setFees(STRATEGIST, 0, 201, 0, 0);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        vault.setFees(STRATEGIST, 0, 10, 201, 0);
        vm.expectRevert(AeroVault.InvalidConfig.selector);
        vault.setFees(STRATEGIST, 0, 10, 0, 201);
    }

    function test_SplitDaoFirstAndIndependentKeeper() public view {
        (uint256 daoFee, uint256 strategy, uint256 keeper) = vault.splitReward(100 ether);
        assertEq(daoFee, 2 ether);
        assertEq(strategy, 9.8 ether);
        assertEq(keeper, 1.96 ether);
    }

    function testFuzz_SplitsConserveRewards(uint128 gross, uint16 strategy, uint16 keeper) public {
        strategy = uint16(bound(strategy, 0, 1000));
        keeper = uint16(bound(keeper, 10, 200));
        vault.setFees(STRATEGIST, strategy, keeper, 0, 0);
        (uint256 d, uint256 s, uint256 k) = vault.splitReward(gross);
        assertEq(d, uint256(gross) * 200 / 10_000);
        assertEq(s, (uint256(gross) - d) * strategy / 10_000);
        assertEq(k, (uint256(gross) - d) * keeper / 10_000);
        assertLe(d + s + k, gross);
    }

    function test_EntryExitFeeDaoShareIsOfFeeNotPrincipal() public {
        vault.setFees(STRATEGIST, 0, 10, 200, 200);
        _deposit(ALICE, 100 ether);
        assertEq(pool.balanceOf(TREASURY), 0.2 ether);
        assertEq(pool.balanceOf(STRATEGIST), 1.8 ether);
        uint256 gross = vault.balanceOf(ALICE);
        _redeem(ALICE);
        uint256 fee = gross * 200 / 10_000;
        assertEq(pool.balanceOf(TREASURY), 0.2 ether + fee * 1000 / 10_000);
        assertEq(vault.totalSupply(), vault.MINIMUM_SHARES());
    }

    function test_PendingRewardsCannotBeCapturedByNewDepositor() public {
        _deposit(ALICE, 100 ether);
        gauge.setReward(address(vault), 100 ether);
        uint256 bobBefore = reward.balanceOf(BOB);
        _deposit(BOB, 100 ether);
        assertEq(bobBefore - reward.balanceOf(BOB), 86.24 ether);
        assertEq(reward.balanceOf(address(vault)), 172.48 ether);
        assertEq(reward.balanceOf(TREASURY), 2 ether);
        assertEq(reward.balanceOf(STRATEGIST), 9.8 ether);
        assertEq(reward.balanceOf(KEEPER), 1.96 ether);
    }

    function test_UnclaimedPoolFeesChargedOnBothTokens() public {
        _deposit(ALICE, 100 ether);
        pool.addFees(address(vault), 100 ether, 200 ether);
        _redeem(ALICE);
        assertEq(a.balanceOf(TREASURY), 2 ether);
        assertEq(b.balanceOf(TREASURY), 4 ether);
        assertEq(a.balanceOf(KEEPER), 1.96 ether);
        assertEq(b.balanceOf(KEEPER), 3.92 ether);
    }

    function test_NoGaugeStillCollectsBothTokens() public {
        vault = AeroVault(factory.createVault(_config(address(0))));
        _fund(ALICE);
        _deposit(ALICE, 100 ether);
        pool.addFees(address(vault), 100 ether, 100 ether);
        _redeem(ALICE);
        assertEq(a.balanceOf(TREASURY), 2 ether);
        assertEq(b.balanceOf(TREASURY), 2 ether);
    }

    function test_ExistingBasketNotChargedTwice() public {
        _deposit(ALICE, 100 ether);
        pool.addFees(address(vault), 100 ether, 100 ether);
        _deposit(BOB, 100 ether);
        _redeem(BOB);
        _redeem(ALICE);
        assertEq(a.balanceOf(TREASURY), 2 ether);
        assertEq(b.balanceOf(TREASURY), 2 ether);
    }

    function test_BasketSlippageRevertsEntireDeposit() public {
        _deposit(ALICE, 100 ether);
        gauge.setReward(address(vault), 100 ether);
        vm.prank(BOB);
        vm.expectRevert(AeroVault.Slippage.selector);
        vault.deposit(100 ether, 1, [uint256(0), uint256(0), uint256(0)]);
        assertEq(vault.balanceOf(BOB), 0);
        assertEq(reward.balanceOf(TREASURY), 0);
        assertEq(gauge.earned(address(vault)), 100 ether);
    }

    function test_EstimateKeeperRewardIncludesGaugeAndBothTokens() public {
        _deposit(ALICE, 100 ether);
        gauge.setReward(address(vault), 100 ether);
        pool.addFees(address(vault), 200 ether, 300 ether);
        (address[3] memory tokens, uint256[3] memory amounts) = vault.estimateKeeperReward();
        assertEq(tokens[0], address(a));
        assertEq(tokens[1], address(b));
        assertEq(tokens[2], address(reward));
        assertEq(amounts[0], 3.92 ether);
        assertEq(amounts[1], 5.88 ether);
        assertEq(amounts[2], 1.96 ether);
    }

    function test_ZeroStrategistStillPaysKeeper() public {
        vault.setFees(STRATEGIST, 0, 200, 0, 0);
        _deposit(ALICE, 100 ether);
        gauge.setReward(address(vault), 100 ether);
        _redeem(ALICE);
        assertEq(reward.balanceOf(STRATEGIST), 0);
        assertEq(reward.balanceOf(KEEPER), 1.96 ether);
        assertEq(reward.balanceOf(TREASURY), 2 ether);
    }

    function test_HarvestCompoundsAndPaysActualKeeper() public {
        _deposit(ALICE, 100 ether);
        pool.addFees(address(vault), 100 ether, 100 ether);
        vault.setKeeper(BOB, true);
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](0);
        uint256 keeperBefore = a.balanceOf(BOB);
        vm.prank(BOB);
        uint256 liquidity = vault.harvest(swaps, 86 ether, block.timestamp + 60);
        assertEq(liquidity, 86.24 ether);
        assertEq(a.balanceOf(BOB) - keeperBefore, 1.96 ether);
        assertEq(vault.totalAssets(), 186.24 ether);
        assertEq(vault.totalSupply(), 100 ether);
    }

    function test_HarvestFailureRollsBackFees() public {
        _deposit(ALICE, 100 ether);
        pool.addFees(address(vault), 100 ether, 100 ether);
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](0);
        vm.prank(KEEPER);
        vm.expectRevert(AeroVault.Slippage.selector);
        vault.harvest(swaps, 100 ether, block.timestamp + 60);
        assertEq(a.balanceOf(TREASURY), 0);
    }

    function test_HarvestSwapsGaugeRewardThroughRegisteredPools() public {
        _deposit(ALICE, 100 ether);
        gauge.setReward(address(vault), 100 ether);
        AeroPoolMock routeA = new AeroPoolMock(address(reward), address(a), address(poolFactory));
        AeroPoolMock routeB = new AeroPoolMock(address(reward), address(b), address(poolFactory));
        poolFactory.allow(address(routeA));
        poolFactory.allow(address(routeB));
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](2);
        swaps[0] = AeroVault.Swap(address(routeA), address(reward), 43.12 ether, 43 ether);
        swaps[1] = AeroVault.Swap(address(routeB), address(reward), 43.12 ether, 43 ether);
        vm.prank(KEEPER);
        uint256 lp = vault.harvest(swaps, 43 ether, block.timestamp + 60);
        assertEq(lp, 43.12 ether);
        assertEq(vault.totalAssets(), 143.12 ether);
        assertEq(reward.balanceOf(TREASURY), 2 ether);
        assertEq(reward.balanceOf(KEEPER), 1.96 ether);
    }

    function test_SwapRejectsUnregisteredPool() public {
        _deposit(ALICE, 100 ether);
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](1);
        swaps[0] = AeroVault.Swap(address(reward), address(a), 1, 1);
        vm.prank(KEEPER);
        vm.expectRevert(AeroVault.InvalidSwap.selector);
        vault.harvest(swaps, 1, block.timestamp + 60);
    }

    function testFuzz_MultiuserRoundTripConservesLp(uint128 first, uint128 second) public {
        first = uint128(bound(first, 1e6, 1e22));
        second = uint128(bound(second, 1e6, 1e22));
        uint256 aliceBefore = pool.balanceOf(ALICE);
        uint256 bobBefore = pool.balanceOf(BOB);
        _deposit(ALICE, first);
        _deposit(BOB, second);
        _redeem(BOB);
        _redeem(ALICE);
        assertEq(pool.balanceOf(ALICE), aliceBefore - vault.MINIMUM_SHARES());
        assertEq(pool.balanceOf(BOB), bobBefore);
        assertEq(vault.totalAssets(), vault.MINIMUM_SHARES());
    }

    function test_UnauthorizedHarvestAndBadDeadline() public {
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](0);
        vm.expectRevert(AeroVault.UnauthorizedKeeper.selector);
        vault.harvest(swaps, 1, block.timestamp);
        vm.prank(KEEPER);
        vm.expectRevert(AeroVault.InvalidAmount.selector);
        vault.harvest(swaps, 1, block.timestamp + 301);
    }

    function test_CannotDeployFakePoolOrGauge() public {
        AeroVault.Config memory c = _config(address(gauge));
        c.pool = address(a);
        vm.expectRevert(AeroFactory.InvalidPool.selector);
        factory.createVault(c);
        c = _config(address(0xbad));
        vm.expectRevert(AeroFactory.InvalidGauge.selector);
        factory.createVault(c);
    }

    function test_RegisteredGaugeNeedsNoDaoApproval() public {
        assertTrue(factory.isGauge(address(pool), address(gauge)));
        AeroVault.Config memory c = _config(address(gauge));
        c.owner = BOB;
        vm.prank(BOB);
        assertTrue(factory.isVault(factory.createVault(c)));
    }

    function test_RejectsUnregisteredSelfReportingGauge() public {
        AeroGaugeMock fake = new AeroGaugeMock(address(pool), address(voter), reward);
        voter.setActivated(address(fake), true);
        assertFalse(factory.isGauge(address(pool), address(fake)));
        vm.expectRevert(AeroFactory.InvalidGauge.selector);
        factory.createVault(_config(address(fake)));
    }

    function test_RejectsInactiveGaugeButAllowsNoGauge() public {
        voter.setActivated(address(gauge), false);
        assertFalse(factory.isGauge(address(pool), address(gauge)));
        vm.expectRevert(AeroFactory.InvalidGauge.selector);
        factory.createVault(_config(address(gauge)));
        assertTrue(factory.isVault(factory.createVault(_config(address(0)))));
    }

    function test_RejectsRegisteredGaugeForAnotherPoolOrVoter() public {
        AeroGaugeMock wrongPool = new AeroGaugeMock(address(a), address(voter), reward);
        gaugeFactory.register(address(pool), address(wrongPool));
        voter.setActivated(address(wrongPool), true);
        assertFalse(factory.isGauge(address(pool), address(wrongPool)));
        assertFalse(factory.isGauge(address(pool), address(gauge)));
        AeroGaugeMock wrongVoter = new AeroGaugeMock(address(pool), address(a), reward);
        gaugeFactory.register(address(pool), address(wrongVoter));
        voter.setActivated(address(wrongVoter), true);
        assertFalse(factory.isGauge(address(pool), address(wrongVoter)));
    }

    function test_ShareSlippageAndMinimumLock() public {
        vm.prank(ALICE);
        vm.expectRevert(AeroVault.InvalidAmount.selector);
        vault.deposit(1000, 1, [uint256(0), uint256(0), uint256(0)]);
        _deposit(ALICE, 100 ether);
        _redeem(ALICE);
        assertEq(vault.balanceOf(vault.DEAD()), 1000);
        assertEq(vault.totalAssets(), 1000);
    }

    function test_DonationBeforeFirstDepositDoesNotBlockVault() public {
        pool.seed(address(vault), 7);
        _deposit(ALICE, 100 ether);
        assertEq(vault.balanceOf(vault.DEAD()), 1007);
    }

    function test_ExternalFailureIsExplicitAndAtomic() public {
        gauge.setFailClaims(true);
        vm.prank(ALICE);
        vm.expectRevert("Gauge claim failed");
        vault.deposit(100 ether, 1, [uint256(0), uint256(0), uint256(0)]);
        assertEq(vault.totalSupply(), 0);
    }

    function test_StakingCanBeDisabledWithoutChangingDaoOrKeepers() public {
        _deposit(ALICE, 100 ether);
        vault.setStaking(false);
        assertEq(gauge.balanceOf(address(vault)), 0);
        assertEq(vault.totalAssets(), 100 ether);
        assertTrue(vault.isKeeper(KEEPER));
        _redeem(ALICE);
    }

    function test_ChainConfiguration() public pure {
        assertEq(AeroChains.rewardToken(8453), 0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee);
        assertEq(AeroChains.rewardToken(10), 0xbdEaeA5205d16f34Cb40038052d91235D87B4C54);
        assertEq(AeroChains.rewardToken(1), AeroChains.rewardToken(4663));
    }
}
