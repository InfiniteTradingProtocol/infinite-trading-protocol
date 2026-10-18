// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { Ownable2StepUpgradeable } from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IManagedVaultFactory } from "./interfaces/IManagedVaultFactory.sol";

/// @title ManagedVault
/// @notice A single-owner vault with DAO-controlled factory policies for router, asset and executor allowlists.
/// @dev This is a lightweight production-ready PoC for strategy-managed vaults. The owner can deposit/withdraw,
///      transfer ownership, and authorize or self-execute trades. The factory controls the global allowlists and fee splits.
contract ManagedVault is Initializable, Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    address public factory;
    bytes32 public metadataHash;
    string public metadataUri;
    string public strategyTag;
    uint256 public depositedValue;
    uint256 public totalWithdrawn;
    uint256 public totalFeesCollected;

    error NotFactory();
    error InvalidToken();
    error InvalidRouter();
    error InvalidExecutor();
    error ZeroAddress();
    error InsufficientValue();
    error UnauthorizedTrade();
    error TradeFailed();
    error MetadataNotAllowed();

    event MetadataUpdated(bytes32 indexed metadataHash, string uri, string strategyTag);
    event TradeExecuted(
        address indexed router,
        address indexed tokenIn,
        address indexed executor,
        address rewardRecipient,
        uint256 amountIn,
        uint256 feePaid,
        uint256 executorShare
    );
    event Deposited(address indexed token, address indexed depositor, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _factory,
        address _owner,
        bytes32 _metadataHash,
        string calldata _metadataUri,
        string calldata _strategyTag,
        uint16,
        uint16
    ) external initializer {
        if (_factory == address(0) || _owner == address(0)) revert ZeroAddress();
        __Ownable_init(_owner);
        __Pausable_init();
        factory = _factory;
        metadataHash = _metadataHash;
        metadataUri = _metadataUri;
        strategyTag = _strategyTag;
    }

    function setMetadata(bytes32 newHash, string calldata newUri, string calldata newStrategyTag)
        external
        onlyOwner
    {
        metadataHash = newHash;
        metadataUri = newUri;
        strategyTag = newStrategyTag;
        emit MetadataUpdated(newHash, newUri, newStrategyTag);
    }

    function setFactoryMetadata(bytes32 newHash, string calldata newUri, string calldata newStrategyTag)
        external
    {
        if (msg.sender != factory) revert NotFactory();
        metadataHash = newHash;
        metadataUri = newUri;
        strategyTag = newStrategyTag;
        emit MetadataUpdated(newHash, newUri, newStrategyTag);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function depositERC20(address token, uint256 amount) external nonReentrant whenNotPaused {
        if (!IManagedVaultFactory(factory).isApprovedAsset(token)) revert InvalidToken();
        if (amount == 0) revert InsufficientValue();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        depositedValue += amount;
        emit Deposited(token, msg.sender, amount);
    }

    function depositETH() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InsufficientValue();
        depositedValue += msg.value;
        emit Deposited(address(0), msg.sender, msg.value);
    }

    function withdrawERC20(address token, uint256 amount, address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (!IManagedVaultFactory(factory).isApprovedAsset(token)) revert InvalidToken();
        if (amount == 0) revert InsufficientValue();
        IERC20(token).safeTransfer(recipient, amount);
        totalWithdrawn += amount;
        emit Withdrawn(token, recipient, amount);
    }

    function withdrawETH(uint256 amount, address payable recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InsufficientValue();
        if (address(this).balance < amount) revert InsufficientValue();
        recipient.transfer(amount);
        totalWithdrawn += amount;
        emit Withdrawn(address(0), recipient, amount);
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        super.transferOwnership(newOwner);
    }

    function executeTrade(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata callData,
        address executor,
        address rewardRecipient,
        uint256 minOut
    ) external payable nonReentrant whenNotPaused returns (bytes memory response) {
        if (router == address(0)) revert ZeroAddress();
        if (tokenIn == address(0) && msg.value == 0) revert InsufficientValue();
        if (!IManagedVaultFactory(factory).isApprovedRouter(router)) revert InvalidRouter();
        if (!IManagedVaultFactory(factory).isApprovedAsset(tokenIn)) revert InvalidToken();
        if (!IManagedVaultFactory(factory).isApprovedAsset(tokenOut)) revert InvalidToken();

        address effectiveExecutor = executor == address(0) ? msg.sender : executor;
        bool senderIsOwner = msg.sender == owner();
        bool senderIsFactory = msg.sender == factory;
        bool senderIsMulticall = msg.sender == IManagedVaultFactory(factory).MULTICALL3();
        bool senderIsApprovedExecutor = IManagedVaultFactory(factory).isApprovedExecutor(msg.sender);
        bool effectiveIsApprovedExecutor = IManagedVaultFactory(factory).isApprovedExecutor(effectiveExecutor);
        bool ownerIsEffective = effectiveExecutor == owner();

        if (!(senderIsOwner || senderIsFactory || senderIsMulticall || senderIsApprovedExecutor || ownerIsEffective || effectiveIsApprovedExecutor)) {
            revert UnauthorizedTrade();
        }

        if (rewardRecipient == address(0)) revert ZeroAddress();

        uint256 feeBps = IManagedVaultFactory(factory).tradeFeeBps();
        uint256 executorFeeShareBps = IManagedVaultFactory(factory).executorFeeShareBps();
        uint256 fee = (amountIn * feeBps) / 10_000;
        uint256 executorShare = (fee * executorFeeShareBps) / 10_000;
        uint256 treasuryShare = fee - executorShare;

        if (tokenIn == address(0)) {
            if (msg.value < amountIn + fee) revert InsufficientValue();
            uint256 valueForTrade = amountIn;
            (bool success, bytes memory data) = router.call{ value: valueForTrade }(callData);
            if (!success) revert TradeFailed();
            response = data;
            if (treasuryShare > 0) payable(IManagedVaultFactory(factory).feeTreasury()).transfer(treasuryShare);
            if (executorShare > 0) payable(rewardRecipient).transfer(executorShare);
            if (msg.value > amountIn + fee) {
                payable(msg.sender).transfer(msg.value - amountIn - fee);
            }
        } else {
            if (IERC20(tokenIn).balanceOf(address(this)) < amountIn + fee) revert InsufficientValue();
            IERC20(tokenIn).safeTransfer(router, amountIn);
            if (treasuryShare > 0) {
                IERC20(tokenIn).safeTransfer(IManagedVaultFactory(factory).feeTreasury(), treasuryShare);
            }
            if (executorShare > 0) {
                IERC20(tokenIn).safeTransfer(rewardRecipient, executorShare);
            }
            (bool success, bytes memory data) = router.call(callData);
            if (!success) revert TradeFailed();
            response = data;
            if (minOut > 0 && IERC20(tokenOut).balanceOf(address(this)) < minOut) revert TradeFailed();
        }

        totalFeesCollected += fee;
        emit TradeExecuted(router, tokenIn, effectiveExecutor, rewardRecipient, amountIn, fee, executorShare);
    }

}
