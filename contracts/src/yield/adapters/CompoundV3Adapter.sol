// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "morpho-vault-v2/interfaces/IAdapter.sol";
import {IERC20} from "morpho-vault-v2/interfaces/IERC20.sol";
import {SafeERC20Lib} from "morpho-vault-v2/libraries/SafeERC20Lib.sol";
import {IComet} from "../interfaces/IExternal.sol";

/// @title CompoundV3Adapter
/// @notice Morpho Vault V2 adapter that supplies the vault asset to a Compound III (Comet) market.
/// @dev Mirrors Morpho's MorphoVaultV1Adapter (same id scheme, allocation accounting and skim model).
/// @dev Comet's `withdraw` silently *borrows* when the amount exceeds the supply balance, so deallocations are
/// bounded by the current balance; the adapter can never open a borrow position (it also holds no collateral).
/// @dev COMP rewards accrue to this contract and can be skimmed to `skimRecipient` (set by the vault owner). They
/// are not counted in `realAssets`, and the rate reader ignores them (conservative).
contract CompoundV3Adapter is IAdapter {
    address public immutable factory;
    address public immutable parentVault;
    address public immutable comet;
    address public immutable asset;
    bytes32 public immutable adapterId;

    address public skimRecipient;

    event SetSkimRecipient(address indexed newSkimRecipient);
    event Skim(address indexed token, uint256 assets);

    error AssetMismatch();
    error CannotSkimComet();
    error InvalidData();
    error NotAuthorized();
    error InsufficientSupply(uint256 requested, uint256 available);

    constructor(address _parentVault, address _comet) {
        factory = msg.sender;
        parentVault = _parentVault;
        comet = _comet;
        adapterId = keccak256(abi.encode("this", address(this)));
        address _asset = IVaultV2(_parentVault).asset();
        require(_asset == IComet(_comet).baseToken(), AssetMismatch());
        asset = _asset;
        SafeERC20Lib.safeApprove(_asset, _parentVault, type(uint256).max);
        SafeERC20Lib.safeApprove(_asset, _comet, type(uint256).max);
    }

    function setSkimRecipient(address newSkimRecipient) external {
        require(msg.sender == IVaultV2(parentVault).owner(), NotAuthorized());
        skimRecipient = newSkimRecipient;
        emit SetSkimRecipient(newSkimRecipient);
    }

    /// @dev Sends this adapter's balance of `token` (e.g. claimed COMP) to `skimRecipient`.
    function skim(address token) external {
        require(msg.sender == skimRecipient, NotAuthorized());
        require(token != comet, CannotSkimComet());
        uint256 balance = IERC20(token).balanceOf(address(this));
        SafeERC20Lib.safeTransfer(token, skimRecipient, balance);
        emit Skim(token, balance);
    }

    function allocate(bytes memory data, uint256 assets, bytes4, address) external returns (bytes32[] memory, int256) {
        require(data.length == 0, InvalidData());
        require(msg.sender == parentVault, NotAuthorized());

        if (assets > 0) IComet(comet).supply(asset, assets);
        uint256 oldAllocation = allocation();
        uint256 newAllocation = IComet(comet).balanceOf(address(this));

        // Safe cast: Comet balances are bounded by uint104.
        return (ids(), int256(newAllocation) - int256(oldAllocation));
    }

    function deallocate(bytes memory data, uint256 assets, bytes4, address)
        external
        returns (bytes32[] memory, int256)
    {
        require(data.length == 0, InvalidData());
        require(msg.sender == parentVault, NotAuthorized());

        if (assets > 0) {
            uint256 available = IComet(comet).balanceOf(address(this));
            require(assets <= available, InsufficientSupply(assets, available));
            IComet(comet).withdraw(asset, assets);
        }
        uint256 oldAllocation = allocation();
        uint256 newAllocation = IComet(comet).balanceOf(address(this));

        return (ids(), int256(newAllocation) - int256(oldAllocation));
    }

    function ids() public view returns (bytes32[] memory) {
        bytes32[] memory ids_ = new bytes32[](1);
        ids_[0] = adapterId;
        return ids_;
    }

    function allocation() public view returns (uint256) {
        return IVaultV2(parentVault).allocation(adapterId);
    }

    function realAssets() external view returns (uint256) {
        return allocation() != 0 ? IComet(comet).balanceOf(address(this)) : 0;
    }
}
