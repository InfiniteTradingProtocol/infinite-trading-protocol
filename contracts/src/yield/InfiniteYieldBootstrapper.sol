// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InfiniteRegistryProxy} from "./proxy/InfiniteRegistryProxy.sol";

import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {IVaultV2Factory} from "morpho-vault-v2/interfaces/IVaultV2Factory.sol";
import {IERC20} from "morpho-vault-v2/interfaces/IERC20.sol";
import {IMorphoVaultV1AdapterFactory} from "morpho-vault-v2/adapters/interfaces/IMorphoVaultV1AdapterFactory.sol";
import {SafeERC20Lib} from "morpho-vault-v2/libraries/SafeERC20Lib.sol";

import {InfiniteTradingRegistry} from "./InfiniteTradingRegistry.sol";
import {InfiniteYieldAllocator} from "./InfiniteYieldAllocator.sol";
import {InfiniteYieldAllocatorFactory} from "./InfiniteYieldAllocatorFactory.sol";
import {IInfiniteTradingRegistry} from "./interfaces/IInfiniteTradingRegistry.sol";
import {CompoundV3AdapterFactory} from "./adapters/CompoundV3AdapterFactory.sol";

interface ISkimmable {
    function setSkimRecipient(address newSkimRecipient) external;
}

/// @title InfiniteYieldBootstrapper
/// @notice One-shot deployment + configuration of an Infinite Trading yield vault (Morpho Vault V2) with its
/// InfiniteTradingRegistry (UUPS proxy) and InfiniteYieldAllocator, in two deployer-only transactions
/// (`deployVault`, then `finalize` with the identical config) so each stays under the EIP-7825 gas cap.
/// Every role ends with the DAO Safe; this contract keeps no privilege and can only be used once.
contract InfiniteYieldBootstrapper {
    uint256 internal constant WAD = 1e18;

    enum Kind {
        ERC4626, // MorphoVaultV1Adapter (Morpho vaults, Aave stata, Fluid fToken, ...)
        COMPOUND_V3 // CompoundV3Adapter (Comet)
    }

    struct IntegrationConfig {
        Kind kind;
        address target;
        address rateReader;
        string name;
    }

    struct Config {
        address asset;
        address vaultFactory;
        address morphoVaultV1AdapterFactory;
        address compoundV3AdapterFactory;
        address allocatorFactory;
        address registryImplementation;
        address safe;
        bytes32 salt;
        string name;
        string symbol;
        address[] executors;
        address[] sentinels;
        IntegrationConfig[] integrations;
        uint256 performanceFee;
        uint256 minApyDelta;
        uint256 cooldown;
        uint256 timelock;
        uint256 maxRate;
        uint256 seedAssets;
        address seedReceiver;
    }

    struct Deployment {
        address vault;
        address registry;
        address allocator;
        address[] adapters;
        address initialAdapter;
    }

    /// @dev Keeps `deployVault` under the EIP-7825 per-transaction gas cap (2^24) with margin (~1M gas per adapter).
    uint256 public constant MAX_INTEGRATIONS = 8;

    address public immutable deployer;
    /// @notice 0 = fresh, 1 = vault + adapters deployed, 2 = finalized (terminal).
    uint8 public stage;
    bytes32 public configHash;
    address public deployedVault;
    address[] internal _adapters;

    event VaultDeployed(address indexed vault, address[] adapters, bytes32 configHash);
    event Deployed(address indexed vault, address indexed registry, address indexed allocator, address[] adapters);

    error NotDeployer();
    error WrongStage();
    error ConfigMismatch();
    error InvalidConfig();
    error PostConditionFailed(string what);

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, NotDeployer());
        _;
    }

    function adapters() external view returns (address[] memory) {
        return _adapters;
    }

    /// @notice Transaction 1/2: creates the vault (owned and curated by this contract) and one adapter per integration.
    /// Nothing outside this contract can configure the vault until `finalize` hands it to the Safe.
    function deployVault(Config calldata c) external onlyDeployer returns (address, address[] memory) {
        require(stage == 0, WrongStage());
        require(
            c.asset != address(0) && c.safe != address(0) && c.registryImplementation.code.length > 0
                && c.integrations.length > 0 && c.integrations.length <= MAX_INTEGRATIONS && c.timelock > 0
                && c.maxRate > 0 && c.seedReceiver != address(0),
            InvalidConfig()
        );
        stage = 1;
        configHash = keccak256(abi.encode(c));

        // 1. Vault, owned and curated by this contract during setup.
        IVaultV2 v = IVaultV2(IVaultV2Factory(c.vaultFactory).createVaultV2(address(this), c.asset, c.salt));
        deployedVault = address(v);
        v.setName(c.name);
        v.setSymbol(c.symbol);
        v.setCurator(address(this));

        // 2. Adapters (owner = this, so skim recipients can be set to the Safe).
        for (uint256 i; i < c.integrations.length; i++) {
            IntegrationConfig calldata ic = c.integrations[i];
            address adapter = ic.kind == Kind.ERC4626
                ? IMorphoVaultV1AdapterFactory(c.morphoVaultV1AdapterFactory).createMorphoVaultV1Adapter(deployedVault, ic.target)
                : CompoundV3AdapterFactory(c.compoundV3AdapterFactory).createCompoundV3Adapter(deployedVault, ic.target);
            ISkimmable(adapter).setSkimRecipient(c.safe);
            _adapters.push(adapter);
        }
        emit VaultDeployed(deployedVault, _adapters, configHash);
        return (deployedVault, _adapters);
    }

    /// @notice Transaction 2/2: registry, allocator, caps, fees, seed deposit, timelocks, then hand everything to the
    /// Safe. `c` must be byte-identical to the config given to `deployVault`.
    function finalize(Config calldata c) external onlyDeployer returns (Deployment memory d) {
        require(stage == 1, WrongStage());
        require(keccak256(abi.encode(c)) == configHash, ConfigMismatch());
        stage = 2;
        uint256 assetBalanceBefore = IERC20(c.asset).balanceOf(address(this));

        IVaultV2 vault = IVaultV2(deployedVault);
        d.vault = address(vault);
        d.adapters = _adapters;
        IInfiniteTradingRegistry.IntegrationInput[] memory inputs =
            new IInfiniteTradingRegistry.IntegrationInput[](c.integrations.length);
        for (uint256 i; i < c.integrations.length; i++) {
            IntegrationConfig calldata ic = c.integrations[i];
            inputs[i] = IInfiniteTradingRegistry.IntegrationInput({
                adapter: d.adapters[i], target: ic.target, rateReader: ic.rateReader, name: ic.name
            });
        }

        // 3. Registry proxy + allocator, then initialize the registry (atomic: nobody can front-run initialize).
        d.registry = address(new InfiniteRegistryProxy(c.registryImplementation));
        d.allocator = InfiniteYieldAllocatorFactory(c.allocatorFactory)
            .createAllocator(d.vault, d.registry, c.safe, c.minApyDelta, c.cooldown);
        InfiniteTradingRegistry(d.registry).initialize(c.safe, c.executors, d.vault, d.allocator, inputs);

        // 4. Curator configuration (all timelocks are still 0, so submit + execute in the same tx).
        _exec(vault, abi.encodeCall(IVaultV2.setAdapterRegistry, (d.registry)));
        for (uint256 i; i < d.adapters.length; i++) {
            bytes memory idData = abi.encode("this", d.adapters[i]);
            _exec(vault, abi.encodeCall(IVaultV2.addAdapter, (d.adapters[i])));
            _exec(vault, abi.encodeCall(IVaultV2.increaseAbsoluteCap, (idData, type(uint128).max)));
            _exec(vault, abi.encodeCall(IVaultV2.increaseRelativeCap, (idData, WAD)));
        }
        if (c.performanceFee > 0) {
            _exec(vault, abi.encodeCall(IVaultV2.setPerformanceFeeRecipient, (c.safe)));
            _exec(vault, abi.encodeCall(IVaultV2.setPerformanceFee, (c.performanceFee)));
        }

        // 5. Temporarily become allocator: enable interest accrual, pick the best integration, seed.
        _exec(vault, abi.encodeCall(IVaultV2.setIsAllocator, (address(this), true)));
        vault.setMaxRate(c.maxRate);
        d.initialAdapter = _bestAdapter(d.registry, d.vault);
        vault.setLiquidityAdapterAndData(d.initialAdapter, "");
        if (c.seedAssets > 0) {
            SafeERC20Lib.safeTransferFrom(c.asset, msg.sender, address(this), c.seedAssets);
            SafeERC20Lib.safeApprove(c.asset, d.vault, c.seedAssets);
            vault.deposit(c.seedAssets, c.seedReceiver);
        }
        _exec(vault, abi.encodeCall(IVaultV2.setIsAllocator, (address(this), false)));
        _exec(vault, abi.encodeCall(IVaultV2.setIsAllocator, (d.allocator, true)));

        // 6. Sentinels (can deallocate, decrease caps and revoke pending curator actions).
        for (uint256 i; i < c.sentinels.length; i++) {
            vault.setIsSentinel(c.sentinels[i], true);
        }

        // 7. Timelock every curator function; increaseTimelock itself last.
        bytes4[16] memory selectors = [
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
            IVaultV2.setForceDeallocatePenalty.selector
        ];
        for (uint256 i; i < selectors.length; i++) {
            _exec(vault, abi.encodeCall(IVaultV2.increaseTimelock, (selectors[i], c.timelock)));
        }
        _exec(vault, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.increaseTimelock.selector, c.timelock)));

        // 8. Hand over.
        vault.setCurator(c.safe);
        vault.setOwner(c.safe);

        _checkPostConditions(vault, c, d, assetBalanceBefore);
        emit Deployed(d.vault, d.registry, d.allocator, d.adapters);
    }

    function _exec(IVaultV2 vault, bytes memory data) internal {
        vault.submit(data);
        (bool ok, bytes memory ret) = address(vault).call(data);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
    }

    function _bestAdapter(address registry, address vault) internal virtual returns (address best) {
        (address[] memory adapters, uint256[] memory aprs, bool[] memory ok,) =
            IInfiniteTradingRegistry(registry).getApys(vault);
        uint256 bestApr;
        for (uint256 i; i < adapters.length; i++) {
            if (ok[i] && (best == address(0) || aprs[i] > bestApr)) {
                best = adapters[i];
                bestApr = aprs[i];
            }
        }
        require(best != address(0), PostConditionFailed("no readable integration"));
    }

    function _checkPostConditions(IVaultV2 vault, Config calldata c, Deployment memory d, uint256 assetBalanceBefore)
        internal
        view
    {
        require(vault.owner() == c.safe && vault.curator() == c.safe, PostConditionFailed("roles"));
        require(!vault.isAllocator(address(this)) && vault.isAllocator(d.allocator), PostConditionFailed("allocator"));
        require(vault.adapterRegistry() == d.registry, PostConditionFailed("registry"));
        require(vault.adaptersLength() == d.adapters.length, PostConditionFailed("adapters"));
        require(vault.timelock(IVaultV2.increaseTimelock.selector) == c.timelock, PostConditionFailed("timelock"));
        require(vault.maxRate() == c.maxRate, PostConditionFailed("maxRate"));
        require(InfiniteTradingRegistry(d.registry).owner() == c.safe, PostConditionFailed("registry owner"));
        require(InfiniteYieldAllocator(d.allocator).owner() == c.safe, PostConditionFailed("allocator owner"));
        // Delta (not absolute) check: a donation to this contract must not be able to block finalize.
        require(IERC20(c.asset).balanceOf(address(this)) <= assetBalanceBefore, PostConditionFailed("dust"));
    }
}
