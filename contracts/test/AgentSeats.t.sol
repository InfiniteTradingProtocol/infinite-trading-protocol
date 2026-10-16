// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import { AgentSeats } from "../src/AgentSeats.sol";
import { IAgentSeats } from "../src/interfaces/IAgentSeats.sol";
import { IItpPriceOracle } from "../src/interfaces/IItpPriceOracle.sol";
import { MockITP, FeeITP } from "../src/mock/MockITP.sol";
import { MockItpOracle } from "../src/mock/MockItpOracle.sol";

contract AgentSeatsV2 is AgentSeats {
    function version() external pure returns (uint256) {
        return 2;
    }
}

contract AgentSeatsTest is Test {
    uint256 internal constant PRICE = 6.12e15; // $0.00612 per ITP
    uint64 internal constant MONTH = 30 days;
    uint64 internal constant QUARTER = 90 days;

    MockITP internal itp;
    MockItpOracle internal oracle;
    AgentSeats internal seats;
    address internal dao = makeAddr("daoSafe");
    address internal alice;
    uint256 internal aliceKey;
    address internal bob = makeAddr("bob");

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        itp = new MockITP();
        oracle = new MockItpOracle(PRICE);
        seats = _deploy(IERC20(address(itp)));
        itp.mint(alice, 10_000_000e18);
        itp.mint(bob, 10_000_000e18);
        vm.prank(alice);
        itp.approve(address(seats), type(uint256).max);
        vm.prank(bob);
        itp.approve(address(seats), type(uint256).max);
    }

    function _plans() internal pure returns (IAgentSeats.Plan[] memory p) {
        p = new IAgentSeats.Plan[](2);
        p[0] = IAgentSeats.Plan({ duration: MONTH, usdCents: 1999, active: true });
        p[1] = IAgentSeats.Plan({ duration: QUARTER, usdCents: 4999, active: true });
    }

    function _deploy(IERC20 token) internal returns (AgentSeats) {
        AgentSeats impl = new AgentSeats();
        bytes memory init = abi.encodeCall(AgentSeats.initialize, (token, dao, oracle, _plans()));
        return AgentSeats(address(new ERC1967Proxy(address(impl), init)));
    }

    function _ids(uint256 a) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](1);
        ids[0] = a;
    }

    function _ids(uint256 a, uint256 b) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](2);
        (ids[0], ids[1]) = (a, b);
    }

    // ============================================================ initialize

    function test_InitializeState() public view {
        assertEq(seats.owner(), dao);
        assertEq(seats.dao(), dao);
        assertEq(seats.itp(), address(itp));
        assertEq(address(seats.oracle()), address(oracle));
        assertTrue(seats.burnEnabled());
        assertEq(seats.maxDailyRuns(), 10);
        assertEq(seats.plan(1).usdCents, 1999);
        assertEq(seats.plan(2).duration, QUARTER);
        assertFalse(seats.plan(3).active);
        assertEq(seats.totalSeats(), 0);
    }

    function test_ImplementationAndProxyCannotReinitialize() public {
        AgentSeats impl = new AgentSeats();
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        impl.initialize(IERC20(address(itp)), dao, oracle, _plans());
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        seats.initialize(IERC20(address(itp)), alice, oracle, _plans());
    }

    function test_InitializeRejectsZeroAddresses() public {
        AgentSeats impl = new AgentSeats();
        bytes memory init = abi.encodeCall(AgentSeats.initialize, (IERC20(address(itp)), address(0), oracle, _plans()));
        vm.expectRevert(IAgentSeats.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), init);
    }

    // ================================================================ quote

    function test_QuoteRoundsUp() public view {
        (uint256 amount, uint256 cents, uint256 price) = seats.quote(1, 1);
        assertEq(cents, 1999);
        assertEq(price, PRICE);
        // 19.99 / 0.00612 = 3266.339869... ITP, rounded up to the wei.
        assertEq(amount, (uint256(1999) * 1e16 * 1e18 + PRICE - 1) / PRICE);
        assertGe(amount * PRICE, uint256(1999) * 1e16 * 1e18);
        (uint256 three,,) = seats.quote(2, 3);
        assertEq(three, (uint256(4999 * 3) * 1e16 * 1e18 + PRICE - 1) / PRICE);
    }

    function test_QuoteRejectsBadInput() public {
        vm.expectRevert(IAgentSeats.InvalidPlan.selector);
        seats.quote(3, 1);
        vm.expectRevert(IAgentSeats.InvalidQuantity.selector);
        seats.quote(1, 0);
        vm.expectRevert(IAgentSeats.InvalidQuantity.selector);
        seats.quote(1, 26);
        oracle.setPrice(0);
        vm.expectRevert(IAgentSeats.InvalidPrice.selector);
        seats.quote(1, 1);
    }

    function testFuzz_QuoteAlwaysCoversUsd(uint256 price, uint8 qty, bool quarter) public {
        price = bound(price, 1e9, 1e24);
        qty = uint8(bound(qty, 1, 25));
        oracle.setPrice(price);
        (uint256 amount, uint256 cents,) = seats.quote(quarter ? 2 : 1, qty);
        assertGe(amount * price, cents * 1e34);
        assertLt((amount - 1) * price, cents * 1e34);
    }

    // ================================================================== buy

    function test_BuyBurnsAndCreatesSeats() public {
        (uint256 cost,,) = seats.quote(1, 3);
        uint256 supply = itp.totalSupply();
        vm.expectEmit(address(seats));
        emit IAgentSeats.SeatUpdated(1, alice, uint64(block.timestamp) + MONTH, false);
        vm.prank(alice);
        uint256 first = seats.buySeats(1, 3, cost);

        assertEq(first, 1);
        assertEq(seats.totalSeats(), 3);
        assertEq(itp.totalSupply(), supply - cost);
        assertEq(itp.balanceOf(address(seats)), 0);
        assertEq(seats.seatBalance(alice), 3);
        uint256[] memory owned = seats.seatsOf(alice);
        assertEq(owned.length, 3);
        assertEq(owned[2], 3);
        IAgentSeats.Seat memory s = seats.seat(2);
        assertEq(s.owner, alice);
        assertEq(s.expiresAt, block.timestamp + MONTH);
        assertTrue(seats.isSeatActive(3));
        assertFalse(seats.isSeatActive(4));

        vm.prank(bob);
        assertEq(seats.buySeats(2, 1, type(uint256).max), 4);
        assertEq(seats.seat(4).expiresAt, block.timestamp + QUARTER);
    }

    function test_BuyEmitsPayment() public {
        (uint256 cost,,) = seats.quote(2, 2);
        vm.expectEmit(address(seats));
        emit IAgentSeats.Payment(alice, 2, 2, 9998, cost, PRICE, true);
        vm.prank(alice);
        seats.buySeats(2, 2, cost);
    }

    function test_BuyRevertsOnSlippage() public {
        (uint256 cost,,) = seats.quote(1, 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IAgentSeats.SlippageExceeded.selector, cost, cost - 1));
        seats.buySeats(1, 1, cost - 1);
    }

    function test_BuyRevertsOnInactivePlanAndQuantity() public {
        vm.prank(dao);
        seats.setPlan(1, MONTH, 1999, false);
        vm.startPrank(alice);
        vm.expectRevert(IAgentSeats.InvalidPlan.selector);
        seats.buySeats(1, 1, type(uint256).max);
        vm.expectRevert(IAgentSeats.InvalidQuantity.selector);
        seats.buySeats(2, 26, type(uint256).max);
        seats.buySeats(2, 25, type(uint256).max);
        vm.stopPrank();
        assertEq(seats.seatBalance(alice), 25);
    }

    function test_BuyWithPermit() public {
        address carol;
        uint256 carolKey;
        (carol, carolKey) = makeAddrAndKey("carol");
        itp.mint(carol, 1_000_000e18);
        (uint256 cost,,) = seats.quote(1, 2);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _permitSig(carolKey, carol, cost, deadline);

        vm.prank(carol);
        seats.buySeatsWithPermit(1, 2, cost, deadline, v, r, s);
        assertEq(seats.seatBalance(carol), 2);
        assertEq(itp.allowance(carol, address(seats)), 0);
    }

    function test_FrontRunPermitDoesNotBlockPurchase() public {
        address carol;
        uint256 carolKey;
        (carol, carolKey) = makeAddrAndKey("carol");
        itp.mint(carol, 1_000_000e18);
        (uint256 cost,,) = seats.quote(1, 1);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _permitSig(carolKey, carol, cost, deadline);
        itp.permit(carol, address(seats), cost, deadline, v, r, s); // griefer submits it first

        vm.prank(carol);
        seats.buySeatsWithPermit(1, 1, cost, deadline, v, r, s);
        assertEq(seats.seatBalance(carol), 1);
    }

    function _permitSig(
        uint256 key,
        address owner_,
        uint256 value,
        uint256 deadline
    )
        internal
        view
        returns (uint8, bytes32, bytes32)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner_,
                address(seats),
                value,
                itp.nonces(owner_),
                deadline
            )
        );
        return vm.sign(key, keccak256(abi.encodePacked("\x19\x01", itp.DOMAIN_SEPARATOR(), structHash)));
    }

    function test_RejectsFeeOnTransferToken() public {
        FeeITP fee = new FeeITP();
        AgentSeats feeSeats = _deploy(IERC20(address(fee)));
        fee.mint(alice, 1_000_000e18);
        vm.startPrank(alice);
        fee.approve(address(feeSeats), type(uint256).max);
        vm.expectRevert(IAgentSeats.TransferAmountMismatch.selector);
        feeSeats.buySeats(1, 1, type(uint256).max);
        vm.stopPrank();
    }

    // ================================================================ renew

    function test_RenewStacksOnUnexpiredSeat() public {
        vm.prank(alice);
        seats.buySeats(1, 1, type(uint256).max);
        uint64 expiry = seats.seat(1).expiresAt;
        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        seats.renewSeats(_ids(1), 2, type(uint256).max);
        assertEq(seats.seat(1).expiresAt, expiry + QUARTER);
    }

    function test_RenewExpiredSeatRestartsFromNow() public {
        vm.prank(alice);
        seats.buySeats(1, 1, type(uint256).max);
        vm.warp(block.timestamp + 45 days);
        assertFalse(seats.isSeatActive(1));
        vm.prank(alice);
        seats.renewSeats(_ids(1), 1, type(uint256).max);
        assertEq(seats.seat(1).expiresAt, block.timestamp + MONTH);
        assertTrue(seats.isSeatActive(1));
    }

    function test_AnyoneCanRenewAndOwnershipIsUnchanged() public {
        vm.prank(alice);
        seats.buySeats(1, 2, type(uint256).max);
        (uint256 cost,,) = seats.quote(1, 2);
        uint256 bobBefore = itp.balanceOf(bob);
        vm.prank(bob);
        assertEq(seats.renewSeats(_ids(1, 2), 1, cost), cost);
        assertEq(itp.balanceOf(bob), bobBefore - cost);
        assertEq(seats.seat(2).owner, alice);
        assertEq(seats.seat(2).expiresAt, block.timestamp + 2 * MONTH);
    }

    function test_RenewUnknownSeatReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IAgentSeats.UnknownSeat.selector, 7));
        seats.renewSeats(_ids(7), 1, type(uint256).max);
        vm.prank(alice);
        vm.expectRevert(IAgentSeats.InvalidQuantity.selector);
        seats.renewSeats(new uint256[](0), 1, type(uint256).max);
    }

    // ============================================================ seat admin

    function test_PauseSeatOnlyOwnerAndClockKeepsRunning() public {
        vm.prank(alice);
        seats.buySeats(1, 2, type(uint256).max);
        uint64 expiry = seats.seat(1).expiresAt;

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IAgentSeats.NotSeatOwner.selector, 1));
        seats.setSeatsPaused(_ids(1), true);

        vm.expectEmit(address(seats));
        emit IAgentSeats.SeatUpdated(1, alice, expiry, true);
        vm.prank(alice);
        seats.setSeatsPaused(_ids(1), true);
        assertFalse(seats.isSeatActive(1));
        assertTrue(seats.isSeatActive(2));

        vm.warp(block.timestamp + 20 days);
        vm.prank(alice);
        seats.setSeatsPaused(_ids(1), false);
        assertTrue(seats.isSeatActive(1));
        assertEq(seats.seat(1).expiresAt, expiry);
    }

    function test_TransferSeats() public {
        vm.prank(alice);
        seats.buySeats(1, 3, type(uint256).max);
        vm.prank(alice);
        seats.setSeatsPaused(_ids(2), true);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IAgentSeats.NotSeatOwner.selector, 2));
        seats.transferSeats(_ids(2), bob);
        vm.prank(alice);
        vm.expectRevert(IAgentSeats.ZeroAddress.selector);
        seats.transferSeats(_ids(2), address(0));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IAgentSeats.NotSeatOwner.selector, 2));
        seats.transferSeats(_ids(2, 2), bob); // second copy is no longer alice's

        vm.prank(alice);
        seats.transferSeats(_ids(2, 3), bob);
        assertEq(seats.seatBalance(alice), 1);
        assertEq(seats.seatBalance(bob), 2);
        assertEq(seats.seat(2).owner, bob);
        assertTrue(seats.seat(2).paused);
        vm.prank(bob);
        seats.setSeatsPaused(_ids(2), false);
        assertTrue(seats.isSeatActive(2));
    }

    // ===================================================== treasury and owner

    function test_BurnOffAccruesAndWithdrawsToDao() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, alice));
        seats.setBurnEnabled(false);

        vm.prank(dao);
        seats.setBurnEnabled(false);
        (uint256 cost,,) = seats.quote(1, 2);
        uint256 supply = itp.totalSupply();
        vm.expectEmit(address(seats));
        emit IAgentSeats.Payment(alice, 1, 2, 3998, cost, PRICE, false);
        vm.prank(alice);
        seats.buySeats(1, 2, cost);
        assertEq(itp.totalSupply(), supply);
        assertEq(itp.balanceOf(address(seats)), cost);

        address newDao = makeAddr("newDao");
        vm.prank(dao);
        seats.setDao(newDao);
        vm.prank(bob); // permissionless, always to the dao
        assertEq(seats.withdrawToDao(), cost);
        assertEq(itp.balanceOf(newDao), cost);
        assertEq(seats.withdrawToDao(), 0);
    }

    function test_OwnerSetters() public {
        vm.startPrank(dao);
        vm.expectRevert(IAgentSeats.ZeroAddress.selector);
        seats.setDao(address(0));
        vm.expectRevert(IAgentSeats.ZeroAddress.selector);
        seats.setOracle(IItpPriceOracle(address(0)));
        vm.expectRevert(IAgentSeats.InvalidRuns.selector);
        seats.setMaxDailyRuns(0);
        vm.expectRevert(IAgentSeats.InvalidRuns.selector);
        seats.setMaxDailyRuns(97);
        vm.expectRevert(IAgentSeats.InvalidPlan.selector);
        seats.setPlan(0, MONTH, 1, true);
        vm.expectRevert(IAgentSeats.InvalidPlan.selector);
        seats.setPlan(3, 367 days, 1, true);

        seats.setMaxDailyRuns(12);
        seats.setPlan(3, 365 days, 17_999, true);
        MockItpOracle next = new MockItpOracle(PRICE * 2);
        seats.setOracle(next);
        vm.stopPrank();

        assertEq(seats.maxDailyRuns(), 12);
        assertEq(seats.plan(3).usdCents, 17_999);
        (uint256 cost,,) = seats.quote(1, 1);
        assertEq(cost, (uint256(1999) * 1e34 + PRICE * 2 - 1) / (PRICE * 2));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, alice));
        seats.setPlan(1, MONTH, 1, true);
    }

    function test_OwnershipTwoStep() public {
        vm.prank(dao);
        seats.transferOwnership(alice);
        assertEq(seats.owner(), dao);
        vm.prank(alice);
        seats.acceptOwnership();
        assertEq(seats.owner(), alice);
        assertEq(seats.dao(), dao); // treasury is independent from ownership
    }

    function test_GlobalPauseBlocksPaymentsOnly() public {
        vm.prank(alice);
        seats.buySeats(1, 1, type(uint256).max);
        vm.prank(dao);
        seats.pause();

        vm.startPrank(alice);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        seats.buySeats(1, 1, type(uint256).max);
        vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
        seats.renewSeats(_ids(1), 1, type(uint256).max);
        seats.setSeatsPaused(_ids(1), true); // managers keep control of their seats
        seats.transferSeats(_ids(1), bob);
        vm.stopPrank();

        vm.prank(dao);
        seats.unpause();
        vm.prank(alice);
        seats.buySeats(1, 1, type(uint256).max);
    }

    function test_RecoverTokenExceptItp() public {
        MockITP other = new MockITP();
        other.mint(address(seats), 5e18);
        vm.startPrank(dao);
        vm.expectRevert(IAgentSeats.CannotRecoverItp.selector);
        seats.recoverToken(address(itp), dao, 1);
        seats.recoverToken(address(other), dao, 5e18);
        vm.stopPrank();
        assertEq(other.balanceOf(dao), 5e18);
    }

    // ============================================================== upgrade

    function test_UpgradeOnlyOwnerAndKeepsState() public {
        vm.prank(alice);
        seats.buySeats(2, 2, type(uint256).max);
        vm.prank(dao);
        seats.setBurnEnabled(false);
        AgentSeatsV2 v2 = new AgentSeatsV2();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, alice));
        seats.upgradeToAndCall(address(v2), "");

        vm.prank(dao);
        seats.upgradeToAndCall(address(v2), "");
        assertEq(AgentSeatsV2(address(seats)).version(), 2);
        assertEq(seats.totalSeats(), 2);
        assertEq(seats.seat(2).owner, alice);
        assertEq(seats.seatsOf(alice).length, 2);
        assertFalse(seats.burnEnabled());
        assertEq(seats.owner(), dao);
        assertEq(seats.maxDailyRuns(), 10);
    }

    function test_StorageSlotIsErc7201() public pure {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("infinitetrading.storage.AgentSeats")) - 1))
            & ~bytes32(uint256(0xff));
        assertEq(slot, 0xdb0913769ce36d75658594fd1260b2c5d5d7706f644d1cc142b23b5f2c41ea00);
    }
}
