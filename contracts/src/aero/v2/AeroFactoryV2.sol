// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IAeroV2PoolFactory, IAeroV2Gauge, IAeroV2GaugeFactory, IAeroV2Voter, IAeroV2Oracle } from "./IAeroV2.sol";
import { AeroVaultV2 } from "./AeroVaultV2.sol";

/// @notice Permissionless launcher for AeroVaultV2 clones. Vault code is fixed (non-upgradeable clones of one
/// implementation). The DAO controls protocol fee, keepers, swap-route pools, gauges and the "official" label.
contract AeroFactoryV2 {
    uint16 public constant MAX_DAO_FEE_BPS = 1000;

    address public immutable dao;
    address public immutable stableFactory;
    address public immutable volatileFactory;
    address public immutable stableGaugeFactory;
    address public immutable volatileGaugeFactory;
    address public immutable voter;
    address public immutable rewardToken;
    IAeroV2Oracle public immutable oracle;
    address public immutable implementation;

    address public treasury;
    uint16 public daoFeeBps = 200;
    address public defaultKeeper;
    mapping(address => bool) public isKeeper;
    mapping(address => bool) public approvedPool;
    mapping(address => bool) public isVault;
    mapping(address => bool) public isOfficial;
    address[] public vaults;

    event VaultCreated(address indexed vault, address indexed owner, address indexed pool);
    event TreasuryUpdated(address treasury);
    event DaoFeeUpdated(uint16 bps);
    event KeeperUpdated(address indexed keeper, bool enabled);
    event DefaultKeeperUpdated(address indexed keeper);
    event PoolApproved(address indexed pool, bool approved);
    event OfficialUpdated(address indexed vault, bool official);

    error OnlyDao();
    error InvalidConfig();
    error InvalidPool();

    constructor(
        address dao_,
        address treasury_,
        address stable_,
        address volatile_,
        address stableGauge_,
        address volatileGauge_,
        address voter_,
        address reward_,
        address oracle_,
        address keeper_
    ) {
        if (
            dao_ == address(0) || treasury_ == address(0) || keeper_ == address(0) || stable_.code.length == 0
                || volatile_.code.length == 0 || stableGauge_.code.length == 0 || volatileGauge_.code.length == 0
                || voter_.code.length == 0 || reward_.code.length == 0 || oracle_.code.length == 0
        ) revert InvalidConfig();
        dao = dao_;
        treasury = treasury_;
        stableFactory = stable_;
        volatileFactory = volatile_;
        stableGaugeFactory = stableGauge_;
        volatileGaugeFactory = volatileGauge_;
        voter = voter_;
        rewardToken = reward_;
        oracle = IAeroV2Oracle(oracle_);
        implementation = address(new AeroVaultV2(address(this)));
        isKeeper[keeper_] = true;
        defaultKeeper = keeper_;
        emit KeeperUpdated(keeper_, true);
        emit DefaultKeeperUpdated(keeper_);
    }

    modifier onlyDao() {
        if (msg.sender != dao) revert OnlyDao();
        _;
    }

    // ── DAO configuration
    // ────────────────────────────────────────────────────

    function setTreasury(address treasury_) external onlyDao {
        if (treasury_ == address(0)) revert InvalidConfig();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    /// @notice Protocol fee in bps of every harvested reward, independent of strategist and keeper fees.
    function setDaoFee(uint16 bps) external onlyDao {
        if (bps > MAX_DAO_FEE_BPS) revert InvalidConfig();
        daoFeeBps = bps;
        emit DaoFeeUpdated(bps);
    }

    function setKeeper(address keeper, bool enabled) external onlyDao {
        if (keeper == address(0) || (!enabled && keeper == defaultKeeper)) revert InvalidConfig();
        isKeeper[keeper] = enabled;
        emit KeeperUpdated(keeper, enabled);
    }

    function setDefaultKeeper(address keeper) external onlyDao {
        if (!isKeeper[keeper]) revert InvalidConfig();
        defaultKeeper = keeper;
        emit DefaultKeeperUpdated(keeper);
    }

    /// @notice Pools vaults may swap through for reward routes. A vault's own pool is always usable.
    function setApprovedPool(address pool, bool approved) external onlyDao {
        if (approved && !isPool(pool)) revert InvalidPool();
        approvedPool[pool] = approved;
        emit PoolApproved(pool, approved);
    }

    function setOfficial(address vault, bool official) external onlyDao {
        if (!isVault[vault]) revert InvalidConfig();
        isOfficial[vault] = official;
        emit OfficialUpdated(vault, official);
    }

    // ── Views
    // ────────────────────────────────────────────────────────────────

    function isPool(address pool) public view returns (bool) {
        return isStablePool(pool) || IAeroV2PoolFactory(volatileFactory).isPool(pool);
    }

    function isStablePool(address pool) public view returns (bool) {
        return IAeroV2PoolFactory(stableFactory).isPool(pool);
    }

    function isGauge(address pool, address gauge) public view returns (bool) {
        if (gauge.code.length == 0) return false;
        address registry;
        if (IAeroV2PoolFactory(stableFactory).isPool(pool)) registry = stableGaugeFactory;
        else if (IAeroV2PoolFactory(volatileFactory).isPool(pool)) registry = volatileGaugeFactory;
        else return false;
        return IAeroV2GaugeFactory(registry).isGauge(gauge)
            && IAeroV2GaugeFactory(registry).computeGaugeAddress(pool) == gauge
            && IAeroV2Gauge(gauge).stakingToken() == pool && IAeroV2Gauge(gauge).voter() == voter
            && IAeroV2Voter(voter).isActivated(gauge);
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    // ── Launch
    // ───────────────────────────────────────────────────────────────

    /// @notice Anyone can launch a vault; the caller becomes its owner. Only the DAO marks vaults official.
    function createVault(
        address pool,
        address strategist,
        uint16 strategistBps,
        string calldata name,
        string calldata symbol
    )
        external
        returns (address vault)
    {
        if (
            bytes(name).length == 0 || bytes(name).length > 64 || bytes(symbol).length == 0 || bytes(symbol).length > 16
        ) revert InvalidConfig();
        if (!isPool(pool)) revert InvalidPool();
        vault = Clones.clone(implementation);
        AeroVaultV2(vault).initialize(pool, msg.sender, strategist, strategistBps, name, symbol);
        isVault[vault] = true;
        vaults.push(vault);
        emit VaultCreated(vault, msg.sender, pool);
    }
}
