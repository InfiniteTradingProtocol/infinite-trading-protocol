// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CompoundV3Adapter} from "./CompoundV3Adapter.sol";

/// @title CompoundV3AdapterFactory
/// @notice Deterministic, permissionless deployer of CompoundV3Adapter (one per parent vault and Comet).
contract CompoundV3AdapterFactory {
    mapping(address parentVault => mapping(address comet => address)) public compoundV3Adapter;
    mapping(address account => bool) public isCompoundV3Adapter;

    event CreateCompoundV3Adapter(address indexed parentVault, address indexed comet, address indexed adapter);

    function createCompoundV3Adapter(address parentVault, address comet) external returns (address adapter) {
        adapter = address(new CompoundV3Adapter{salt: bytes32(0)}(parentVault, comet));
        compoundV3Adapter[parentVault][comet] = adapter;
        isCompoundV3Adapter[adapter] = true;
        emit CreateCompoundV3Adapter(parentVault, comet, adapter);
    }
}
