// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "morpho-vault-v2/interfaces/IAdapter.sol";
import {IERC20} from "morpho-vault-v2/interfaces/IERC20.sol";

import {IInfiniteTradingRegistry} from "./interfaces/IInfiniteTradingRegistry.sol";

/// @title InfiniteYieldAllocator
/// @notice The only allocator of an Infinite Trading Morpho Vault V2. Keeps 100% of the vault in a single
/// integration and moves the whole position to another whitelisted integration only when the on-chain APR of the
/// destination beats the current one by at least `minApyDelta`, at most once per `cooldown`.
/// @dev Integrations and executors (keepers) come from the DAO-managed InfiniteTradingRegistry.
/// @dev Funds can only ever move between the vault and adapters already enabled on the vault (adding an adapter is
/// timelocked on the vault). This contract never holds funds.
contract InfiniteYieldAllocator is Ownable2Step, ReentrancyGuardTransient {
    uint256 public constant MIN_APY_DELTA_FLOOR = 0.001e18; // 0.10 pp
    uint256 public constant MAX_APY_DELTA = 0.05e18; // 5.00 pp
    uint256 public constant MIN_COOLDOWN = 10 minutes;
    uint256 public constant MAX_COOLDOWN = 30 days;

    IVaultV2 public immutable vault;
    IInfiniteTradingRegistry public immutable registry;
    address public immutable asset;

    uint256 public minApyDelta;
    uint256 public cooldown;
    uint256 public lastRebalance;
    bool public paused;

    event Rebalanced(
        address indexed caller, address indexed from, address indexed to, uint256 assets, uint256 fromApr, uint256 toApr
    );
    event IdleAllocated(address indexed caller, address indexed adapter, uint256 assets);
    event DaoRebalanced(address indexed from, address indexed to, uint256 deallocated, uint256 allocated);
    event MinApyDeltaSet(uint256 minApyDelta);
    event CooldownSet(uint256 cooldown);
    event Paused(address indexed by);
    event Unpaused();

    error NotExecutor();
    error NotExecutorOrOwner();
    error IsPaused();
    error CooldownActive(uint256 readyAt);
    error SameAdapter();
    error NotActiveIntegration(address adapter);
    error NotVaultAdapter(address adapter);
    error InsufficientApyGain(uint256 fromApr, uint256 toApr, uint256 required);
    error NotBestIntegration(address best, uint256 bestApr);
    error NoLiquidityAdapter();
    error OutOfBounds();
    error RenounceDisabled();
    error ZeroAddress();

    modifier onlyExecutor() {
        require(registry.isExecutor(msg.sender), NotExecutor());
        _;
    }

    constructor(address _vault, address _registry, address _owner, uint256 _minApyDelta, uint256 _cooldown)
        Ownable(_owner)
    {
        require(_vault != address(0) && _registry != address(0), ZeroAddress());
        vault = IVaultV2(_vault);
        registry = IInfiniteTradingRegistry(_registry);
        asset = IVaultV2(_vault).asset();
        _setMinApyDelta(_minApyDelta);
        _setCooldown(_cooldown);
    }

    /* ---------------------------------------------------------------- KEEPER */

    /// @notice Moves the entire position of the current integration (the vault's liquidity adapter) plus idle
    /// assets into `to`, and makes `to` the new liquidity adapter (receives deposits, serves withdrawals).
    /// @dev Conditions: executor, not paused, cooldown elapsed, `to` active for this vault and enabled on it, and
    ///   - current integration active:   apr(to) >= apr(from) + minApyDelta
    ///   - current integration inactive: `to` must have the highest APR among active integrations (no source check)
    ///   - no current integration:       `to` must have the highest APR among active integrations
    /// Reverts (never partially moves) if the source cannot be fully withdrawn or the destination rejects the deposit.
    function requireRebalance(address to) external nonReentrant onlyExecutor {
        require(!paused, IsPaused());
        uint256 readyAt = lastRebalance + cooldown;
        require(lastRebalance == 0 || block.timestamp >= readyAt, CooldownActive(readyAt));

        address from = vault.liquidityAdapter();
        require(to != from, SameAdapter());
        require(registry.isActiveFor(address(vault), to), NotActiveIntegration(to));
        require(vault.isAdapter(to), NotVaultAdapter(to));

        uint256 toApr = registry.getApy(to);
        uint256 fromApr;
        if (from != address(0) && registry.isActiveFor(address(vault), from)) {
            fromApr = registry.getApy(from);
            require(toApr >= fromApr + minApyDelta, InsufficientApyGain(fromApr, toApr, fromApr + minApyDelta));
        } else {
            // No current integration, or it was delisted: the source APR is irrelevant, so the executor may only
            // pick the best active integration (it cannot park funds in a worse one).
            (address best, uint256 bestApr) = _best();
            require(toApr >= bestApr, NotBestIntegration(best, bestApr));
        }

        lastRebalance = block.timestamp;
        uint256 moved = _move(from, to);
        emit Rebalanced(msg.sender, from, to, moved, fromApr, toApr);
    }

    /// @notice Puts idle vault assets (e.g. after a permissionless `forceDeallocate`) back into the current
    /// integration. No APY decision involved, so no cooldown.
    function allocateIdle() external nonReentrant onlyExecutor {
        require(!paused, IsPaused());
        address current = vault.liquidityAdapter();
        require(current != address(0), NoLiquidityAdapter());
        uint256 idle = IERC20(asset).balanceOf(address(vault));
        if (idle > 0) vault.allocate(current, "", idle);
        emit IdleAllocated(msg.sender, current, idle);
    }

    /* ---------------------------------------------------------------- VIEWS */

    /// @notice What a keeper should do now. `ready` is true iff `requireRebalance(to)` would pass its checks.
    function bestRebalance()
        external
        view
        returns (bool ready, address from, address to, uint256 fromApr, uint256 toApr, uint256 readyAt)
    {
        from = vault.liquidityAdapter();
        (to, toApr) = _best();
        readyAt = lastRebalance == 0 ? 0 : lastRebalance + cooldown;
        if (to == address(0) || to == from || paused || block.timestamp < readyAt) return (false, from, to, 0, toApr, readyAt);

        if (from == address(0) || !registry.isActiveFor(address(vault), from)) return (true, from, to, 0, toApr, readyAt);

        try registry.getApy(from) returns (uint256 apr) {
            fromApr = apr;
            ready = toApr >= apr + minApyDelta;
        } catch {}
    }

    /// @notice Assets currently held by the vault in each of its adapters, plus idle.
    function positions() external view returns (address[] memory adapters, uint256[] memory assets, uint256 idle) {
        uint256 n = vault.adaptersLength();
        adapters = new address[](n);
        assets = new uint256[](n);
        for (uint256 i; i < n; i++) {
            adapters[i] = vault.adapters(i);
            assets[i] = IAdapter(adapters[i]).realAssets();
        }
        idle = IERC20(asset).balanceOf(address(vault));
    }

    /* ---------------------------------------------------------------- DAO */

    function setMinApyDelta(uint256 newMinApyDelta) external onlyOwner {
        _setMinApyDelta(newMinApyDelta);
    }

    function setCooldown(uint256 newCooldown) external onlyOwner {
        _setCooldown(newCooldown);
    }

    /// @notice Executors can pause keeper actions in an emergency; only the DAO can unpause.
    function pause() external {
        require(msg.sender == owner() || registry.isExecutor(msg.sender), NotExecutorOrOwner());
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    /// @notice Caps how fast the vault share price may grow (Morpho Vault V2 `maxRate`, per second, WAD).
    function setMaxRate(uint256 newMaxRate) external onlyOwner {
        vault.setMaxRate(newMaxRate);
    }

    /// @notice DAO override without APY checks, cooldown or pause. Deallocates `from` entirely (if it holds assets),
    /// then allocates all idle assets to `to` and makes it the liquidity adapter. `to == address(0)` keeps
    /// everything idle and clears the liquidity adapter (emergency exit to the vault).
    function daoRebalance(address from, address to) external nonReentrant onlyOwner {
        if (from != address(0)) require(vault.isAdapter(from), NotVaultAdapter(from));
        if (to != address(0)) require(vault.isAdapter(to), NotVaultAdapter(to));
        uint256 deallocated = from == address(0) ? 0 : _deallocateAll(from);
        uint256 allocated;
        if (to != address(0)) {
            allocated = IERC20(asset).balanceOf(address(vault));
            if (allocated > 0) vault.allocate(to, "", allocated);
        }
        vault.setLiquidityAdapterAndData(to, "");
        emit DaoRebalanced(from, to, deallocated, allocated);
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /* ---------------------------------------------------------------- INTERNAL */

    function _move(address from, address to) internal returns (uint256 moved) {
        if (from != address(0)) _deallocateAll(from);
        moved = IERC20(asset).balanceOf(address(vault));
        if (moved > 0) vault.allocate(to, "", moved);
        vault.setLiquidityAdapterAndData(to, "");
    }

    function _deallocateAll(address adapter) internal returns (uint256 assets) {
        assets = IAdapter(adapter).realAssets();
        if (assets > 0) vault.deallocate(adapter, "", assets);
    }

    /// @dev Highest-APR active integration of this vault that is enabled on the vault. Failing readers are skipped.
    function _best() internal view returns (address best, uint256 bestApr) {
        (address[] memory adapters, uint256[] memory aprs, bool[] memory ok, bool[] memory active) =
            registry.getApys(address(vault));
        for (uint256 i; i < adapters.length; i++) {
            if (!ok[i] || !active[i] || !vault.isAdapter(adapters[i])) continue;
            if (best == address(0) || aprs[i] > bestApr) {
                best = adapters[i];
                bestApr = aprs[i];
            }
        }
    }

    function _setMinApyDelta(uint256 v) internal {
        require(v >= MIN_APY_DELTA_FLOOR && v <= MAX_APY_DELTA, OutOfBounds());
        minApyDelta = v;
        emit MinApyDeltaSet(v);
    }

    function _setCooldown(uint256 v) internal {
        require(v >= MIN_COOLDOWN && v <= MAX_COOLDOWN, OutOfBounds());
        cooldown = v;
        emit CooldownSet(v);
    }
}
