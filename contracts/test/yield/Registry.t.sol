// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

import {InfiniteTradingRegistry} from "../../src/yield/InfiniteTradingRegistry.sol";
import {IInfiniteTradingRegistry} from "../../src/yield/interfaces/IInfiniteTradingRegistry.sol";
import {YieldBase} from "./YieldBase.sol";
import {MockLendingVault, NotAnAdapter} from "./mocks/YieldMocks.sol";

contract InfiniteTradingRegistryV2Mock is InfiniteTradingRegistry {
    constructor(uint256 d) InfiniteTradingRegistry(d) {}

    function version() external pure returns (uint256) {
        return 2;
    }
}

contract RegistryTest is YieldBase {
    function _newAdapterFor(address target) internal returns (address) {
        return mvaFactory.createMorphoVaultV1Adapter(address(vault), target);
    }

    function test_implementationCannotBeInitialized() public {
        IInfiniteTradingRegistry.IntegrationInput[] memory none;
        address[] memory ex;
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        registryImpl.initialize(attacker, ex, address(0), address(0), none);
    }

    function test_proxyCannotBeReinitialized() public {
        IInfiniteTradingRegistry.IntegrationInput[] memory none;
        address[] memory ex;
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        registry.initialize(attacker, ex, address(0), address(0), none);
    }

    function test_storageSlotIsErc7201() public pure {
        bytes32 expected = keccak256(abi.encode(uint256(keccak256("infinitetrading.storage.InfiniteTradingRegistry")) - 1))
            & ~bytes32(uint256(0xff));
        assertEq(expected, 0x708ef159c75585daef7f01c1565730413a60b658f645c33eb89844d0c916a800);
    }

    function test_onlyOwnerMutations() public {
        IInfiniteTradingRegistry.IntegrationInput memory input;
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.setExecutor(attacker, true);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.setIntegrationActive(adapters[0], false);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.setRateReader(adapters[0], address(reader));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.addIntegration(address(vault), input);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.setVault(address(vault), attacker, true);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.proposeUpgrade(address(registryImpl));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.setIntegrationName(adapters[0], "x");
        vm.stopPrank();
    }

    function test_executors() public {
        vm.startPrank(safe);
        registry.setExecutor(bob, true);
        assertTrue(registry.isExecutor(bob));
        assertEq(registry.executors().length, 3);
        registry.setExecutor(keeper2, false);
        assertFalse(registry.isExecutor(keeper2));
        assertEq(registry.executors().length, 2);
        vm.expectRevert(IInfiniteTradingRegistry.ZeroAddress.selector);
        registry.setExecutor(address(0), true);
        vm.stopPrank();
    }

    function test_addIntegration() public {
        MockLendingVault spark = new MockLendingVault(usdc, "spark");
        reader.setRate(address(spark), 0.07e18);
        address a = _newAdapterFor(address(spark));
        vm.prank(safe);
        registry.addIntegration(
            address(vault),
            IInfiniteTradingRegistry.IntegrationInput({
                adapter: a, target: address(spark), rateReader: address(reader), name: "Spark"
            })
        );
        assertTrue(registry.isInRegistry(a));
        assertTrue(registry.isActiveFor(address(vault), a));
        assertEq(registry.getApy(a), 0.07e18);
        assertEq(registry.integrationsOf(address(vault)).length, 5);
        assertEq(registry.allIntegrations().length, 5);
    }

    function test_addIntegrationValidation() public {
        MockLendingVault spark = new MockLendingVault(usdc, "spark");
        address a = _newAdapterFor(address(spark));
        IInfiniteTradingRegistry.IntegrationInput memory input = IInfiniteTradingRegistry.IntegrationInput({
            adapter: a, target: address(spark), rateReader: address(reader), name: "Spark"
        });
        vm.startPrank(safe);

        // Unlisted vault.
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.VaultNotListed.selector, bob));
        registry.addIntegration(bob, input);

        // Wrong target label.
        input.target = address(fluid);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.AdapterTargetMismatch.selector, a, address(fluid)));
        registry.addIntegration(address(vault), input);
        input.target = address(spark);

        // Adapter of another vault.
        NotAnAdapter foreign = new NotAnAdapter();
        input.adapter = address(foreign);
        vm.expectRevert(
            abi.encodeWithSelector(IInfiniteTradingRegistry.AdapterVaultMismatch.selector, address(foreign), address(vault))
        );
        registry.addIntegration(address(vault), input);
        input.adapter = a;

        // Reader without code / implausible rate / broken.
        input.rateReader = bob;
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.NoCode.selector, bob));
        registry.addIntegration(address(vault), input);
        input.rateReader = address(reader);
        reader.setRate(address(spark), 1e18 + 1);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.RateTooHigh.selector, a, 1e18 + 1));
        registry.addIntegration(address(vault), input);
        reader.setRate(address(spark), 0.05e18);
        reader.setBroken(address(spark), true);
        vm.expectRevert("reader broken");
        registry.addIntegration(address(vault), input);
        reader.setBroken(address(spark), false);

        // Duplicate.
        registry.addIntegration(address(vault), input);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.AlreadyRegistered.selector, a));
        registry.addIntegration(address(vault), input);
        vm.stopPrank();
    }

    function test_deactivateBlocksAddAdapterButNotWithdrawals() public {
        _deposit(alice, 1000e6);
        address current = vault.liquidityAdapter();
        vm.prank(safe);
        registry.setIntegrationActive(current, false);
        assertFalse(registry.isInRegistry(current));
        // Withdrawals still work through the delisted adapter.
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        assertApproxEqAbs(out, 1000e6, 1);
    }

    function test_getApysToleratesBrokenReader() public {
        reader.setBroken(address(fluid), true);
        (address[] memory a, uint256[] memory aprs, bool[] memory ok, bool[] memory active) =
            registry.getApys(address(vault));
        assertEq(a.length, 4);
        assertFalse(ok[1]);
        assertTrue(ok[0] && ok[2] && ok[3]);
        assertEq(aprs[3], 0.061e18);
        assertTrue(active[1]);
        vm.expectRevert("reader broken");
        registry.getApy(adapters[1]);
    }

    function test_getApyRejectsImplausibleRate() public {
        reader.setRate(address(fluid), 2e18);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.RateTooHigh.selector, adapters[1], 2e18));
        registry.getApy(adapters[1]);
    }

    function test_setRateReader() public {
        vm.prank(safe);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.NoCode.selector, bob));
        registry.setRateReader(adapters[0], bob);
        vm.prank(safe);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.UnknownIntegration.selector, bob));
        registry.setRateReader(bob, address(reader));
    }

    function test_renounceDisabled() public {
        vm.prank(safe);
        vm.expectRevert(IInfiniteTradingRegistry.RenounceDisabled.selector);
        registry.renounceOwnership();
    }

    function test_ownershipIsTwoStep() public {
        vm.prank(safe);
        registry.transferOwnership(bob);
        assertEq(registry.owner(), safe);
        vm.prank(bob);
        registry.acceptOwnership();
        assertEq(registry.owner(), bob);
    }

    /* ---------------------------------------------------------------- upgrades */

    function test_upgradeRequiresProposalAndDelay() public {
        InfiniteTradingRegistryV2Mock v2 = new InfiniteTradingRegistryV2Mock(TIMELOCK);

        vm.prank(safe);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.UpgradeNotProposed.selector, address(v2)));
        registry.upgradeToAndCall(address(v2), "");

        vm.prank(safe);
        registry.proposeUpgrade(address(v2));
        uint256 eta = block.timestamp + TIMELOCK;
        assertEq(registry.upgradeEta(address(v2)), eta);

        vm.warp(eta - 1);
        vm.prank(safe);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.UpgradeNotReady.selector, address(v2), eta));
        registry.upgradeToAndCall(address(v2), "");

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        registry.upgradeToAndCall(address(v2), "");

        vm.warp(eta);
        vm.prank(safe);
        registry.upgradeToAndCall(address(v2), "");
        assertEq(InfiniteTradingRegistryV2Mock(address(registry)).version(), 2);
        assertEq(
            address(uint160(uint256(vm.load(address(registry), ERC1967Utils.IMPLEMENTATION_SLOT)))), address(v2)
        );
        // State preserved.
        assertTrue(registry.isExecutor(keeper1));
        assertEq(registry.integrationsOf(address(vault)).length, 4);
        assertEq(registry.owner(), safe);
        // Proposal consumed.
        assertEq(registry.upgradeEta(address(v2)), 0);
    }

    function test_cancelUpgrade() public {
        InfiniteTradingRegistryV2Mock v2 = new InfiniteTradingRegistryV2Mock(TIMELOCK);
        vm.startPrank(safe);
        registry.proposeUpgrade(address(v2));
        registry.cancelUpgrade(address(v2));
        vm.warp(block.timestamp + TIMELOCK);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.UpgradeNotProposed.selector, address(v2)));
        registry.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }

    function test_proposeRequiresCode() public {
        vm.prank(safe);
        vm.expectRevert(abi.encodeWithSelector(IInfiniteTradingRegistry.NoCode.selector, bob));
        registry.proposeUpgrade(bob);
    }

    function test_upgradeDelayBounds() public {
        vm.expectRevert(IInfiniteTradingRegistry.InvalidDelay.selector);
        new InfiniteTradingRegistry(1 days - 1);
        vm.expectRevert(IInfiniteTradingRegistry.InvalidDelay.selector);
        new InfiniteTradingRegistry(30 days + 1);
    }

    function test_vaultUnlist() public {
        vm.prank(safe);
        registry.setVault(address(vault), address(0), false);
        assertFalse(registry.isListedVault(address(vault)));
        assertEq(registry.allocatorOf(address(vault)), address(0));
    }
}
