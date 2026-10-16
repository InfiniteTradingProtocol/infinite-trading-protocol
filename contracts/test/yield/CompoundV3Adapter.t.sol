// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CompoundV3Adapter} from "../../src/yield/adapters/CompoundV3Adapter.sol";
import {CompoundV3RateReader} from "../../src/yield/readers/CompoundV3RateReader.sol";
import {YieldBase} from "./YieldBase.sol";
import {MockComet, MockUSDC} from "./mocks/YieldMocks.sol";

contract CompoundV3AdapterTest is YieldBase {
    CompoundV3Adapter internal adapter;

    function setUp() public override {
        super.setUp();
        adapter = CompoundV3Adapter(adapters[3]);
        _deposit(alice, 1_000e6);
    }

    function test_immutables() public view {
        assertEq(adapter.parentVault(), address(vault));
        assertEq(adapter.comet(), address(comet));
        assertEq(adapter.asset(), address(usdc));
        assertEq(adapter.factory(), address(compFactory));
        assertEq(adapter.adapterId(), keccak256(abi.encode("this", address(adapter))));
        assertEq(compFactory.compoundV3Adapter(address(vault), address(comet)), address(adapter));
    }

    function test_assetMismatch() public {
        MockComet other = new MockComet(address(new MockUSDC()));
        vm.expectRevert(CompoundV3Adapter.AssetMismatch.selector);
        compFactory.createCompoundV3Adapter(address(vault), address(other));
    }

    function test_onlyVault() public {
        vm.startPrank(attacker);
        vm.expectRevert(CompoundV3Adapter.NotAuthorized.selector);
        adapter.allocate("", 0, bytes4(0), attacker);
        vm.expectRevert(CompoundV3Adapter.NotAuthorized.selector);
        adapter.deallocate("", 0, bytes4(0), attacker);
        vm.expectRevert(CompoundV3Adapter.NotAuthorized.selector);
        adapter.setSkimRecipient(attacker);
        vm.expectRevert(CompoundV3Adapter.NotAuthorized.selector);
        adapter.skim(address(usdc));
        vm.stopPrank();
    }

    function test_rejectsData() public {
        vm.prank(address(vault));
        vm.expectRevert(CompoundV3Adapter.InvalidData.selector);
        adapter.allocate(hex"01", 0, bytes4(0), address(0));
    }

    function test_canNeverBorrow() public {
        uint256 bal = comet.balanceOf(address(adapter));
        // Sentinel/allocator tries to deallocate more than supplied: Comet would borrow, the adapter refuses.
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(CompoundV3Adapter.InsufficientSupply.selector, bal + 1, bal));
        vault.deallocate(address(adapter), "", bal + 1);
        // Same through permissionless forceDeallocate.
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CompoundV3Adapter.InsufficientSupply.selector, bal + 1, bal));
        vault.forceDeallocate(address(adapter), "", bal + 1, attacker);
        assertEq(comet.borrowBalanceOf(address(adapter)), 0);
    }

    function test_withdrawMoreThanIdleUsesAdapter() public {
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeem(shares, alice, alice);
        assertApproxEqAbs(usdc.balanceOf(alice), 1_000e6, 1);
        assertEq(comet.borrowBalanceOf(address(adapter)), 0);
    }

    function test_interestShowsInRealAssets() public {
        comet.accrue(address(adapter), 7e6);
        assertEq(adapter.realAssets(), 1_000e6 + SEED + 7e6);
    }

    function test_skimRewards() public {
        MockUSDC comp = new MockUSDC();
        comp.mint(address(adapter), 5e6);
        vm.prank(safe);
        adapter.skim(address(comp));
        assertEq(comp.balanceOf(safe), 5e6);
        vm.prank(safe);
        vm.expectRevert(CompoundV3Adapter.CannotSkimComet.selector);
        adapter.skim(address(comet));
    }

    function test_compoundRateReader() public {
        CompoundV3RateReader r = new CompoundV3RateReader();
        comet.setSupplyRatePerSecond(1934170000); // ~6.1% APR
        assertApproxEqRel(r.supplyRate(address(comet)), 0.061e18, 0.001e18);
    }
}
