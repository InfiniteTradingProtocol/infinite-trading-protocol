// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AeroTest, AeroToken } from "./Aero.t.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";

contract DeferredHandlerMock {
    mapping(address => uint256) public pendingRedeems;

    function setPending(address account, uint256 amount) external {
        pendingRedeems[account] = amount;
    }

    function release(address account, AeroToken token) external {
        uint256 amount = pendingRedeems[account];
        delete pendingRedeems[account];
        token.mint(account, amount);
    }
}

contract AeroDeferredTest is AeroTest {
    DeferredHandlerMock handler;

    function setUp() public override {
        super.setUp();
        handler = new DeferredHandlerMock();
        address[] memory keepers = new address[](1);
        keepers[0] = KEEPER;
        factory = new AeroFactory(
            DAO,
            TREASURY,
            address(poolFactory),
            address(poolFactory),
            address(gaugeFactory),
            address(gaugeFactory),
            address(voter),
            address(reward),
            address(handler),
            keepers
        );
        vault = AeroVault(factory.createVault(_config(address(gauge))));
        _fund(ALICE);
        _fund(BOB);
    }

    function test_DeferredBaseRewardsAreIncludedInEntryBasket() public {
        _deposit(ALICE, 100 ether);
        handler.setPending(address(vault), 100 ether);
        uint256 beforeReward = reward.balanceOf(BOB);
        _deposit(BOB, 100 ether);
        assertEq(beforeReward - reward.balanceOf(BOB), 86.24 ether);
        assertEq(reward.balanceOf(address(vault)), 86.24 ether);
    }

    function test_ExitRetainsDeferredEntitlementAndDoesNotBlockLp() public {
        _deposit(ALICE, 100 ether);
        handler.setPending(address(vault), 100 ether);
        _redeem(ALICE);
        uint256 credit = vault.deferredCredits(ALICE);
        assertGt(credit, 99 ether);
        assertEq(vault.balanceOf(ALICE), 0);
        vm.prank(ALICE);
        vm.expectRevert(AeroVault.InvalidAmount.selector);
        vault.claimDeferredRewards();
        handler.release(address(vault), reward);
        uint256 beforeReward = reward.balanceOf(ALICE);
        vm.prank(ALICE);
        vault.claimDeferredRewards();
        (uint256 d, uint256 s, uint256 k) = vault.splitReward(credit);
        assertEq(reward.balanceOf(ALICE) - beforeReward, credit - d - s - k);
        assertEq(vault.deferredCredits(ALICE), 0);
        assertEq(vault.totalDeferredCredits(), 0);
        assertEq(vault.deferredReserved(), 0);
        assertEq(reward.balanceOf(TREASURY), 2 ether);
    }

    function test_DeferredLiabilityCannotBeCapturedByLaterDepositor() public {
        _deposit(ALICE, 100 ether);
        handler.setPending(address(vault), 100 ether);
        _redeem(ALICE);
        uint256 credit = vault.deferredCredits(ALICE);
        handler.release(address(vault), reward);
        _deposit(BOB, 100 ether);
        assertEq(vault.deferredReserved(), credit);
        _redeem(BOB);
        assertEq(vault.deferredReserved(), credit);
        uint256 beforeReward = reward.balanceOf(ALICE);
        vm.prank(ALICE);
        vault.claimDeferredRewards();
        assertGt(reward.balanceOf(ALICE) - beforeReward, 86 ether);
    }
}
