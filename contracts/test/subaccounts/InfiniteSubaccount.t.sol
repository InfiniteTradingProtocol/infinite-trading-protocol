// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { InfiniteSubaccount } from "../../src/subaccounts/InfiniteSubaccount.sol";
import { InfiniteSubaccountFactory } from "../../src/subaccounts/InfiniteSubaccountFactory.sol";
import { InfiniteSwapSandbox } from "../../src/subaccounts/InfiniteSwapSandbox.sol";
import { IInfiniteSubaccount } from "../../src/subaccounts/interfaces/IInfiniteSubaccount.sol";

contract MockToken is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory symbol, uint8 decimals_) ERC20(symbol, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockFeed {
    uint8 public immutable decimals;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;

    constructor(uint8 decimals_, int256 answer_) {
        decimals = decimals_;
        set(answer_);
    }

    function set(int256 answer_) public {
        answer = answer_;
        updatedAt = block.timestamp;
    }

    function setRaw(int256 answer_, uint256 startedAt_, uint256 updatedAt_) external {
        answer = answer_;
        startedAt = startedAt_;
        updatedAt = updatedAt_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, startedAt, updatedAt, 1);
    }
}

/// @dev Behaves like an aggregator: pulls from msg.sender only, pays any recipient the calldata names.
contract MockRouter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address to) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        MockToken(tokenOut).mint(to, amountOut);
    }

    function pullFromSender(address token, uint256 amount, address to) external {
        IERC20(token).transferFrom(msg.sender, to, amount);
    }
}

contract InfiniteSubaccountTest is Test {
    InfiniteSubaccountFactory internal factory;
    InfiniteSubaccount internal account;
    MockRouter internal router;
    MockToken internal weth;
    MockToken internal usdc;
    MockToken internal doge;
    MockToken internal itp;
    MockFeed internal wethFeed;
    MockFeed internal usdcFeed;
    MockFeed internal dogeFeed;
    MockFeed internal itpFeed;
    MockFeed internal sequencer;

    address internal dao = makeAddr("dao");
    address internal guardian = makeAddr("guardian");
    address internal treasury = makeAddr("treasury");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    bytes32 internal constant ROTATION = keccak256("infinite.rotation.v1");
    bytes32 internal constant GRID = keccak256("infinite.grid.v1");

    function setUp() public {
        weth = new MockToken("WETH", 18);
        usdc = new MockToken("USDC", 6);
        doge = new MockToken("DOGE", 8);
        itp = new MockToken("ITP", 18);
        wethFeed = new MockFeed(8, 3000e8);
        usdcFeed = new MockFeed(8, 1e8);
        dogeFeed = new MockFeed(8, 0.2e8);
        itpFeed = new MockFeed(8, 0.04e8);
        sequencer = new MockFeed(0, 0);
        sequencer.setRaw(0, block.timestamp - 2 hours, block.timestamp);
        router = new MockRouter();

        factory =
            new InfiniteSubaccountFactory(dao, guardian, treasury, address(itp), address(sequencer), _fees(30, 10));
        vm.startPrank(dao);
        factory.listAsset(address(weth), address(wethFeed), 1 days);
        factory.listAsset(address(usdc), address(usdcFeed), 1 days);
        factory.listAsset(address(doge), address(dogeFeed), 1 days);
        factory.listAsset(address(itp), address(itpFeed), 1 days);
        factory.setRouter(address(router), true);
        factory.setKeeper(keeper, uint64(block.timestamp + 365 days));
        vm.stopPrank();

        vm.prank(alice);
        account = InfiniteSubaccount(payable(factory.createAccount(alice, bytes32("main"), _params())));
        weth.mint(address(account), 10e18);
    }

    // ------------------------------------------------------------------ helpers

    function _fees(
        uint16 keeperBps,
        uint16 operatorBps
    )
        internal
        pure
        returns (InfiniteSubaccountFactory.FeeSchedule memory f)
    {
        f.keeperFeeBps = keeperBps;
        f.operatorFeeBps = operatorBps;
        f.tierMinLocked = [uint128(1000e18), 10_000e18, 100_000e18];
        f.tierDiscountBps = [uint16(2000), 4000, 6000];
    }

    function _params() internal view returns (IInfiniteSubaccount.InitParams memory p) {
        p.assets = new address[](2);
        p.assets[0] = address(weth);
        p.assets[1] = address(usdc);
        p.maxSlippageBps = 100;
        p.maxTradeUsd = 10_000e18;
        p.dailyLimitUsd = 25_000e18;
        p.agentEnabled = true;
        p.strategyIds = new bytes32[](1);
        p.strategyIds[0] = ROTATION;
        p.strategyParams = new bytes[](1);
        p.strategyParams[0] = abi.encode(uint256(1));
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    )
        internal
        view
        returns (IInfiniteSubaccount.Swap memory s)
    {
        s.strategyId = ROTATION;
        s.tokenIn = tokenIn;
        s.tokenOut = tokenOut;
        s.amountIn = amountIn;
        s.router = address(router);
        s.data = abi.encodeCall(MockRouter.swap, (tokenIn, tokenOut, amountIn, amountOut, address(account)));
    }

    /// @dev 1 WETH ($3,000) for `usdcOut` USDC.
    function _wethToUsdc(uint256 usdcOut) internal view returns (IInfiniteSubaccount.Swap memory) {
        return _swap(address(weth), address(usdc), 1e18, usdcOut);
    }

    function _refreshFeeds() internal {
        wethFeed.set(wethFeed.answer());
        usdcFeed.set(usdcFeed.answer());
        itpFeed.set(itpFeed.answer());
    }

    function _toArray(address a) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }

    // ------------------------------------------------------------------ creation

    function test_CreateAccount_PredictsAndRecords() public {
        assertEq(factory.predictAccount(alice, bytes32("main")), address(account));
        assertEq(factory.accountsOf(alice)[0], address(account));
        assertTrue(factory.isAccount(address(account)));
        assertEq(account.owner(), alice);
        assertEq(account.assets().length, 2);
        assertEq(account.strategies()[0], ROTATION);
        assertEq(account.strategyParams(ROTATION), abi.encode(uint256(1)));
        IInfiniteSubaccount.Policy memory p = account.policy();
        assertEq(p.maxSlippageBps, 100);
        assertEq(p.maxTradeUsd, 10_000e18);
        assertTrue(p.agentEnabled);
    }

    function test_CreateAccount_OnlyOwnerOrKeeper() public {
        vm.prank(bob);
        vm.expectRevert(InfiniteSubaccountFactory.NotAuthorized.selector);
        factory.createAccount(alice, bytes32("spam"), _params());

        vm.prank(keeper);
        address second = factory.createAccount(alice, bytes32("agent-made"), _params());
        assertEq(InfiniteSubaccount(payable(second)).owner(), alice);
        assertEq(factory.accountsOf(alice).length, 2);
    }

    /// A keeper can open an account for a user but cannot grant itself access to it.
    function test_CreateAccount_KeeperCannotGrantAgentAccess() public {
        vm.prank(keeper);
        InfiniteSubaccount made =
            InfiniteSubaccount(payable(factory.createAccount(alice, bytes32("agent-made"), _params())));
        assertFalse(made.agentEnabled());
        weth.mint(address(made), 2e18);

        IInfiniteSubaccount.Swap memory s = _wethToUsdc(3000e6);
        s.data = abi.encodeCall(MockRouter.swap, (address(weth), address(usdc), 1e18, uint256(3000e6), address(made)));
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotAgent.selector);
        made.executeSwap(s);

        vm.prank(alice);
        made.setAgentEnabled(true);
        vm.prank(keeper);
        made.executeSwap(s);
    }

    function test_CreateAccount_SaltCannotBeReused() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.createAccount(alice, bytes32("main"), _params());
    }

    function test_CreateAccount_RejectsUnlistedAsset() public {
        IInfiniteSubaccount.InitParams memory p = _params();
        p.assets[1] = address(new MockToken("NOPE", 18));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.AssetNotTradable.selector, p.assets[1]));
        factory.createAccount(alice, bytes32("x"), p);
    }

    function test_Initialize_ImplementationAndCloneLocked() public {
        InfiniteSubaccount implementation = InfiniteSubaccount(payable(factory.implementation()));
        IInfiniteSubaccount.InitParams memory p = _params();
        vm.expectRevert(InfiniteSubaccount.AlreadyInitialized.selector);
        implementation.initialize(attacker, p, true);
        vm.expectRevert(InfiniteSubaccount.AlreadyInitialized.selector);
        account.initialize(attacker, p, true);
    }

    // ------------------------------------------------------------------ agent swaps

    function test_KeeperSwap_TakesFeeAndChecksOracle() public {
        vm.prank(keeper);
        uint256 received = account.executeSwap(_wethToUsdc(2990e6));

        assertEq(received, 2990e6);
        // $3,000 notional x 0.30% = $9 = 0.003 WETH
        assertEq(weth.balanceOf(treasury), 0.003e18);
        assertEq(weth.balanceOf(address(account)), 10e18 - 1e18 - 0.003e18);
        assertEq(usdc.balanceOf(address(account)), 2990e6);
        assertEq(account.policy().windowSpentUsd, 3000e18);
        assertEq(account.remainingDailyUsd(), 22_000e18);
    }

    function test_KeeperSwap_OutputToSandboxIsForwarded() public {
        IInfiniteSubaccount.Swap memory s = _wethToUsdc(2995e6);
        s.data = abi.encodeCall(
            MockRouter.swap, (address(weth), address(usdc), 1e18, uint256(2995e6), factory.swapSandbox())
        );
        vm.prank(keeper);
        account.executeSwap(s);
        assertEq(usdc.balanceOf(address(account)), 2995e6);
        assertEq(usdc.balanceOf(factory.swapSandbox()), 0);
    }

    function test_KeeperSwap_RevertsBelowOracleFloor() public {
        // 1% max slippage on $3,000 = 2,970 USDC floor
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.InsufficientOutput.selector, 2969e6, 2970e6));
        account.executeSwap(_wethToUsdc(2969e6));
    }

    function test_KeeperSwap_AgentMinOutAlsoApplies() public {
        IInfiniteSubaccount.Swap memory s = _wethToUsdc(2980e6);
        s.minAmountOut = 2990e6;
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.InsufficientOutput.selector, 2980e6, 2990e6));
        account.executeSwap(s);
    }

    function test_KeeperSwap_RouteThatStealsTokenInReverts() public {
        IInfiniteSubaccount.Swap memory s = _wethToUsdc(0);
        s.data = abi.encodeCall(MockRouter.pullFromSender, (address(weth), 1e18, attacker));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.InsufficientOutput.selector, 0, 2970e6));
        account.executeSwap(s);
        assertEq(weth.balanceOf(attacker), 0);
    }

    /// The owner approved the router for all USDC by hand. A keeper route cannot use that allowance, because the
    /// router is called by the sandbox, never by the account.
    function test_KeeperSwap_SandboxIsolatesOwnerApprovals() public {
        usdc.mint(address(account), 50_000e6);
        IInfiniteSubaccount.Call[] memory calls = new IInfiniteSubaccount.Call[](1);
        calls[0] = IInfiniteSubaccount.Call(
            address(usdc), 0, abi.encodeCall(IERC20.approve, (address(router), type(uint256).max))
        );
        vm.prank(alice);
        account.execute(calls);

        IInfiniteSubaccount.Swap memory s = _wethToUsdc(0);
        s.data = abi.encodeCall(MockRouter.pullFromSender, (address(usdc), 50_000e6, attacker));
        vm.prank(keeper);
        vm.expectRevert(); // the sandbox has no USDC, so the router's transferFrom fails
        account.executeSwap(s);
        assertEq(usdc.balanceOf(address(account)), 50_000e6);
    }

    function test_KeeperSwap_RequiresEnabledAssets() public {
        IInfiniteSubaccount.Swap memory s = _swap(address(weth), address(doge), 1e18, 15_000e8);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.AssetNotEnabled.selector, address(doge)));
        account.executeSwap(s);

        // The owner enables DOGE, then the same swap works.
        vm.prank(alice);
        account.setAssets(_toArray(address(doge)), new address[](0));
        vm.prank(keeper);
        account.executeSwap(s);
        assertEq(doge.balanceOf(address(account)), 15_000e8);

        // And disables it again.
        vm.prank(alice);
        account.setAssets(new address[](0), _toArray(address(doge)));
        assertFalse(account.isAssetEnabled(address(doge)));
    }

    function test_KeeperSwap_RequiresApprovedRouter() public {
        vm.prank(dao);
        factory.setRouter(address(router), false);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.RouterNotApproved.selector, address(router)));
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_KeeperSwap_RequiresEnabledStrategy() public {
        IInfiniteSubaccount.Swap memory s = _wethToUsdc(3000e6);
        s.strategyId = GRID;
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.StrategyNotEnabled.selector, GRID));
        account.executeSwap(s);

        vm.prank(alice);
        account.setStrategy(ROTATION, false, "");
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccount.StrategyNotEnabled.selector, ROTATION));
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_KeeperSwap_AuthorisationRules() public {
        vm.prank(bob);
        vm.expectRevert(InfiniteSubaccount.NotAgent.selector);
        account.executeSwap(_wethToUsdc(3000e6));

        vm.prank(alice);
        account.setAgentEnabled(false);
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotAgent.selector);
        account.executeSwap(_wethToUsdc(3000e6));

        vm.prank(alice);
        account.setAgentEnabled(true);
        vm.prank(dao);
        factory.setKeeper(keeper, 0);
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotAgent.selector);
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_Pause_OwnerAndGuardian() public {
        vm.prank(alice);
        account.setPaused(true);
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.AgentsPaused.selector);
        account.executeSwap(_wethToUsdc(3000e6));
        vm.prank(alice);
        account.setPaused(false);

        vm.prank(guardian);
        factory.pauseKeepers();
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.AgentsPaused.selector);
        account.executeSwap(_wethToUsdc(3000e6));

        // The guardian can only stop agents.
        vm.prank(guardian);
        vm.expectRevert();
        factory.unpauseKeepers();

        // Owners still withdraw during a global pause.
        vm.prank(alice);
        account.withdraw(address(weth), 10e18, alice);
        assertEq(weth.balanceOf(alice), 10e18);
    }

    function test_Limits_PerTradeAndDaily() public {
        weth.mint(address(account), 100e18);
        IInfiniteSubaccount.Swap memory big = _swap(address(weth), address(usdc), 4e18, 12_000e6);
        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(InfiniteSubaccount.TradeTooLarge.selector, uint256(12_000e18), uint256(10_000e18))
        );
        account.executeSwap(big);

        IInfiniteSubaccount.Swap memory three = _swap(address(weth), address(usdc), 3e18, 9000e6);
        vm.startPrank(keeper);
        account.executeSwap(three);
        account.executeSwap(three); // $18,000 of $25,000
        vm.expectRevert(
            abi.encodeWithSelector(InfiniteSubaccount.DailyLimitExceeded.selector, uint256(9000e18), uint256(7000e18))
        );
        account.executeSwap(three);
        vm.stopPrank();

        vm.warp(vm.getBlockTimestamp() + 1 days);
        _refreshFeeds();
        sequencer.setRaw(0, vm.getBlockTimestamp() - 2 hours, vm.getBlockTimestamp());
        assertEq(account.remainingDailyUsd(), 25_000e18);
        vm.prank(keeper);
        account.executeSwap(three);
    }

    function test_Limits_SlippageCapAndOwnerOnly() public {
        vm.prank(alice);
        vm.expectRevert(InfiniteSubaccount.SlippageTooHigh.selector);
        account.setLimits(501, 1e18, 1e18);

        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotOwner.selector);
        account.setLimits(500, type(uint128).max, type(uint128).max);
    }

    // ------------------------------------------------------------------ oracles

    function test_Oracle_StalePriceBlocksAgent() public {
        wethFeed.setRaw(3000e8, 0, vm.getBlockTimestamp() - 1 days - 1);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccountFactory.StalePrice.selector, address(weth)));
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_Oracle_SequencerDownAndGrace() public {
        sequencer.setRaw(1, vm.getBlockTimestamp(), vm.getBlockTimestamp());
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccountFactory.SequencerDown.selector);
        account.executeSwap(_wethToUsdc(3000e6));

        sequencer.setRaw(0, vm.getBlockTimestamp() - 30 minutes, vm.getBlockTimestamp());
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccountFactory.SequencerDown.selector);
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_Oracle_FeedChangeForListedAssetIsDelayed() public {
        MockFeed evil = new MockFeed(8, 1e8); // claims WETH is worth $1
        vm.prank(dao);
        factory.listAsset(address(weth), address(evil), 1 days);
        (address feed,,,,) = factory.assets(address(weth));
        assertEq(feed, address(wethFeed));

        vm.expectRevert();
        factory.applyAssetUpdate(address(weth));

        // Owners see it queued and can pause or disable WETH; the DAO can cancel.
        vm.prank(dao);
        factory.cancelAssetUpdate(address(weth));
        vm.warp(vm.getBlockTimestamp() + 2 days);
        vm.expectRevert(InfiniteSubaccountFactory.NothingQueued.selector);
        factory.applyAssetUpdate(address(weth));
    }

    function test_Oracle_DelistStopsAgentNotOwner() public {
        vm.prank(dao);
        factory.delistAsset(address(weth));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(InfiniteSubaccountFactory.NotListed.selector, address(weth)));
        account.executeSwap(_wethToUsdc(3000e6));
        vm.prank(alice);
        account.withdraw(address(weth), 1e18, alice);
    }

    // ------------------------------------------------------------------ custody

    function test_Withdraw_OnlyOwner() public {
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotOwner.selector);
        account.withdraw(address(weth), 1e18, keeper);

        vm.prank(dao);
        vm.expectRevert(InfiniteSubaccount.NotOwner.selector);
        account.withdraw(address(weth), 1e18, dao);

        vm.deal(address(account), 1 ether);
        vm.prank(alice);
        account.withdraw(address(0), 1 ether, alice);
        assertEq(alice.balance, 1 ether);
    }

    function test_Execute_OnlyOwnerNoSelfCalls() public {
        IInfiniteSubaccount.Call[] memory calls = new IInfiniteSubaccount.Call[](1);
        calls[0] = IInfiniteSubaccount.Call(address(weth), 0, abi.encodeCall(IERC20.transfer, (keeper, 1e18)));
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotOwner.selector);
        account.execute(calls);

        calls[0] = IInfiniteSubaccount.Call(address(account), 0, abi.encodeCall(InfiniteSubaccount.setPaused, (true)));
        vm.prank(alice);
        vm.expectRevert(InfiniteSubaccount.InvalidTarget.selector);
        account.execute(calls);
    }

    function test_Deposit_AnyoneCanFund() public {
        usdc.mint(bob, 500e6);
        vm.startPrank(bob);
        usdc.approve(address(account), 500e6);
        account.deposit(address(usdc), 500e6);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(account)), 500e6);
    }

    function test_Sandbox_OnlyAccounts() public {
        InfiniteSwapSandbox sandbox = InfiniteSwapSandbox(factory.swapSandbox());
        vm.prank(attacker);
        vm.expectRevert(InfiniteSwapSandbox.NotAccount.selector);
        sandbox.swap(address(weth), address(usdc), address(router), 1, "");
    }

    // ------------------------------------------------------------------ ownership and operators

    function test_Ownership_TwoStepResetsAgentAccess() public {
        address bot = makeAddr("aliceBot");
        vm.startPrank(alice);
        account.setOperator(bot, uint64(block.timestamp + 30 days));
        account.transferOwnership(bob);
        vm.stopPrank();
        assertEq(account.owner(), alice);

        vm.prank(attacker);
        vm.expectRevert(InfiniteSubaccount.NotPendingOwner.selector);
        account.acceptOwnership();

        vm.prank(bob);
        account.acceptOwnership();
        assertEq(account.owner(), bob);
        assertEq(factory.accountOwner(address(account)), bob);
        assertEq(factory.accountsOf(bob)[0], address(account));
        assertEq(factory.accountsOf(alice).length, 0);
        assertFalse(account.agentEnabled());
        assertFalse(account.isOperator(bot));

        vm.prank(alice);
        vm.expectRevert(InfiniteSubaccount.NotOwner.selector);
        account.withdraw(address(weth), 1e18, alice);
        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.NotAgent.selector);
        account.executeSwap(_wethToUsdc(3000e6));
    }

    function test_SyncOwner_OnlyAccounts() public {
        vm.prank(attacker);
        vm.expectRevert(InfiniteSubaccountFactory.NotAnAccount.selector);
        factory.syncOwner();
    }

    function test_Operator_OwnBotTradesAtOperatorFee() public {
        address bot = makeAddr("aliceBot");
        vm.startPrank(alice);
        account.setAgentEnabled(false); // no Infinite Trading keepers, only her own bot
        account.setOperator(bot, uint64(block.timestamp + 1 days));
        vm.stopPrank();

        vm.prank(bot);
        account.executeSwap(_wethToUsdc(3000e6));
        // $3,000 x 0.10% = $3 = 0.001 WETH
        assertEq(weth.balanceOf(treasury), 0.001e18);

        vm.warp(vm.getBlockTimestamp() + 1 days);
        assertFalse(account.isOperator(bot));
    }

    // ------------------------------------------------------------------ fees and ITP

    function test_Fees_ItpLockDiscountAndUnlock() public {
        itp.mint(address(account), 10_000e18);
        vm.prank(alice);
        account.lockFeeToken(10_000e18);
        assertEq(factory.discountBps(address(account)), 4000);

        vm.prank(keeper);
        account.executeSwap(_wethToUsdc(3000e6));
        // $9 x (1 - 40%) = $5.40 = 0.0018 WETH
        assertEq(weth.balanceOf(treasury), 0.0018e18);

        vm.startPrank(alice);
        vm.expectRevert(InfiniteSubaccount.FeeTokenStillLocked.selector);
        account.withdraw(address(itp), 1, alice);

        IInfiniteSubaccount.Call[] memory calls = new IInfiniteSubaccount.Call[](1);
        calls[0] = IInfiniteSubaccount.Call(address(itp), 0, abi.encodeCall(IERC20.approve, (attacker, 1)));
        vm.expectRevert(InfiniteSubaccount.FeeTokenStillLocked.selector);
        account.execute(calls);

        account.requestUnlock();
        assertEq(factory.discountBps(address(account)), 0); // discount stops at once
        vm.expectRevert(InfiniteSubaccount.FeeTokenStillLocked.selector);
        account.withdraw(address(itp), 1, alice);
        vm.stopPrank();

        vm.warp(vm.getBlockTimestamp() + 7 days);
        vm.prank(alice);
        account.withdraw(address(itp), 10_000e18, alice);
        assertEq(itp.balanceOf(alice), 10_000e18);
    }

    function test_Fees_AgentCannotSellLockedItp() public {
        itp.mint(address(account), 10_000e18);
        vm.startPrank(alice);
        account.setAssets(_toArray(address(itp)), new address[](0));
        account.lockFeeToken(10_000e18);
        vm.stopPrank();

        vm.prank(keeper);
        vm.expectRevert(InfiniteSubaccount.FeeTokenStillLocked.selector);
        account.executeSwap(_swap(address(itp), address(usdc), 1000e18, 40e6));
    }

    /// No minimum fee: churning small trades costs the same rate as one large trade.
    function test_Fees_SmallTradesPayOnlyTheRate() public {
        // $1.50 x 0.30% = $0.0045 = 0.0000015 WETH
        IInfiniteSubaccount.Swap memory s = _swap(address(weth), address(usdc), 0.0005e18, 1.5e6);
        vm.prank(keeper);
        account.executeSwap(s);
        assertEq(weth.balanceOf(treasury), 0.0000015e18);
    }

    function test_Fees_ChangesWaitAndAreCapped() public {
        vm.startPrank(dao);
        vm.expectRevert(InfiniteSubaccountFactory.InvalidFees.selector);
        factory.queueFees(_fees(101, 0));

        factory.queueFees(_fees(80, 20));
        vm.expectRevert();
        factory.applyFees();
        vm.stopPrank();
        assertEq(factory.fees().keeperFeeBps, 30);

        vm.warp(vm.getBlockTimestamp() + 3 days);
        factory.applyFees(); // anyone can apply once due
        assertEq(factory.fees().keeperFeeBps, 80);
    }

    function test_Admin_OnlyOwner() public {
        vm.startPrank(attacker);
        vm.expectRevert();
        factory.setKeeper(attacker, type(uint64).max);
        vm.expectRevert();
        factory.setRouter(attacker, true);
        vm.expectRevert();
        factory.listAsset(address(weth), address(wethFeed), 1 days);
        vm.expectRevert();
        factory.setTreasury(attacker);
        vm.expectRevert(InfiniteSubaccountFactory.NotOwnerOrGuardian.selector);
        factory.pauseKeepers();
        vm.stopPrank();
    }

    function test_Admin_RouterCannotBeAssetOrEoa() public {
        vm.startPrank(dao);
        vm.expectRevert(InfiniteSubaccountFactory.InvalidRouter.selector);
        factory.setRouter(address(usdc), true);
        vm.expectRevert(InfiniteSubaccountFactory.InvalidRouter.selector);
        factory.setRouter(attacker, true);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ fuzz: the loss bound

    /// Whatever route a keeper picks, a swap either reverts or leaves the account with at least the oracle value of
    /// what it spent, minus the owner's max slippage, and the fee never exceeds the keeper rate.
    function testFuzz_SwapLossNeverExceedsSlippage(uint256 amountIn, uint256 outBps) public {
        amountIn = bound(amountIn, 1e12, 3e18); // up to $9,000 (below the $10,000 trade limit)
        outBps = bound(outBps, 0, 12_000);
        uint256 fair = amountIn * 3000 / 1e12; // USDC, 6 decimals
        uint256 out = fair * outBps / 10_000;

        uint256 usdcBefore = usdc.balanceOf(address(account));
        vm.prank(keeper);
        try account.executeSwap(_swap(address(weth), address(usdc), amountIn, out)) returns (uint256 received) {
            assertGe(received * 10_000, fair * 9900 - 10_000); // within 1% of fair value (allow 1 wei rounding)
            assertEq(usdc.balanceOf(address(account)) - usdcBefore, received);
            assertLe(weth.balanceOf(treasury), amountIn * 30 / 10_000); // 0.30% keeper rate
        } catch {
            assertLt(out * 10_000, fair * 9900 + 10_000);
        }
    }
}
