// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {MAX_MAX_RATE} from "morpho-vault-v2/libraries/ConstantsLib.sol";
import {ErrorsLib} from "morpho-vault-v2/libraries/ErrorsLib.sol";

import {InfiniteYieldBootstrapper} from "../../src/yield/InfiniteYieldBootstrapper.sol";
import {YieldBase} from "./YieldBase.sol";

interface ISkimView {
    function skimRecipient() external view returns (address);
}

contract BootstrapperTest is YieldBase {
    function test_rolesEndWithSafe() public view {
        assertEq(vault.owner(), safe);
        assertEq(vault.curator(), safe);
        assertEq(registry.owner(), safe);
        assertEq(allocator.owner(), safe);
        assertFalse(vault.isAllocator(address(boot)));
        assertTrue(vault.isAllocator(address(allocator)));
        assertFalse(vault.isSentinel(address(boot)));
        assertTrue(vault.isSentinel(safe));
        assertTrue(vault.isSentinel(keeper1));
        assertFalse(vault.isSentinel(keeper2));
        assertEq(boot.stage(), 2);
    }

    function test_vaultConfig() public view {
        assertEq(vault.asset(), address(usdc));
        assertEq(vault.adapterRegistry(), address(registry));
        assertEq(vault.adaptersLength(), 4);
        assertEq(vault.performanceFee(), 0.1e18);
        assertEq(vault.performanceFeeRecipient(), safe);
        assertEq(vault.managementFee(), 0);
        assertEq(vault.maxRate(), MAX_MAX_RATE);
        assertEq(vault.receiveSharesGate(), address(0));
        assertEq(vault.sendSharesGate(), address(0));
        assertEq(vault.receiveAssetsGate(), address(0));
        assertEq(vault.sendAssetsGate(), address(0));
        assertEq(IVaultName(address(vault)).name(), "Infinite Trading USD Yield");
        assertEq(IVaultName(address(vault)).symbol(), "itUSDY");
        for (uint256 i; i < 4; i++) {
            bytes32 id = keccak256(abi.encode("this", adapters[i]));
            assertEq(vault.absoluteCap(id), type(uint128).max);
            assertEq(vault.relativeCap(id), 1e18);
            assertEq(vault.forceDeallocatePenalty(adapters[i]), 0);
            assertTrue(vault.isAdapter(adapters[i]));
            assertEq(ISkimView(adapters[i]).skimRecipient(), safe);
        }
    }

    function test_allTimelocksAreSet() public view {
        bytes4[17] memory sels = [
            IVaultV2.setIsAllocator.selector,
            IVaultV2.setReceiveSharesGate.selector,
            IVaultV2.setSendSharesGate.selector,
            IVaultV2.setReceiveAssetsGate.selector,
            IVaultV2.setSendAssetsGate.selector,
            IVaultV2.setAdapterRegistry.selector,
            IVaultV2.addAdapter.selector,
            IVaultV2.removeAdapter.selector,
            IVaultV2.abdicate.selector,
            IVaultV2.setPerformanceFee.selector,
            IVaultV2.setManagementFee.selector,
            IVaultV2.setPerformanceFeeRecipient.selector,
            IVaultV2.setManagementFeeRecipient.selector,
            IVaultV2.increaseAbsoluteCap.selector,
            IVaultV2.increaseRelativeCap.selector,
            IVaultV2.setForceDeallocatePenalty.selector,
            IVaultV2.increaseTimelock.selector
        ];
        for (uint256 i; i < sels.length; i++) {
            assertEq(vault.timelock(sels[i]), TIMELOCK);
        }
    }

    function test_seedWentToBestIntegration() public view {
        // Compound mock is the best at deploy (6.1%).
        assertEq(vault.liquidityAdapter(), adapters[3]);
        assertEq(_realAssets(3), SEED);
        assertEq(vault.balanceOf(safe), vault.previewDeposit(SEED));
        assertEq(usdc.balanceOf(address(boot)), 0);
    }

    function test_registryInitialized() public view {
        assertTrue(registry.isExecutor(keeper1));
        assertTrue(registry.isExecutor(keeper2));
        assertEq(registry.executors().length, 2);
        assertEq(registry.vaults().length, 1);
        assertEq(registry.allocatorOf(address(vault)), address(allocator));
        assertEq(registry.integrationsOf(address(vault)).length, 4);
        for (uint256 i; i < 4; i++) {
            assertTrue(registry.isInRegistry(adapters[i]));
            assertEq(registry.integration(adapters[i]).target, targets[i]);
        }
        assertTrue(allocFactory.isAllocator(address(allocator)));
        assertTrue(compFactory.isCompoundV3Adapter(adapters[3]));
    }

    function test_cannotReuse() public {
        vm.startPrank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.WrongStage.selector);
        boot.deployVault(_config());
        vm.expectRevert(InfiniteYieldBootstrapper.WrongStage.selector);
        boot.finalize(_config());
        vm.stopPrank();
    }

    function test_onlyDeployer() public {
        vm.prank(deployerEOA);
        InfiniteYieldBootstrapper b = new InfiniteYieldBootstrapper();
        vm.prank(attacker);
        vm.expectRevert(InfiniteYieldBootstrapper.NotDeployer.selector);
        b.deployVault(_config());
        vm.prank(deployerEOA);
        b.deployVault(_freshSalt());
        vm.prank(attacker);
        vm.expectRevert(InfiniteYieldBootstrapper.NotDeployer.selector);
        b.finalize(_freshSalt());
    }

    function test_finalizeBeforeDeployVaultReverts() public {
        vm.prank(deployerEOA);
        InfiniteYieldBootstrapper b = new InfiniteYieldBootstrapper();
        vm.prank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.WrongStage.selector);
        b.finalize(_freshSalt());
    }

    function test_finalizeRejectsChangedConfig() public {
        InfiniteYieldBootstrapper b = _stage1();
        InfiniteYieldBootstrapper.Config memory c = _freshSalt();
        c.executors[1] = attacker;
        vm.prank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.ConfigMismatch.selector);
        b.finalize(c);
        c = _freshSalt();
        c.safe = attacker;
        vm.prank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.ConfigMismatch.selector);
        b.finalize(c);
    }

    /// @dev Between the two transactions the bootstrapper address is public: donations and stray deposits must not
    /// block finalize or leave the vault misconfigured.
    function test_griefingBetweenStagesCannotBlockFinalize() public {
        InfiniteYieldBootstrapper b = _stage1();
        IVaultV2 v = IVaultV2(b.deployedVault());
        usdc.mint(attacker, 10e6);
        vm.startPrank(attacker);
        usdc.transfer(address(b), 1);
        usdc.approve(address(v), 5e6);
        v.deposit(5e6, attacker);
        vm.expectRevert();
        v.setCurator(attacker);
        vm.stopPrank();

        usdc.mint(deployerEOA, SEED);
        vm.startPrank(deployerEOA);
        usdc.approve(address(b), SEED);
        InfiniteYieldBootstrapper.Deployment memory d = b.finalize(_freshSalt());
        vm.stopPrank();
        assertEq(IVaultV2(d.vault).owner(), safe);
        assertEq(IVaultV2(d.vault).curator(), safe);
        assertEq(b.stage(), 2);
    }

    function test_vaultIsLockedToBootstrapperBetweenStages() public {
        InfiniteYieldBootstrapper b = _stage1();
        IVaultV2 v = IVaultV2(b.deployedVault());
        assertEq(v.owner(), address(b));
        assertEq(v.curator(), address(b));
        assertEq(v.adaptersLength(), 0);
        assertEq(b.adapters().length, 4);
        bytes memory data = abi.encodeCall(IVaultV2.setIsAllocator, (attacker, true));
        vm.prank(attacker);
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        v.submit(data);
    }

    function test_rejectsTooManyIntegrations() public {
        vm.prank(deployerEOA);
        InfiniteYieldBootstrapper b = new InfiniteYieldBootstrapper();
        InfiniteYieldBootstrapper.Config memory c = _freshSalt();
        InfiniteYieldBootstrapper.IntegrationConfig[] memory many =
            new InfiniteYieldBootstrapper.IntegrationConfig[](b.MAX_INTEGRATIONS() + 1);
        for (uint256 i; i < many.length; i++) {
            many[i] = c.integrations[0];
        }
        c.integrations = many;
        vm.prank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.InvalidConfig.selector);
        b.deployVault(c);
    }

    function _freshSalt() internal view returns (InfiniteYieldBootstrapper.Config memory c) {
        c = _config();
        c.salt = keccak256("second");
    }

    function _stage1() internal returns (InfiniteYieldBootstrapper b) {
        vm.prank(deployerEOA);
        b = new InfiniteYieldBootstrapper();
        vm.prank(deployerEOA);
        b.deployVault(_freshSalt());
    }

    function test_rejectsZeroMaxRate() public {
        vm.prank(deployerEOA);
        InfiniteYieldBootstrapper b = new InfiniteYieldBootstrapper();
        InfiniteYieldBootstrapper.Config memory c = _config();
        c.maxRate = 0;
        vm.prank(deployerEOA);
        vm.expectRevert(InfiniteYieldBootstrapper.InvalidConfig.selector);
        b.deployVault(c);
    }

    function test_curatorActionsNowNeedThreeDays() public {
        bytes memory data = abi.encodeCall(IVaultV2.setIsAllocator, (attacker, true));
        vm.prank(safe);
        vault.submit(data);
        vm.expectRevert(ErrorsLib.TimelockNotExpired.selector);
        vault.setIsAllocator(attacker, true);
        // Sentinel can veto it.
        vm.prank(keeper1);
        vault.revoke(data);
        vm.warp(block.timestamp + TIMELOCK);
        vm.expectRevert(ErrorsLib.DataNotTimelocked.selector);
        vault.setIsAllocator(attacker, true);
    }

    function test_bootstrapperHasNoPowerLeft() public {
        vm.startPrank(address(boot));
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        vault.setOwner(address(boot));
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        vault.submit(abi.encodeCall(IVaultV2.setIsAllocator, (address(boot), true)));
        vm.expectRevert(ErrorsLib.Unauthorized.selector);
        vault.allocate(adapters[0], "", 0);
        vm.stopPrank();
    }
}

interface IVaultName {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}
