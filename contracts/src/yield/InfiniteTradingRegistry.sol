// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {IInfiniteTradingRegistry} from "./interfaces/IInfiniteTradingRegistry.sol";
import {IRateReader} from "./interfaces/IRateReader.sol";

interface IParentVaultAdapter {
    function parentVault() external view returns (address);
}

interface IMorphoVaultV1AdapterTarget {
    function morphoVaultV1() external view returns (address);
}

interface ICompoundV3AdapterTarget {
    function comet() external view returns (address);
}

/// @title InfiniteTradingRegistry
/// @notice DAO-managed source of truth for Infinite Trading vaults: the whitelisted integrations (adapters + on-chain
/// rate readers) and the allowed executors (keepers).
/// @dev Plugged into Morpho Vault V2 as `adapterRegistry`: a vault can only add adapters that are active here.
/// @dev UUPS upgradeable. Every upgrade must be proposed and can only execute after `UPGRADE_DELAY`, which is an
/// immutable of the implementation (changing it requires a timelocked upgrade).
/// @dev ERC-7201 namespaced storage.
contract InfiniteTradingRegistry is
    IInfiniteTradingRegistry,
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable
{
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @notice Sanity bound for reader outputs: any APR above 100% is treated as a broken reader.
    uint256 public constant MAX_APR = 1e18;
    uint256 public constant MIN_UPGRADE_DELAY = 1 days;
    uint256 public constant MAX_UPGRADE_DELAY = 30 days;

    uint256 public immutable UPGRADE_DELAY;

    /// @custom:storage-location erc7201:infinitetrading.storage.InfiniteTradingRegistry
    struct RegistryStorage {
        EnumerableSet.AddressSet executors;
        EnumerableSet.AddressSet vaults;
        EnumerableSet.AddressSet adapters;
        mapping(address vault => address) allocator;
        mapping(address vault => EnumerableSet.AddressSet) vaultAdapters;
        mapping(address adapter => Integration) integrations;
        mapping(address implementation => uint256) upgradeEta;
    }

    // keccak256(abi.encode(uint256(keccak256("infinitetrading.storage.InfiniteTradingRegistry")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION = 0x708ef159c75585daef7f01c1565730413a60b658f645c33eb89844d0c916a800;

    function _s() private pure returns (RegistryStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint256 upgradeDelay) {
        require(upgradeDelay >= MIN_UPGRADE_DELAY && upgradeDelay <= MAX_UPGRADE_DELAY, InvalidDelay());
        UPGRADE_DELAY = upgradeDelay;
        _disableInitializers();
    }

    /// @param owner_ DAO Safe.
    /// @param executors_ Initial keepers.
    /// @param vault_ First vault to list (or zero to skip).
    /// @param allocator_ Allocator of `vault_`.
    /// @param integrations_ Initial integrations of `vault_`.
    function initialize(
        address owner_,
        address[] calldata executors_,
        address vault_,
        address allocator_,
        IntegrationInput[] calldata integrations_
    ) external initializer {
        require(owner_ != address(0), ZeroAddress());
        __Ownable_init(owner_);
        for (uint256 i; i < executors_.length; i++) {
            _setExecutor(executors_[i], true);
        }
        if (vault_ != address(0)) {
            _setVault(vault_, allocator_, true);
            for (uint256 i; i < integrations_.length; i++) {
                _addIntegration(vault_, integrations_[i]);
            }
        }
    }

    /* ---------------------------------------------------------------- VIEWS */

    /// @inheritdoc IInfiniteTradingRegistry
    function upgradeEta(address implementation) external view returns (uint256) {
        return _s().upgradeEta[implementation];
    }

    /// @notice Morpho Vault V2 adapter-registry hook. True only for active integrations.
    function isInRegistry(address account) external view returns (bool) {
        return _s().integrations[account].active;
    }

    function isExecutor(address account) external view returns (bool) {
        return _s().executors.contains(account);
    }

    function executors() external view returns (address[] memory) {
        return _s().executors.values();
    }

    function vaults() external view returns (address[] memory) {
        return _s().vaults.values();
    }

    function allocatorOf(address vault) external view returns (address) {
        return _s().allocator[vault];
    }

    function isListedVault(address vault) external view returns (bool) {
        return _s().vaults.contains(vault);
    }

    function integrationsOf(address vault) external view returns (address[] memory) {
        return _s().vaultAdapters[vault].values();
    }

    function allIntegrations() external view returns (address[] memory) {
        return _s().adapters.values();
    }

    function integration(address adapter) external view returns (Integration memory) {
        return _s().integrations[adapter];
    }

    function isActiveFor(address vault, address adapter) external view returns (bool) {
        Integration storage i = _s().integrations[adapter];
        return i.active && i.vault == vault;
    }

    /// @notice Current net supply APR (WAD) of an integration, read on-chain. Reverts on unknown adapter, reader
    /// failure, or implausible (>100%) rate.
    function getApy(address adapter) public view returns (uint256 aprWad) {
        Integration storage i = _s().integrations[adapter];
        require(i.vault != address(0), UnknownIntegration(adapter));
        aprWad = IRateReader(i.rateReader).supplyRate(i.target);
        require(aprWad <= MAX_APR, RateTooHigh(adapter, aprWad));
    }

    /// @notice All integrations of `vault` with their APRs. Never reverts on a failing reader (`ok[i] = false`).
    function getApys(address vault)
        external
        view
        returns (address[] memory adapters, uint256[] memory aprs, bool[] memory ok, bool[] memory active)
    {
        adapters = _s().vaultAdapters[vault].values();
        aprs = new uint256[](adapters.length);
        ok = new bool[](adapters.length);
        active = new bool[](adapters.length);
        for (uint256 k; k < adapters.length; k++) {
            active[k] = _s().integrations[adapters[k]].active;
            try this.getApy(adapters[k]) returns (uint256 apr) {
                aprs[k] = apr;
                ok[k] = true;
            } catch {}
        }
    }

    /* ---------------------------------------------------------------- OWNER (DAO) */

    function setVault(address vault, address allocator, bool listed) external onlyOwner {
        _setVault(vault, allocator, listed);
    }

    function addIntegration(address vault, IntegrationInput calldata input) external onlyOwner {
        _addIntegration(vault, input);
    }

    /// @notice Deactivating blocks new `addAdapter` on vaults and lets the allocator move funds out without an APY
    /// check. It never traps funds: vault withdrawals and deallocations do not consult the registry.
    function setIntegrationActive(address adapter, bool active) external onlyOwner {
        Integration storage i = _s().integrations[adapter];
        require(i.vault != address(0), UnknownIntegration(adapter));
        i.active = active;
        emit IntegrationActiveSet(adapter, active);
    }

    /// @notice Swap the rate reader (e.g. when a protocol resolver changes). The new reader must work for the target.
    function setRateReader(address adapter, address rateReader) external onlyOwner {
        Integration storage i = _s().integrations[adapter];
        require(i.vault != address(0), UnknownIntegration(adapter));
        _checkReader(adapter, rateReader, i.target);
        i.rateReader = rateReader;
        emit RateReaderSet(adapter, rateReader);
    }

    function setIntegrationName(address adapter, string calldata name) external onlyOwner {
        Integration storage i = _s().integrations[adapter];
        require(i.vault != address(0), UnknownIntegration(adapter));
        i.name = name;
        emit IntegrationNameSet(adapter, name);
    }

    function setExecutor(address account, bool allowed) external onlyOwner {
        _setExecutor(account, allowed);
    }

    /// @notice Starts the upgrade timelock for `implementation`. Re-proposing resets the clock.
    function proposeUpgrade(address implementation) external onlyOwner {
        require(implementation.code.length > 0, NoCode(implementation));
        uint256 eta = block.timestamp + UPGRADE_DELAY;
        _s().upgradeEta[implementation] = eta;
        emit UpgradeProposed(implementation, eta);
    }

    function cancelUpgrade(address implementation) external onlyOwner {
        require(_s().upgradeEta[implementation] != 0, UpgradeNotProposed(implementation));
        delete _s().upgradeEta[implementation];
        emit UpgradeCancelled(implementation);
    }

    /// @dev A registry without an owner could never be fixed or upgraded.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /* ---------------------------------------------------------------- INTERNAL */

    function _authorizeUpgrade(address implementation) internal override onlyOwner {
        uint256 eta = _s().upgradeEta[implementation];
        require(eta != 0, UpgradeNotProposed(implementation));
        require(block.timestamp >= eta, UpgradeNotReady(implementation, eta));
        delete _s().upgradeEta[implementation];
    }

    function _setExecutor(address account, bool allowed) internal {
        require(account != address(0), ZeroAddress());
        if (allowed) _s().executors.add(account);
        else _s().executors.remove(account);
        emit ExecutorSet(account, allowed);
    }

    function _setVault(address vault, address allocator, bool listed) internal {
        require(vault != address(0), ZeroAddress());
        require(vault.code.length > 0, NoCode(vault));
        if (listed) {
            require(allocator != address(0), ZeroAddress());
            _s().vaults.add(vault);
            _s().allocator[vault] = allocator;
        } else {
            _s().vaults.remove(vault);
            delete _s().allocator[vault];
        }
        emit VaultSet(vault, allocator, listed);
    }

    function _addIntegration(address vault, IntegrationInput calldata input) internal {
        RegistryStorage storage $ = _s();
        address adapter = input.adapter;
        require($.vaults.contains(vault), VaultNotListed(vault));
        require(adapter != address(0) && input.target != address(0), ZeroAddress());
        require($.integrations[adapter].vault == address(0), AlreadyRegistered(adapter));
        require(IParentVaultAdapter(adapter).parentVault() == vault, AdapterVaultMismatch(adapter, vault));
        require(_adapterTarget(adapter) == input.target, AdapterTargetMismatch(adapter, input.target));
        _checkReader(adapter, input.rateReader, input.target);

        $.integrations[adapter] = Integration({
            vault: vault, target: input.target, rateReader: input.rateReader, active: true, name: input.name
        });
        $.adapters.add(adapter);
        $.vaultAdapters[vault].add(adapter);
        emit IntegrationAdded(vault, adapter, input.target, input.rateReader, input.name);
    }

    function _checkReader(address adapter, address rateReader, address target) internal view {
        require(rateReader.code.length > 0, NoCode(rateReader));
        uint256 apr = IRateReader(rateReader).supplyRate(target);
        require(apr <= MAX_APR, RateTooHigh(adapter, apr));
    }

    /// @dev Resolves the protocol position an adapter deposits into. Supports Morpho's MorphoVaultV1Adapter (any
    /// ERC-4626 target) and our CompoundV3Adapter. New adapter types are added through a (timelocked) upgrade.
    function _adapterTarget(address adapter) internal view virtual returns (address) {
        try IMorphoVaultV1AdapterTarget(adapter).morphoVaultV1() returns (address t) {
            return t;
        } catch {}
        try ICompoundV3AdapterTarget(adapter).comet() returns (address t) {
            return t;
        } catch {}
        return address(0);
    }
}
