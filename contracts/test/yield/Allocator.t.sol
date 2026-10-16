// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ErrorsLib} from "morpho-vault-v2/libraries/ErrorsLib.sol";

import {InfiniteYieldAllocator} from "../../src/yield/InfiniteYieldAllocator.sol";
import {YieldBase} from "./YieldBase.sol";
import {IInfiniteTradingRegistry} from "../../src/yield/interfaces/IInfiniteTradingRegistry.sol";
import {MockLendingVault} from "./mocks/YieldMocks.sol";

contract AllocatorTest is YieldBase {
    // adapters: 0 aave 3.8%, 1 fluid 5.9%, 2 morphoA 5.0%, 3 comet 6.1% (current)

    function setUp() public override {
        super.setUp();
        _deposit(alice, 10_000e6);
    }

    function test_depositsGoToCurrentIntegration() public view {
        assertEq(vault.liquidityAdapter(), adapters[3]);
        assertEq(_realAssets(3), 10_000e6 + SEED);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_rebalanceMovesEverything() public {
        reader.setRate(address(morphoA), 0.061e18 + DELTA);
        vm.warp(block.timestamp + COOLDOWN);
        vm.expectEmit(true, true, true, true, address(allocator));
        emit InfiniteYieldAllocator.Rebalanced(keeper1, adapters[3], adapters[2], 10_000e6 + SEED, 0.061e18, 0.068e18);
        _rebalance(adapters[2]);
        assertEq(vault.liquidityAdapter(), adapters[2]);
        assertEq(_realAssets(3), 0);
        assertEq(_realAssets(2), 10_000e6 + SEED);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(allocator.lastRebalance(), block.timestamp);
        assertEq(usdc.balanceOf(address(allocator)), 0);
    }

    function test_thresholdEnforced() public {
        reader.setRate(address(morphoA), 0.061e18 + DELTA - 1);
        vm.prank(keeper1);
        vm.expectRevert(
            abi.encodeWithSelector(
                InfiniteYieldAllocator.InsufficientApyGain.selector, 0.061e18, 0.061e18 + DELTA - 1, 0.061e18 + DELTA
            )
        );
        allocator.requireRebalance(adapters[2]);
    }

    function test_cooldownEnforced() public {
        reader.setRate(address(morphoA), 0.08e18);
        _rebalance(adapters[2]);
        reader.setRate(address(fluid), 0.10e18);
        uint256 readyAt = block.timestamp + COOLDOWN;
        vm.warp(readyAt - 1);
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.CooldownActive.selector, readyAt));
        allocator.requireRebalance(adapters[1]);
        vm.warp(readyAt);
        _rebalance(adapters[1]);
        assertEq(vault.liquidityAdapter(), adapters[1]);
    }

    function test_onlyExecutors() public {
        reader.setRate(address(morphoA), 0.08e18);
        vm.prank(attacker);
        vm.expectRevert(InfiniteYieldAllocator.NotExecutor.selector);
        allocator.requireRebalance(adapters[2]);
        vm.prank(safe); // even the DAO must use daoRebalance
        vm.expectRevert(InfiniteYieldAllocator.NotExecutor.selector);
        allocator.requireRebalance(adapters[2]);
        vm.prank(keeper2);
        allocator.requireRebalance(adapters[2]);
    }

    function test_removedExecutorLosesAccess() public {
        vm.prank(safe);
        registry.setExecutor(keeper1, false);
        reader.setRate(address(morphoA), 0.08e18);
        vm.prank(keeper1);
        vm.expectRevert(InfiniteYieldAllocator.NotExecutor.selector);
        allocator.requireRebalance(adapters[2]);
    }

    function test_cannotRebalanceToSame() public {
        vm.prank(keeper1);
        vm.expectRevert(InfiniteYieldAllocator.SameAdapter.selector);
        allocator.requireRebalance(adapters[3]);
    }

    function test_cannotRebalanceToInactiveOrUnknown() public {
        reader.setRate(address(morphoA), 0.08e18);
        vm.prank(safe);
        registry.setIntegrationActive(adapters[2], false);
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.NotActiveIntegration.selector, adapters[2]));
        allocator.requireRebalance(adapters[2]);
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.NotActiveIntegration.selector, attacker));
        allocator.requireRebalance(attacker);
    }

    function test_registeredButNotAddedOnVaultIsRejected() public {
        address a = mvaFactory.createMorphoVaultV1Adapter(address(vault), address(usdcVault()));
        reader.setRate(address(lastVault), 0.2e18);
        vm.prank(safe);
        registry.addIntegration(
            address(vault),
            _input(a, address(lastVault))
        );
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.NotVaultAdapter.selector, a));
        allocator.requireRebalance(a);
    }

    function test_exitInactiveIntegrationWithoutApyCheck() public {
        vm.prank(safe);
        registry.setIntegrationActive(adapters[3], false);
        // The current integration is delisted: moving out needs no APY gain, even to a lower APR than Comet's.
        _rebalance(adapters[1]);
        assertEq(vault.liquidityAdapter(), adapters[1]);
        assertEq(_realAssets(1), 10_000e6 + SEED);
    }

    function test_exitInactiveIntegrationOnlyToBest() public {
        vm.prank(safe);
        registry.setIntegrationActive(adapters[3], false);
        // Fluid (5.9%) is the best active integration; an executor cannot park funds in Aave (3.8%).
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.NotBestIntegration.selector, adapters[1], 0.059e18));
        allocator.requireRebalance(adapters[0]);
        (bool ready,, address to,,,) = allocator.bestRebalance();
        assertTrue(ready);
        assertEq(to, adapters[1]);
    }

    function test_brokenSourceReaderBlocksKeeper() public {
        reader.setBroken(address(comet), true);
        reader.setRate(address(morphoA), 0.2e18);
        vm.prank(keeper1);
        vm.expectRevert("reader broken");
        allocator.requireRebalance(adapters[2]);
        (bool ready,,,,,) = allocator.bestRebalance();
        assertFalse(ready);
    }

    function test_brokenDestinationReaderBlocks() public {
        reader.setBroken(address(morphoA), true);
        vm.prank(keeper1);
        vm.expectRevert("reader broken");
        allocator.requireRebalance(adapters[2]);
    }

    function test_illiquidSourceRevertsAtomically() public {
        reader.setRate(address(morphoA), 0.1e18);
        _rebalance(adapters[2]);
        vm.warp(block.timestamp + COOLDOWN);
        morphoA.setLiquidityCap(1_000e6);
        reader.setRate(address(fluid), 0.2e18);
        vm.prank(keeper1);
        vm.expectRevert("illiquid");
        allocator.requireRebalance(adapters[1]);
        assertEq(vault.liquidityAdapter(), adapters[2]);
        assertEq(_realAssets(2), 10_000e6 + SEED);
    }

    function test_destinationRejectingDepositRevertsAtomically() public {
        reader.setRate(address(morphoA), 0.1e18);
        morphoA.setDepositsPaused(true);
        vm.prank(keeper1);
        vm.expectRevert("deposits paused");
        allocator.requireRebalance(adapters[2]);
        assertEq(vault.liquidityAdapter(), adapters[3]);
        assertEq(_realAssets(3), 10_000e6 + SEED);
    }

    function test_pause() public {
        vm.prank(keeper2);
        allocator.pause();
        reader.setRate(address(morphoA), 0.1e18);
        vm.prank(keeper1);
        vm.expectRevert(InfiniteYieldAllocator.IsPaused.selector);
        allocator.requireRebalance(adapters[2]);
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, keeper1));
        allocator.unpause();
        vm.prank(attacker);
        vm.expectRevert(InfiniteYieldAllocator.NotExecutorOrOwner.selector);
        allocator.pause();
        vm.prank(safe);
        allocator.unpause();
        _rebalance(adapters[2]);
    }

    function test_bestRebalanceView() public {
        (bool ready, address from, address to, uint256 fromApr, uint256 toApr,) = allocator.bestRebalance();
        assertFalse(ready);
        assertEq(from, adapters[3]);
        assertEq(to, adapters[3]);
        assertEq(toApr, 0.061e18);
        assertEq(fromApr, 0);

        reader.setRate(address(fluid), 0.0679e18); // +0.69pp: below threshold
        (ready,, to, fromApr, toApr,) = allocator.bestRebalance();
        assertFalse(ready);
        assertEq(to, adapters[1]);
        assertEq(fromApr, 0.061e18);

        reader.setRate(address(fluid), 0.068e18); // +0.70pp
        (ready,, to,,,) = allocator.bestRebalance();
        assertTrue(ready);
        assertEq(to, adapters[1]);
        _rebalance(to);

        reader.setRate(address(aave), 0.2e18);
        uint256 readyAt;
        (ready,, to,,, readyAt) = allocator.bestRebalance();
        assertFalse(ready); // cooldown
        assertEq(readyAt, block.timestamp + COOLDOWN);
        vm.warp(readyAt);
        (ready,, to,,,) = allocator.bestRebalance();
        assertTrue(ready);
        assertEq(to, adapters[0]);
    }

    function test_allocateIdleAfterForceDeallocate() public {
        // Anyone can force-deallocate (penalty 0): funds land idle in the vault.
        vm.prank(attacker);
        vault.forceDeallocate(adapters[3], "", 5_000e6, attacker);
        assertEq(usdc.balanceOf(address(vault)), 5_000e6);
        vm.prank(keeper1);
        allocator.allocateIdle();
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(_realAssets(3), 10_000e6 + SEED);
        vm.prank(attacker);
        vm.expectRevert(InfiniteYieldAllocator.NotExecutor.selector);
        allocator.allocateIdle();
    }

    function test_rebalanceAlsoSweepsIdle() public {
        vm.prank(attacker);
        vault.forceDeallocate(adapters[3], "", 4_000e6, attacker);
        reader.setRate(address(morphoA), 0.1e18);
        _rebalance(adapters[2]);
        assertEq(_realAssets(2), 10_000e6 + SEED);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_daoRebalanceAndEmergencyIdle() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        allocator.daoRebalance(adapters[3], adapters[0]);

        vm.prank(safe);
        allocator.daoRebalance(adapters[3], adapters[0]); // no APY check
        assertEq(vault.liquidityAdapter(), adapters[0]);
        assertEq(_realAssets(0), 10_000e6 + SEED);

        vm.prank(safe);
        allocator.daoRebalance(adapters[0], address(0)); // everything idle
        assertEq(vault.liquidityAdapter(), address(0));
        assertEq(usdc.balanceOf(address(vault)), 10_000e6 + SEED);

        // Users can still withdraw from idle.
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        assertApproxEqAbs(vault.redeem(shares, alice, alice), 10_000e6, 1);

        // From no liquidity adapter, the keeper must pick the best integration.
        vm.prank(keeper1);
        vm.expectRevert(abi.encodeWithSelector(InfiniteYieldAllocator.NotBestIntegration.selector, adapters[3], 0.061e18));
        allocator.requireRebalance(adapters[1]);
        _rebalance(adapters[3]);
        assertEq(_realAssets(3), SEED);
    }

    function test_parameterBounds() public {
        vm.startPrank(safe);
        allocator.setMinApyDelta(0.001e18);
        allocator.setMinApyDelta(0.05e18);
        vm.expectRevert(InfiniteYieldAllocator.OutOfBounds.selector);
        allocator.setMinApyDelta(0.001e18 - 1);
        vm.expectRevert(InfiniteYieldAllocator.OutOfBounds.selector);
        allocator.setMinApyDelta(0.05e18 + 1);
        allocator.setCooldown(10 minutes);
        allocator.setCooldown(30 days);
        vm.expectRevert(InfiniteYieldAllocator.OutOfBounds.selector);
        allocator.setCooldown(10 minutes - 1);
        vm.expectRevert(InfiniteYieldAllocator.OutOfBounds.selector);
        allocator.setCooldown(30 days + 1);
        vm.expectRevert(InfiniteYieldAllocator.RenounceDisabled.selector);
        allocator.renounceOwnership();
        vm.stopPrank();
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        allocator.setCooldown(1 days);
    }

    function test_setMaxRateOnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        allocator.setMaxRate(0);
        vm.prank(safe);
        allocator.setMaxRate(1);
        assertEq(vault.maxRate(), 1);
    }

    function test_nobodyElseCanAllocate() public {
        vm.prank(keeper1);
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        vault.allocate(adapters[0], "", 0);
        vm.prank(safe);
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        vault.allocate(adapters[0], "", 0);
    }

    function test_sentinelCanDeallocateInEmergency() public {
        vm.prank(keeper1); // keeper1 is sentinel
        vault.deallocate(adapters[3], "", 10_000e6 + SEED);
        assertEq(usdc.balanceOf(address(vault)), 10_000e6 + SEED);
    }

    function test_interestAccruesAndPerformanceFee() public {
        uint256 shares = vault.balanceOf(alice);
        comet.accrue(adapters[3], 101e6); // ~1% gain on 10,001 USDC
        vm.warp(block.timestamp + 30 days);
        vault.accrueInterest();
        uint256 aliceAssets = vault.previewRedeem(shares);
        // 90% of the gain goes to depositors (10% performance fee).
        assertApproxEqRel(aliceAssets, 10_000e6 + uint256(101e6) * 9 / 10 * 10_000 / 10_001, 1e15);
        assertGt(vault.balanceOf(safe), vault.previewDeposit(SEED));
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        assertApproxEqAbs(out, aliceAssets, 2);
    }

    function test_rebalanceKeepsSharePrice() public {
        comet.accrue(adapters[3], 50e6);
        vm.warp(block.timestamp + 1 days);
        vault.accrueInterest();
        uint256 before = vault.previewRedeem(1e18);
        reader.setRate(address(morphoA), 0.1e18);
        _rebalance(adapters[2]);
        vault.accrueInterest();
        assertApproxEqAbs(vault.previewRedeem(1e18), before, 1);
    }

    /* helpers */

    address internal lastVault;

    function usdcVault() internal returns (address) {
        lastVault = address(new MockLendingVault(usdc, "new"));
        return lastVault;
    }

    function _input(address a, address t) internal view returns (IInfiniteTradingRegistry.IntegrationInput memory) {
        return IInfiniteTradingRegistry.IntegrationInput({adapter: a, target: t, rateReader: address(reader), name: "new"});
    }
}
