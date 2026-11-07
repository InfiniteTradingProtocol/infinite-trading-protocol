// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Per-user Infinite Subaccount. See InfiniteSubaccount.sol for the trust model.
interface IInfiniteSubaccount {
    /// @notice Policy chosen by the owner when the account is created.
    /// @dev USD values have 18 decimals.
    struct InitParams {
        address[] assets; // tokens the agent may trade between
        uint16 maxSlippageBps; // max loss per agent swap versus the oracle price
        uint128 maxTradeUsd; // max notional per agent swap
        uint128 dailyLimitUsd; // max agent notional per 24h window
        bool agentEnabled; // Infinite Trading keepers may trade
        bytes32[] strategyIds; // strategies the agent may run
        bytes[] strategyParams; // abi-encoded parameters, one per strategy id
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    struct Swap {
        bytes32 strategyId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut; // agent's own bound; the oracle bound always applies as well
        address router;
        bytes data; // router calldata; output may go to the account or the sandbox
    }

    struct Policy {
        bool paused;
        bool agentEnabled;
        uint16 maxSlippageBps;
        uint128 maxTradeUsd;
        uint128 dailyLimitUsd;
        uint128 windowSpentUsd;
        uint64 windowStart;
    }

    event Initialized(address indexed factory, address indexed owner);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event Executed(address indexed target, uint256 value, bytes4 selector);
    event AssetSet(address indexed token, bool enabled);
    event LimitsSet(uint16 maxSlippageBps, uint128 maxTradeUsd, uint128 dailyLimitUsd);
    event AgentEnabledSet(bool enabled);
    event StrategySet(bytes32 indexed strategyId, bool enabled, bytes params);
    event OperatorSet(address indexed operator, uint64 expiry);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed owner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeeTokenLocked(uint256 locked);
    event FeeTokenUnlockRequested(uint256 unlockAt);
    event SwapExecuted(
        bytes32 indexed strategyId,
        address indexed agent,
        address indexed tokenIn,
        address tokenOut,
        uint256 spent,
        uint256 received,
        uint256 notionalUsd,
        uint256 fee
    );

    /// @param ownerCreated false when a keeper created the account; agent access then starts off.
    function initialize(address owner, InitParams calldata params, bool ownerCreated) external;
    function owner() external view returns (address);
    function discountableFeeToken() external view returns (uint256);
}
