// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { BeaconProxy } from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import { IBeacon } from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

import { ManagedVault } from "./ManagedVault.sol";

/// @title ManagedVaultFactory
/// @notice DAO-owned factory for deployer-owned vaults. It enforces router, executor and asset allowlists and
///         collects the factory-managed fee split for each trade.
contract ManagedVaultFactory is Ownable2Step, AccessControl {
    bytes32 public constant DAO_ADMIN_ROLE = keccak256("DAO_ADMIN_ROLE");
    bytes32 public constant POLICY_ROLE = keccak256("POLICY_ROLE");
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    address public constant MULTICALL3 = 0xcA11bde05977b3631167028862bE2a173976CA11;

    address public beacon;
    address public treasury;

    uint16 public tradeFeeBps = 25; // 0.25%
    uint16 public executorFeeShareBps = 5_000; // 50%
    uint256 public deployFeeWei;

    mapping(address => bool) public approvedAssets;
    mapping(address => bool) public approvedRouters;
    mapping(address => bool) public approvedExecutors;

    event AssetUpdated(address indexed token, bool approved);
    event RouterUpdated(address indexed router, bool approved);
    event ExecutorUpdated(address indexed executor, bool approved);
    event VaultCreated(address indexed vault, address indexed owner, bytes32 metadataHash);
    event FeeConfigUpdated(uint16 tradeFeeBps, uint16 executorFeeShareBps);
    event TreasuryUpdated(address indexed treasury);
    event BeaconUpdated(address indexed beacon);
    event DeployFeeUpdated(uint256 deployFeeWei);

    error ZeroAddress();
    error InvalidFee();
    error NotFactoryOwner();
    error NotPolicyAdmin();
    error VaultNotAllowed();
    error InvalidBeacon();
    error InvalidVault();

    constructor(address dao, address _feeTreasury, address _beacon) Ownable(dao) {
        if (dao == address(0) || _feeTreasury == address(0) || _beacon == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ADMIN_ROLE, dao);
        _grantRole(POLICY_ROLE, dao);
        _grantRole(DEPLOYER_ROLE, dao);
        treasury = _feeTreasury;
        beacon = _beacon;
    }

    modifier onlyPolicy() {
        if (!hasRole(POLICY_ROLE, msg.sender)) revert NotPolicyAdmin();
        _;
    }

    function setFeeTreasury(address newTreasury) external onlyRole(DAO_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setBeacon(address newBeacon) external onlyRole(DAO_ADMIN_ROLE) {
        if (newBeacon == address(0)) revert ZeroAddress();
        if (IBeacon(newBeacon).implementation() == address(0)) revert InvalidBeacon();
        beacon = newBeacon;
        emit BeaconUpdated(newBeacon);
    }

    function setDeployFee(uint256 newDeployFee) external onlyRole(DAO_ADMIN_ROLE) {
        deployFeeWei = newDeployFee;
        emit DeployFeeUpdated(newDeployFee);
    }

    function setFeeConfig(uint16 newTradeFeeBps, uint16 newExecutorFeeShareBps) external onlyPolicy {
        if (newTradeFeeBps > 1_000) revert InvalidFee();
        if (newExecutorFeeShareBps > 10_000) revert InvalidFee();
        tradeFeeBps = newTradeFeeBps;
        executorFeeShareBps = newExecutorFeeShareBps;
        emit FeeConfigUpdated(newTradeFeeBps, newExecutorFeeShareBps);
    }

    function setApprovedAsset(address token, bool approved) external onlyPolicy {
        if (token == address(0)) revert ZeroAddress();
        approvedAssets[token] = approved;
        emit AssetUpdated(token, approved);
    }

    function setApprovedRouter(address router, bool approved) external onlyPolicy {
        if (router == address(0)) revert ZeroAddress();
        approvedRouters[router] = approved;
        emit RouterUpdated(router, approved);
    }

    function setApprovedExecutor(address executor, bool approved) external onlyPolicy {
        if (executor == address(0)) revert ZeroAddress();
        approvedExecutors[executor] = approved;
        emit ExecutorUpdated(executor, approved);
    }

    function createVault(
        address owner,
        bytes32 metadataHash,
        string calldata metadataUri,
        string calldata strategyTag,
        bytes32 salt
    ) external payable returns (address vault) {
        if (owner == address(0)) revert ZeroAddress();
        if (msg.value < deployFeeWei) revert VaultNotAllowed();

        bytes memory initData = abi.encodeCall(
            ManagedVault.initialize,
            (address(this), owner, metadataHash, metadataUri, strategyTag, tradeFeeBps, executorFeeShareBps)
        );

        vault = address(new BeaconProxy(beacon, initData));
        emit VaultCreated(vault, owner, metadataHash);

        if (msg.value > 0) {
            (bool sent,) = treasury.call{ value: msg.value }("");
            if (!sent) revert VaultNotAllowed();
        }
    }

    function isApprovedAsset(address token) external view returns (bool) {
        return approvedAssets[token];
    }

    function isApprovedRouter(address router) external view returns (bool) {
        return approvedRouters[router];
    }

    function isApprovedExecutor(address executor) external view returns (bool) {
        return approvedExecutors[executor];
    }

    function feeTreasury() external view returns (address) {
        return treasury;
    }
}
