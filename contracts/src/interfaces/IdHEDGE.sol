// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ─────────────────────────────────────────────────────────────────────────────
//  Minimal dHEDGE / ChamberFi V2 interfaces
//  Infinite Trading DAO  ·  https://infinitetrading.io
//
//  Only the surface consumed by TraderRouter is declared here. Signatures are
//  transcribed from dhedge/V2-Public @ contracts/PoolLogic.sol and
//  contracts/PoolManagerLogic.sol (solidity 0.7.6 upstream; ABI-compatible).
// ─────────────────────────────────────────────────────────────────────────────

interface IPoolLogic {
    struct TxToExecute {
        address to;
        bytes data;
    }

    /// @dev Authorises on `msg.sender == manager || trader || factory.owner()`.
    function execTransaction(address to, bytes calldata data) external returns (bool success);

    function execTransactions(TxToExecute[] calldata txs) external;

    function poolManagerLogic() external view returns (address);

    function factory() external view returns (address);

    function mintManagerFee() external;
}

interface IPoolManagerLogic {
    struct Asset {
        address asset;
        bool isDeposit;
    }

    /// @dev Trader is allowed only while `traderAssetChangeDisabled == false`.
    function changeAssets(Asset[] calldata addAssets, address[] calldata removeAssets) external;

    /// @dev Trader is allowed only while `traderPrivacyChangeEnabled == true`.
    function setPoolPrivate(bool privatePool) external;

    /// @dev Plain `manager || trader` check upstream.
    function setMaxSupplyCap(uint256 maxSupplyCapD18) external;

    function manager() external view returns (address);

    function trader() external view returns (address);

    function poolLogic() external view returns (address);

    function traderAssetChangeDisabled() external view returns (bool);

    function traderPrivacyChangeEnabled() external view returns (bool);
}
