// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "morpho-vault-v2/interfaces/IAdapter.sol";
import {IERC20} from "morpho-vault-v2/interfaces/IERC20.sol";
import {IInfiniteTradingRegistry} from "./interfaces/IInfiniteTradingRegistry.sol";

/// @notice Restores a DAO-defined portfolio. Deposits stay idle until a keeper run; redemptions use the
/// vault's permissionless forceDeallocate + redeem multicall. This contract never holds user funds.
contract InfiniteWeightedAllocator is Ownable2Step, ReentrancyGuardTransient {
    uint256 public constant WAD = 1e18;
    uint256 public constant POLICY_DELAY = 3 days;
    uint256 public constant MAX_ADAPTERS = 8;
    IVaultV2 public immutable vault;
    IInfiniteTradingRegistry public immutable registry;
    address public immutable initializer;
    address public immutable asset;
    uint256 public immutable driftThreshold;
    uint256 public immutable cooldown;
    address[] private _targets;
    uint256[] private _weights;
    bytes32 public pendingPolicy;
    uint256 public policyEta;
    uint256 public lastRebalance;
    bool public initialized;
    bool public paused;

    event PolicyProposed(bytes32 indexed policyHash, uint256 eta, address[] adapters, uint256[] weights);
    event PolicyCancelled(bytes32 indexed policyHash);
    event PolicySet(address[] adapters, uint256[] weights);
    event Rebalanced(address indexed caller, uint256 totalAssets, uint256 movedAssets);
    event PauseSet(bool paused);

    error Unauthorized();
    error InvalidPolicy();
    error InvalidState();
    error PolicyNotReady();
    error RebalanceNotReady();
    error InactiveTarget(address adapter);
    error AllocationLoss(uint256 beforeAssets, uint256 afterAssets);
    error RenounceDisabled();

    constructor(address v, address r, address dao, address init, uint256 drift, uint256 delay) Ownable(dao) {
        require(v.code.length > 0 && r.code.length > 0 && init != address(0), InvalidState());
        require(drift >= 0.001e18 && drift <= 0.1e18 && delay >= 10 minutes && delay <= 30 days, InvalidPolicy());
        vault = IVaultV2(v);
        registry = IInfiniteTradingRegistry(r);
        initializer = init;
        asset = IVaultV2(v).asset();
        driftThreshold = drift;
        cooldown = delay;
    }

    function initializePolicy(address[] calldata adapters, uint256[] calldata weights) external {
        require(msg.sender == initializer && !initialized, Unauthorized());
        _setPolicy(adapters, weights);
        initialized = true;
    }

    function policy() external view returns (address[] memory, uint256[] memory) {
        return (_targets, _weights);
    }

    function proposePolicy(address[] calldata adapters, uint256[] calldata weights) external onlyOwner {
        _validate(adapters, weights);
        pendingPolicy = keccak256(abi.encode(adapters, weights));
        policyEta = block.timestamp + POLICY_DELAY;
        emit PolicyProposed(pendingPolicy, policyEta, adapters, weights);
    }

    function cancelPolicy() external {
        require(msg.sender == owner() || vault.isSentinel(msg.sender), Unauthorized());
        emit PolicyCancelled(pendingPolicy);
        delete pendingPolicy;
        delete policyEta;
    }

    function executePolicy(address[] calldata adapters, uint256[] calldata weights) external {
        require(
            pendingPolicy != bytes32(0) && pendingPolicy == keccak256(abi.encode(adapters, weights))
                && block.timestamp >= policyEta,
            PolicyNotReady()
        );
        _setPolicy(adapters, weights);
        delete pendingPolicy;
        delete policyEta;
    }

    function pause() external {
        require(msg.sender == owner() || registry.isExecutor(msg.sender) || vault.isSentinel(msg.sender), Unauthorized());
        paused = true;
        emit PauseSet(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit PauseSet(false);
    }

    function setMaxRate(uint256 rate) external onlyOwner {
        vault.setMaxRate(rate);
    }

    function positions() public view returns (address[] memory adapters, uint256[] memory assets, uint256 idle) {
        uint256 n = vault.adaptersLength();
        adapters = new address[](n);
        assets = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            adapters[i] = vault.adapters(i);
            assets[i] = IAdapter(adapters[i]).realAssets();
        }
        idle = IERC20(asset).balanceOf(address(vault));
    }

    function rebalanceStatus() public view returns (bool ready, uint256 drift, uint256 readyAt) {
        readyAt = lastRebalance == 0 ? 0 : lastRebalance + cooldown;
        if (!initialized || paused || vault.liquidityAdapter() != address(0)) return (false, 0, readyAt);
        (address[] memory adapters, uint256[] memory assets, uint256 idle) = positions();
        uint256 total = idle;
        for (uint256 i; i < assets.length; ++i) total += assets[i];
        if (total == 0) return (false, 0, readyAt);
        for (uint256 i; i < adapters.length; ++i) {
            uint256 actualWeight = Math.mulDiv(assets[i], WAD, total);
            uint256 targetWeight = weightOf(adapters[i]);
            uint256 diff = actualWeight > targetWeight ? actualWeight - targetWeight : targetWeight - actualWeight;
            if (diff > drift) drift = diff;
        }
        ready = block.timestamp >= readyAt && drift >= driftThreshold;
        for (uint256 i; i < _targets.length; ++i) {
            if (_weights[i] > 0 && (!registry.isActiveFor(address(vault), _targets[i]) || !vault.isAdapter(_targets[i]))) {
                ready = false;
            }
        }
    }

    function weightOf(address adapter) public view returns (uint256) {
        for (uint256 i; i < _targets.length; ++i) {
            if (_targets[i] == adapter) return _weights[i];
        }
        return 0;
    }

    function rebalance() external nonReentrant {
        require(registry.isExecutor(msg.sender), Unauthorized());
        (bool ready,,) = rebalanceStatus();
        require(ready, RebalanceNotReady());
        vault.accrueInterest();
        (address[] memory adapters, uint256[] memory assets, uint256 idle) = positions();
        uint256 total = idle;
        uint256 moved;
        for (uint256 i; i < assets.length; ++i) total += assets[i];
        // Release excess first. Any liquidity failure reverts the entire transaction.
        for (uint256 i; i < adapters.length; ++i) {
            uint256 desired = Math.mulDiv(total, weightOf(adapters[i]), WAD);
            if (assets[i] > desired) {
                uint256 amount = assets[i] - desired;
                vault.deallocate(adapters[i], "", amount);
                moved += amount;
            }
        }
        for (uint256 i; i < _targets.length; ++i) {
            address adapter = _targets[i];
            if (_weights[i] == 0) continue;
            require(registry.isActiveFor(address(vault), adapter), InactiveTarget(adapter));
            uint256 desired = Math.mulDiv(total, _weights[i], WAD);
            uint256 current = IAdapter(adapter).realAssets();
            if (desired > current) {
                uint256 amount = Math.min(desired - current, IERC20(asset).balanceOf(address(vault)));
                if (amount > 0) {
                    vault.allocate(adapter, "", amount);
                    moved += amount;
                }
            }
        }
        (, uint256[] memory afterAssets, uint256 afterIdle) = positions();
        uint256 afterTotal = afterIdle;
        for (uint256 i; i < afterAssets.length; ++i) afterTotal += afterAssets[i];
        // Lending share conversions may round by a few USDC base units, but entry/exit fees are not accepted.
        require(afterTotal + MAX_ADAPTERS * 2 >= total, AllocationLoss(total, afterTotal));
        lastRebalance = block.timestamp;
        emit Rebalanced(msg.sender, total, moved);
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    function _validate(address[] calldata adapters, uint256[] calldata weights) internal view {
        require(adapters.length > 0 && adapters.length <= MAX_ADAPTERS && adapters.length == weights.length, InvalidPolicy());
        uint256 sum;
        for (uint256 i; i < adapters.length; ++i) {
            require(vault.isAdapter(adapters[i]) && registry.isActiveFor(address(vault), adapters[i]), InvalidPolicy());
            for (uint256 j; j < i; ++j) require(adapters[i] != adapters[j], InvalidPolicy());
            require(weights[i] <= WAD, InvalidPolicy());
            sum += weights[i];
        }
        require(sum == WAD, InvalidPolicy());
    }

    function _setPolicy(address[] calldata adapters, uint256[] calldata weights) internal {
        _validate(adapters, weights);
        _targets = adapters;
        _weights = weights;
        emit PolicySet(adapters, weights);
    }
}
