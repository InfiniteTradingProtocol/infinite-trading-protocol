// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {YieldBase} from "./YieldBase.sol";
import {InfiniteWeightedAllocator} from "../../src/yield/InfiniteWeightedAllocator.sol";
import {InfiniteWeightedAllocatorFactory} from "../../src/yield/InfiniteWeightedAllocatorFactory.sol";
import {InfiniteYieldVaultFactory} from "../../src/yield/InfiniteYieldVaultFactory.sol";
import {InfiniteYieldBootstrapper} from "../../src/yield/InfiniteYieldBootstrapper.sol";
import {InfiniteTradingRegistry} from "../../src/yield/InfiniteTradingRegistry.sol";
import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {IERC4626} from "morpho-vault-v2/interfaces/IERC4626.sol";
import {IAdapter} from "morpho-vault-v2/interfaces/IAdapter.sol";

contract WeightedTest is YieldBase {
    InfiniteWeightedAllocator internal weighted;
    InfiniteYieldVaultFactory internal factory;
    InfiniteYieldBootstrapper.Config internal config;
    uint256[] internal weights;

    function setUp() public override {
        super.setUp();
        factory = new InfiniteYieldVaultFactory(safe);
        config = _config();
        config.salt = keccak256("weighted-test");
        config.allocatorFactory = address(new InfiniteWeightedAllocatorFactory());
        config.minApyDelta = 0.01e18;
        weights = new uint256[](4);
        weights[0] = 0.5e18;
        weights[1] = 0.2e18;
        weights[3] = 0.3e18;
        vm.startPrank(safe);
        usdc.mint(safe, SEED);
        usdc.approve(address(factory), SEED);
        factory.start(config, weights);
        InfiniteYieldBootstrapper.Deployment memory d = factory.finalize(0, config);
        vm.stopPrank();
        vault = IVaultV2(d.vault);
        registry = InfiniteTradingRegistry(d.registry);
        weighted = InfiniteWeightedAllocator(d.allocator);
        adapters = d.adapters;
    }

    function _restore() internal {
        vm.prank(keeper1);
        weighted.rebalance();
    }

    function test_factoryTracksRolesAndPolicy() public view {
        assertEq(factory.launchCount(), 1);
        InfiniteYieldVaultFactory.Launch memory l = factory.launch(0);
        assertTrue(l.finalized);
        assertEq(l.vault, address(vault));
        assertEq(l.registry, address(registry));
        assertEq(l.allocator, address(weighted));
        assertEq(weighted.owner(), safe);
        assertEq(vault.owner(), safe);
        assertEq(vault.curator(), safe);
        assertTrue(vault.isAllocator(address(weighted)));
        assertFalse(vault.isAllocator(l.bootstrapper));
        assertEq(vault.liquidityAdapter(), address(0));
        assertEq(weighted.weightOf(adapters[0]), 0.5e18);
        assertEq(weighted.weightOf(adapters[3]), 0.3e18);
    }

    function test_restoresTargetsAndConserves() public {
        _deposit(alice, 10_000e6);
        _restore();
        uint256 total = _sumReal();
        assertApproxEqAbs(_realAssets(0), total / 2, 2);
        assertApproxEqAbs(_realAssets(1), total / 5, 2);
        assertApproxEqAbs(_realAssets(3), total * 3 / 10, 2);
        assertEq(_realAssets(2), 0);
        assertLe(usdc.balanceOf(address(vault)), 4);
        assertApproxEqAbs(total, 10_000e6 + SEED, 4);
        (bool ready,,) = weighted.rebalanceStatus();
        assertFalse(ready);
    }

    function test_keeperCannotChangeWeightsOrBypassCooldown() public {
        vm.startPrank(keeper1);
        vm.expectRevert();
        weighted.proposePolicy(adapters, weights);
        vm.stopPrank();
        _restore();
        _deposit(alice, 1_000e6);
        vm.prank(keeper1);
        vm.expectRevert(InfiniteWeightedAllocator.RebalanceNotReady.selector);
        weighted.rebalance();
        vm.warp(block.timestamp + COOLDOWN);
        _restore();
    }

    function test_policyDelayedAndSentinelCanCancel() public {
        uint256[] memory next = new uint256[](4);
        next[0] = 0.3e18;
        next[1] = 0.4e18;
        next[3] = 0.3e18;
        vm.prank(safe);
        weighted.proposePolicy(adapters, next);
        vm.expectRevert(InfiniteWeightedAllocator.PolicyNotReady.selector);
        weighted.executePolicy(adapters, next);
        vm.prank(keeper1);
        weighted.cancelPolicy();
        vm.warp(block.timestamp + 3 days);
        vm.expectRevert(InfiniteWeightedAllocator.PolicyNotReady.selector);
        weighted.executePolicy(adapters, next);
        vm.prank(safe);
        weighted.proposePolicy(adapters, next);
        vm.warp(weighted.policyEta());
        weighted.executePolicy(adapters, next);
        _deposit(alice, 10_000e6);
        _restore();
        assertApproxEqAbs(_realAssets(1), (10_000e6 + SEED) * 4 / 10, 2);
    }

    function test_invalidPoliciesAndInitializationRejected() public {
        vm.expectRevert(InfiniteWeightedAllocator.Unauthorized.selector);
        weighted.initializePolicy(adapters, weights);
        address[] memory duplicate = new address[](2);
        duplicate[0] = adapters[0];
        duplicate[1] = adapters[0];
        uint256[] memory halves = new uint256[](2);
        halves[0] = 0.5e18;
        halves[1] = 0.5e18;
        vm.prank(safe);
        vm.expectRevert(InfiniteWeightedAllocator.InvalidPolicy.selector);
        weighted.proposePolicy(duplicate, halves);
        weights[0] = 0.6e18;
        vm.prank(safe);
        vm.expectRevert(InfiniteWeightedAllocator.InvalidPolicy.selector);
        weighted.proposePolicy(adapters, weights);
    }

    function test_pausedAndInactiveTargetsFailExplicitly() public {
        vm.prank(keeper1);
        weighted.pause();
        vm.prank(keeper1);
        vm.expectRevert(InfiniteWeightedAllocator.RebalanceNotReady.selector);
        weighted.rebalance();
        vm.prank(safe);
        weighted.unpause();
        vm.prank(safe);
        registry.setIntegrationActive(adapters[0], false);
        (bool ready,,) = weighted.rebalanceStatus();
        assertFalse(ready);
        vm.prank(keeper1);
        vm.expectRevert(InfiniteWeightedAllocator.RebalanceNotReady.selector);
        weighted.rebalance();
    }

    function test_illiquidRebalanceIsAtomic() public {
        _deposit(alice, 10_000e6);
        _restore();
        uint256 beforeAssets = _sumReal();
        uint256[] memory next = new uint256[](4);
        next[3] = 1e18;
        vm.prank(safe);
        weighted.proposePolicy(adapters, next);
        vm.warp(block.timestamp + 3 days);
        weighted.executePolicy(adapters, next);
        aave.setLiquidityCap(0);
        vm.prank(keeper1);
        vm.expectRevert("illiquid");
        weighted.rebalance();
        assertEq(_sumReal(), beforeAssets);
        assertApproxEqAbs(_realAssets(0), beforeAssets / 2, 2);
    }

    function test_atomicMultiVenueRedemptionAndFailure() public {
        uint256 shares = _deposit(alice, 10_000e6);
        _restore();
        bytes[] memory calls = new bytes[](4);
        calls[0] = abi.encodeCall(IVaultV2.forceDeallocate, (adapters[0], "", _realAssets(0), alice));
        calls[1] = abi.encodeCall(IVaultV2.forceDeallocate, (adapters[1], "", _realAssets(1), alice));
        calls[2] = abi.encodeCall(IVaultV2.forceDeallocate, (adapters[3], "", _realAssets(3), alice));
        calls[3] = abi.encodeCall(IERC4626.redeem, (shares, alice, alice));
        aave.setLiquidityCap(0);
        vm.prank(alice);
        vm.expectRevert("illiquid");
        vault.multicall(calls);
        assertEq(vault.balanceOf(alice), shares);
        aave.setLiquidityCap(type(uint256).max);
        vm.prank(alice);
        vault.multicall(calls);
        assertEq(vault.balanceOf(alice), 0);
        assertApproxEqAbs(usdc.balanceOf(alice), 10_000e6, 4);
    }

    function test_factoryRejectsStrangerAndRepeatFinalize() public {
        vm.prank(attacker);
        vm.expectRevert();
        factory.start(config, weights);
        vm.prank(safe);
        vm.expectRevert(InfiniteYieldVaultFactory.InvalidLaunch.selector);
        factory.finalize(0, config);
    }

    function test_factoryMultipleVaults() public {
        config.salt = keccak256("second-vault");
        vm.startPrank(safe);
        usdc.mint(safe, SEED);
        usdc.approve(address(factory), SEED);
        factory.start(config, weights);
        factory.finalize(1, config);
        vm.stopPrank();
        assertEq(factory.launchCount(), 2);
        assertTrue(factory.launch(0).vault != factory.launch(1).vault);
    }

    function testFuzz_weightedConservation(uint256 amount) public {
        amount = bound(amount, 100, 100_000_000e6);
        uint256 shares = _deposit(alice, amount);
        _restore();
        assertApproxEqAbs(_sumReal(), amount + SEED, 5);
        assertLe(vault.previewRedeem(shares), amount);
        assertApproxEqAbs(vault.previewRedeem(shares), amount, 5);
    }
}
