// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import { IInfiniteSubaccount } from "./interfaces/IInfiniteSubaccount.sol";
import { IInfiniteSubaccountFactory } from "./interfaces/IInfiniteSubaccountFactory.sol";
import { InfiniteSwapSandbox } from "./InfiniteSwapSandbox.sol";

/// @title InfiniteSubaccount
/// @notice A trading account owned by one user. The owner keeps full custody; an agent (Infinite Trading keepers,
///         or operators the owner adds, such as their own bot) may only swap between assets the owner enabled,
///         inside the owner's limits.
/// @dev Trust model, enforced here and not by off-chain code:
///      - Only the owner can withdraw, make arbitrary calls or change the policy. Withdrawals work while paused.
///      - This is an EIP-1167 clone of a fixed implementation with no upgrade path: nobody can change its code.
///      - The factory owner can list oracles and routers, set keepers and change fees (capped, behind a delay),
///        and the guardian can pause agents. None of them can move funds or change the account owner.
///      - An agent swap: both tokens enabled, strategy enabled, router approved by the factory, notional within
///        `maxTradeUsd` and the 24h `dailyLimitUsd`. The router runs inside InfiniteSwapSandbox, so it never sees
///        this account as msg.sender. Afterwards the account requires that it received at least the oracle value of
///        what it spent minus `maxSlippageBps`. A compromised keeper or route can therefore cost at most
///        `dailyLimitUsd * (maxSlippageBps + feeBps) / 10_000` per day, and can never move funds out.
///      - No ERC-1271: owner signatures are not account signatures, so they cannot be replayed across accounts or used
///        to move locked ITP.
contract InfiniteSubaccount is IInfiniteSubaccount, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    uint16 public constant MAX_SLIPPAGE_BPS = 500;
    uint256 public constant MAX_ASSETS = 32;
    uint256 public constant MAX_STRATEGIES = 16;
    uint256 public constant MAX_PARAMS_BYTES = 2048;
    uint256 public constant LIMIT_WINDOW = 1 days;
    uint256 public constant UNLOCK_DELAY = 7 days;
    uint256 private constant BPS = 10_000;

    struct Operator {
        uint64 expiry;
        uint64 epoch;
    }

    IInfiniteSubaccountFactory public factory;
    address public feeToken; // ITP on chains where it exists, else address(0); cached so withdraw never calls out
    address public owner;
    address public pendingOwner;

    bool public paused;
    bool public agentEnabled;
    uint16 public maxSlippageBps;
    uint64 public operatorEpoch;

    uint128 public maxTradeUsd;
    uint128 public dailyLimitUsd;
    uint128 public windowSpentUsd;
    uint64 public windowStart;

    uint128 public lockedFeeToken;
    uint64 public unlockAt; // 0 = locked; otherwise the lock ends at this time and no longer earns a discount

    bool private _initialized;
    EnumerableSet.AddressSet private _assets;
    EnumerableSet.Bytes32Set private _strategies;
    mapping(bytes32 => bytes) private _strategyParams;
    mapping(address => Operator) private _operators;

    error AlreadyInitialized();
    error NotOwner();
    error NotPendingOwner();
    error NotAgent();
    error AgentsPaused();
    error ZeroAddress();
    error LengthMismatch();
    error AssetNotTradable(address token);
    error AssetNotEnabled(address token);
    error TooManyAssets();
    error TooManyStrategies();
    error ParamsTooLong();
    error StrategyNotEnabled(bytes32 strategyId);
    error RouterNotApproved(address router);
    error InvalidSwap();
    error SlippageTooHigh();
    error TradeTooLarge(uint256 notionalUsd, uint256 maxTradeUsd);
    error DailyLimitExceeded(uint256 notionalUsd, uint256 remainingUsd);
    error InsufficientOutput(uint256 received, uint256 required);
    error InvalidTarget();
    error FeeTokenStillLocked();
    error NothingToUnlock();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev The implementation itself can never be initialized; only clones can.
    constructor() {
        _initialized = true;
    }

    receive() external payable { }

    // ----------------------------------------------------------------------------------------------------------------
    // Setup
    // ----------------------------------------------------------------------------------------------------------------

    /// @dev Called by the factory in the same transaction that creates the clone. A keeper may create an account for a
    ///      user, but cannot grant itself access: agent access then starts off whatever `p` says.
    function initialize(address owner_, InitParams calldata p, bool ownerCreated) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;
        if (owner_ == address(0)) revert ZeroAddress();
        if (p.strategyIds.length != p.strategyParams.length) revert LengthMismatch();

        factory = IInfiniteSubaccountFactory(msg.sender);
        feeToken = factory.feeToken();
        owner = owner_;

        for (uint256 i; i < p.assets.length; ++i) {
            _enableAsset(p.assets[i]);
        }
        _setLimits(p.maxSlippageBps, p.maxTradeUsd, p.dailyLimitUsd);
        bool agent = p.agentEnabled && ownerCreated;
        agentEnabled = agent;
        emit AgentEnabledSet(agent);
        for (uint256 i; i < p.strategyIds.length; ++i) {
            _setStrategy(p.strategyIds[i], true, p.strategyParams[i]);
        }
        emit Initialized(msg.sender, owner_);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Funds: anyone deposits, only the owner withdraws
    // ----------------------------------------------------------------------------------------------------------------

    /// @notice Deposit an ERC-20. Plain transfers to the account work too; this one emits an event.
    function deposit(address token, uint256 amount) external nonReentrant {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, msg.sender, amount);
    }

    /// @notice Withdraw `amount` of `token` (address(0) = native). Works while paused.
    function withdraw(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (token == address(0)) {
            Address.sendValue(payable(to), amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
            if (token == feeToken) _checkLock();
        }
        emit Withdrawn(token, to, amount);
    }

    /// @notice Arbitrary calls by the owner (lend, LP, bridge, swap by hand). It is the owner's wallet.
    function execute(Call[] calldata calls) external payable onlyOwner nonReentrant returns (bytes[] memory results) {
        bool locked = _activeLock() > 0;
        results = new bytes[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            Call calldata c = calls[i];
            if (c.target == address(this)) revert InvalidTarget();
            // While ITP is locked for a fee discount, no approvals or transfers of it outside withdraw().
            if (locked && c.target == feeToken) revert FeeTokenStillLocked();
            results[i] = Address.functionCallWithValue(c.target, c.data, c.value);
            emit Executed(c.target, c.value, c.data.length >= 4 ? bytes4(c.data[:4]) : bytes4(0));
        }
        if (locked) _checkLock();
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Agent: swaps between enabled assets only, bounded by the oracle and the owner's limits
    // ----------------------------------------------------------------------------------------------------------------

    function executeSwap(Swap calldata s) external nonReentrant returns (uint256 received) {
        bool viaOperator = _authorizeAgent();
        if (paused || factory.keepersPaused()) revert AgentsPaused();
        if (!_strategies.contains(s.strategyId)) revert StrategyNotEnabled(s.strategyId);
        if (s.amountIn == 0 || s.tokenIn == s.tokenOut) revert InvalidSwap();
        if (!_assets.contains(s.tokenIn)) revert AssetNotEnabled(s.tokenIn);
        if (!_assets.contains(s.tokenOut)) revert AssetNotEnabled(s.tokenOut);
        if (!factory.isApprovedRouter(s.router)) revert RouterNotApproved(s.router);

        uint256 notionalUsd = factory.valueUsd(s.tokenIn, s.amountIn);
        _spendLimit(notionalUsd);

        (uint256 fee, address treasury) =
            factory.quoteFee(address(this), s.tokenIn, s.amountIn, notionalUsd, viaOperator);
        if (fee > 0) IERC20(s.tokenIn).safeTransfer(treasury, fee);

        uint256 inBefore = IERC20(s.tokenIn).balanceOf(address(this));
        uint256 outBefore = IERC20(s.tokenOut).balanceOf(address(this));

        address sandbox = factory.swapSandbox();
        IERC20(s.tokenIn).safeTransfer(sandbox, s.amountIn);
        InfiniteSwapSandbox(sandbox).swap(s.tokenIn, s.tokenOut, s.router, s.amountIn, s.data);

        uint256 inAfter = IERC20(s.tokenIn).balanceOf(address(this));
        uint256 spent = inBefore > inAfter ? inBefore - inAfter : 0;
        received = IERC20(s.tokenOut).balanceOf(address(this)) - outBefore;

        uint256 required = s.minAmountOut;
        if (spent > 0) {
            uint256 floorUsd = factory.valueUsd(s.tokenIn, spent) * (BPS - maxSlippageBps) / BPS;
            uint256 oracleMin = factory.amountForUsdUp(s.tokenOut, floorUsd);
            if (oracleMin > required) required = oracleMin;
        }
        if (received < required) revert InsufficientOutput(received, required);
        if (s.tokenIn == feeToken) _checkLock();

        emit SwapExecuted(s.strategyId, msg.sender, s.tokenIn, s.tokenOut, spent, received, notionalUsd, fee);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Owner policy
    // ----------------------------------------------------------------------------------------------------------------

    function setAssets(address[] calldata enable, address[] calldata disable) external onlyOwner {
        for (uint256 i; i < disable.length; ++i) {
            if (_assets.remove(disable[i])) emit AssetSet(disable[i], false);
        }
        for (uint256 i; i < enable.length; ++i) {
            _enableAsset(enable[i]);
        }
    }

    function setLimits(uint16 maxSlippageBps_, uint128 maxTradeUsd_, uint128 dailyLimitUsd_) external onlyOwner {
        _setLimits(maxSlippageBps_, maxTradeUsd_, dailyLimitUsd_);
    }

    function setAgentEnabled(bool enabled) external onlyOwner {
        agentEnabled = enabled;
        emit AgentEnabledSet(enabled);
    }

    function setStrategy(bytes32 strategyId, bool enabled, bytes calldata params) external onlyOwner {
        _setStrategy(strategyId, enabled, params);
    }

    /// @notice Let `operator` (for example the owner's own bot) trade like a keeper until `expiry`. 0 revokes.
    /// @dev Operators are bound to the current owner: ownership changes invalidate every grant.
    function setOperator(address operator, uint64 expiry) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        _operators[operator] = Operator({ expiry: expiry, epoch: operatorEpoch });
        emit OperatorSet(operator, expiry);
    }

    /// @notice Stop or resume all agent swaps. Withdrawals and owner calls are never paused.
    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // ITP lock: held ITP earns a fee discount while it stays locked
    // ----------------------------------------------------------------------------------------------------------------

    /// @notice Lock `amount` more ITP already held by this account. Cancels a pending unlock.
    function lockFeeToken(uint256 amount) external onlyOwner {
        address token = feeToken;
        if (token == address(0)) revert InvalidTarget();
        if (unlockAt != 0 && block.timestamp >= unlockAt) lockedFeeToken = 0;
        uint256 next = uint256(lockedFeeToken) + amount;
        if (IERC20(token).balanceOf(address(this)) < next) revert FeeTokenStillLocked();
        lockedFeeToken = uint128(next);
        unlockAt = 0;
        emit FeeTokenLocked(next);
    }

    /// @notice Start the unlock. The discount stops now; the ITP can be withdrawn after UNLOCK_DELAY.
    function requestUnlock() external onlyOwner {
        if (lockedFeeToken == 0 || unlockAt != 0) revert NothingToUnlock();
        unlockAt = uint64(block.timestamp + UNLOCK_DELAY);
        emit FeeTokenUnlockRequested(unlockAt);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Ownership (two-step). Agent access and operators do not carry over to a new owner.
    // ----------------------------------------------------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        ++operatorEpoch;
        agentEnabled = false;
        emit AgentEnabledSet(false);
        emit OwnershipTransferred(previous, msg.sender);
        factory.syncOwner();
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------------------------------------------------------

    function assets() external view returns (address[] memory) {
        return _assets.values();
    }

    function isAssetEnabled(address token) external view returns (bool) {
        return _assets.contains(token);
    }

    function strategies() external view returns (bytes32[] memory) {
        return _strategies.values();
    }

    function strategyParams(bytes32 strategyId) external view returns (bytes memory) {
        return _strategyParams[strategyId];
    }

    function isOperator(address operator) public view returns (bool) {
        Operator memory g = _operators[operator];
        return g.epoch == operatorEpoch && g.expiry > block.timestamp;
    }

    function operatorExpiry(address operator) external view returns (uint64) {
        return isOperator(operator) ? _operators[operator].expiry : 0;
    }

    function policy() external view returns (Policy memory) {
        return Policy({
            paused: paused,
            agentEnabled: agentEnabled,
            maxSlippageBps: maxSlippageBps,
            maxTradeUsd: maxTradeUsd,
            dailyLimitUsd: dailyLimitUsd,
            windowSpentUsd: block.timestamp >= uint256(windowStart) + LIMIT_WINDOW ? 0 : windowSpentUsd,
            windowStart: windowStart
        });
    }

    /// @notice Agent notional still available in the current 24h window (USD, 18 decimals).
    function remainingDailyUsd() external view returns (uint256) {
        uint256 spentNow = block.timestamp >= uint256(windowStart) + LIMIT_WINDOW ? 0 : windowSpentUsd;
        return spentNow >= dailyLimitUsd ? 0 : dailyLimitUsd - spentNow;
    }

    /// @notice ITP that counts for the fee discount: locked, no unlock pending, still held.
    function discountableFeeToken() external view returns (uint256) {
        if (feeToken == address(0) || unlockAt != 0) return 0;
        uint256 locked = lockedFeeToken;
        return IERC20(feeToken).balanceOf(address(this)) >= locked ? locked : 0;
    }

    /// @notice ITP that withdraw() and execute() must leave in the account.
    function withdrawalLockedFeeToken() external view returns (uint256) {
        return _activeLock();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Internal
    // ----------------------------------------------------------------------------------------------------------------

    /// @return viaOperator true for an owner-added operator, false for an Infinite Trading keeper.
    function _authorizeAgent() private view returns (bool viaOperator) {
        if (isOperator(msg.sender)) return true;
        if (agentEnabled && factory.isActiveKeeper(msg.sender)) return false;
        revert NotAgent();
    }

    function _spendLimit(uint256 notionalUsd) private {
        if (notionalUsd > maxTradeUsd) revert TradeTooLarge(notionalUsd, maxTradeUsd);
        uint256 spentNow = windowSpentUsd;
        if (block.timestamp >= uint256(windowStart) + LIMIT_WINDOW) {
            windowStart = uint64(block.timestamp);
            spentNow = 0;
        }
        uint256 remaining = spentNow >= dailyLimitUsd ? 0 : dailyLimitUsd - spentNow;
        if (notionalUsd > remaining) revert DailyLimitExceeded(notionalUsd, remaining);
        windowSpentUsd = uint128(spentNow + notionalUsd);
    }

    function _enableAsset(address token) private {
        if (!factory.isTradableAsset(token)) revert AssetNotTradable(token);
        if (_assets.add(token)) {
            if (_assets.length() > MAX_ASSETS) revert TooManyAssets();
            emit AssetSet(token, true);
        }
    }

    function _setLimits(uint16 slippage, uint128 maxTrade, uint128 daily) private {
        if (slippage > MAX_SLIPPAGE_BPS) revert SlippageTooHigh();
        maxSlippageBps = slippage;
        maxTradeUsd = maxTrade;
        dailyLimitUsd = daily;
        emit LimitsSet(slippage, maxTrade, daily);
    }

    function _setStrategy(bytes32 strategyId, bool enabled, bytes calldata params) private {
        if (params.length > MAX_PARAMS_BYTES) revert ParamsTooLong();
        if (enabled) {
            if (_strategies.add(strategyId) && _strategies.length() > MAX_STRATEGIES) revert TooManyStrategies();
            _strategyParams[strategyId] = params;
        } else {
            _strategies.remove(strategyId);
            delete _strategyParams[strategyId];
        }
        emit StrategySet(strategyId, enabled, enabled ? params : bytes(""));
    }

    function _activeLock() private view returns (uint256) {
        if (feeToken == address(0)) return 0;
        if (unlockAt != 0 && block.timestamp >= unlockAt) return 0;
        return lockedFeeToken;
    }

    function _checkLock() private view {
        uint256 locked = _activeLock();
        if (locked > 0 && IERC20(feeToken).balanceOf(address(this)) < locked) revert FeeTokenStillLocked();
    }
}
