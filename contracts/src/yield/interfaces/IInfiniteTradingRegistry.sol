// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IAdapterRegistry} from "morpho-vault-v2/interfaces/IAdapterRegistry.sol";

interface IInfiniteTradingRegistry is IAdapterRegistry {
    struct Integration {
        address vault;
        address target;
        address rateReader;
        bool active;
        string name;
    }

    struct IntegrationInput {
        address adapter;
        address target;
        address rateReader;
        string name;
    }

    event VaultSet(address indexed vault, address indexed allocator, bool listed);
    event IntegrationAdded(
        address indexed vault, address indexed adapter, address indexed target, address rateReader, string name
    );
    event IntegrationActiveSet(address indexed adapter, bool active);
    event RateReaderSet(address indexed adapter, address indexed rateReader);
    event IntegrationNameSet(address indexed adapter, string name);
    event ExecutorSet(address indexed account, bool allowed);
    event UpgradeProposed(address indexed implementation, uint256 eta);
    event UpgradeCancelled(address indexed implementation);

    error ZeroAddress();
    error NoCode(address account);
    error VaultNotListed(address vault);
    error AlreadyRegistered(address adapter);
    error UnknownIntegration(address adapter);
    error AdapterVaultMismatch(address adapter, address vault);
    error AdapterTargetMismatch(address adapter, address target);
    error RateTooHigh(address adapter, uint256 aprWad);
    error UpgradeNotProposed(address implementation);
    error UpgradeNotReady(address implementation, uint256 eta);
    error InvalidDelay();
    error RenounceDisabled();

    function UPGRADE_DELAY() external view returns (uint256);
    function MAX_APR() external view returns (uint256);
    function upgradeEta(address implementation) external view returns (uint256);

    function isExecutor(address account) external view returns (bool);
    function executors() external view returns (address[] memory);
    function vaults() external view returns (address[] memory);
    function allocatorOf(address vault) external view returns (address);
    function isListedVault(address vault) external view returns (bool);
    function integrationsOf(address vault) external view returns (address[] memory);
    function allIntegrations() external view returns (address[] memory);
    function integration(address adapter) external view returns (Integration memory);
    function isActiveFor(address vault, address adapter) external view returns (bool);
    function getApy(address adapter) external view returns (uint256 aprWad);
    function getApys(address vault)
        external
        view
        returns (address[] memory adapters, uint256[] memory aprs, bool[] memory ok, bool[] memory active);

    function setVault(address vault, address allocator, bool listed) external;
    function addIntegration(address vault, IntegrationInput calldata input) external;
    function setIntegrationActive(address adapter, bool active) external;
    function setRateReader(address adapter, address rateReader) external;
    function setIntegrationName(address adapter, string calldata name) external;
    function setExecutor(address account, bool allowed) external;
    function proposeUpgrade(address implementation) external;
    function cancelUpgrade(address implementation) external;
}
