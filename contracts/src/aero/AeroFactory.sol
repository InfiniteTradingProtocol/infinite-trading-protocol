// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IAeroPoolFactory, IAeroGauge, IAeroGaugeFactory, IAeroVoter } from "./IAero.sol";
import { AeroVault } from "./AeroVault.sol";

/// @notice Immutable deployments, DAO-controlled fee policy. Vault owners cannot replace this factory.
contract AeroFactory is ReentrancyGuard {
    address public immutable dao;
    address public immutable treasury;
    address public immutable stableFactory;
    address public immutable volatileFactory;
    address public immutable stableGaugeFactory;
    address public immutable volatileGaugeFactory;
    address public immutable voter;
    address public immutable rewardToken;
    address public immutable deferredHandler;
    uint16 public daoRewardBps = 200;
    uint16 public daoEntryExitShareBps = 1000;
    address public defaultKeeper;
    mapping(address => bool) public mandatoryKeepers;
    mapping(address => bool) public isVault;
    address[] public vaults;

    event VaultCreated(address indexed vault, address indexed owner, address indexed pool);
    event DaoFeesUpdated(uint16 rewardBps, uint16 entryExitShareBps);
    event MandatoryKeeperAdded(address indexed keeper);
    event DefaultKeeperUpdated(address indexed keeper);

    error OnlyDao();
    error InvalidConfig();
    error InvalidPool();
    error InvalidGauge();

    constructor(
        address dao_,
        address treasury_,
        address stable_,
        address volatile_,
        address stableGauge_,
        address volatileGauge_,
        address voter_,
        address reward_,
        address handler_,
        address[] memory keepers
    ) {
        if (
            dao_ == address(0) || treasury_ == address(0) || stable_.code.length == 0 || volatile_.code.length == 0
                || stableGauge_.code.length == 0 || volatileGauge_.code.length == 0
                || voter_.code.length == 0 || reward_.code.length == 0
                || (handler_ != address(0) && handler_.code.length == 0) || keepers.length == 0
        ) revert InvalidConfig();
        dao = dao_;
        treasury = treasury_;
        stableFactory = stable_;
        volatileFactory = volatile_;
        stableGaugeFactory = stableGauge_;
        volatileGaugeFactory = volatileGauge_;
        voter = voter_;
        rewardToken = reward_;
        deferredHandler = handler_;
        for (uint256 i; i < keepers.length; ++i) {
            _addKeeper(keepers[i]);
        }
        defaultKeeper = keepers[0];
    }

    modifier onlyDao() {
        if (msg.sender != dao) revert OnlyDao();
        _;
    }

    function setDaoFees(uint16 rewardBps, uint16 entryExitShareBps) external onlyDao {
        if (rewardBps == 0 || rewardBps > 1000 || entryExitShareBps > 1000) revert InvalidConfig();
        daoRewardBps = rewardBps;
        daoEntryExitShareBps = entryExitShareBps;
        emit DaoFeesUpdated(rewardBps, entryExitShareBps);
    }

    function addMandatoryKeeper(address keeper) external onlyDao {
        _addKeeper(keeper);
    }

    function _addKeeper(address keeper) private {
        if (keeper == address(0)) revert InvalidConfig();
        mandatoryKeepers[keeper] = true;
        emit MandatoryKeeperAdded(keeper);
    }

    function setDefaultKeeper(address keeper) external onlyDao {
        if (!mandatoryKeepers[keeper]) revert InvalidConfig();
        defaultKeeper = keeper;
        emit DefaultKeeperUpdated(keeper);
    }

    function isPool(address pool) public view returns (bool) {
        return IAeroPoolFactory(stableFactory).isPool(pool) || IAeroPoolFactory(volatileFactory).isPool(pool);
    }

    function isGauge(address pool, address gauge) public view returns (bool) {
        if (gauge.code.length == 0) return false;
        address registry;
        if (IAeroPoolFactory(stableFactory).isPool(pool)) registry = stableGaugeFactory;
        else if (IAeroPoolFactory(volatileFactory).isPool(pool)) registry = volatileGaugeFactory;
        else return false;
        return IAeroGaugeFactory(registry).isGauge(gauge)
            && IAeroGaugeFactory(registry).computeGaugeAddress(pool) == gauge
            && IAeroGauge(gauge).stakingToken() == pool && IAeroGauge(gauge).voter() == voter
            && IAeroVoter(voter).isActivated(gauge);
    }

    function createVault(AeroVault.Config calldata config) external nonReentrant returns (address vault) {
        if (
            config.owner != msg.sender || config.rewardToken != rewardToken || bytes(config.name).length == 0
                || bytes(config.name).length > 64 || bytes(config.symbol).length == 0
                || bytes(config.symbol).length > 16
        ) revert InvalidConfig();
        if (!isPool(config.pool)) revert InvalidPool();
        if (config.gauge != address(0) && !isGauge(config.pool, config.gauge)) revert InvalidGauge();
        vault = address(new AeroVault(address(this), config));
        isVault[vault] = true;
        vaults.push(vault);
        emit VaultCreated(vault, msg.sender, config.pool);
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }
}
