// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InfiniteYieldAllocator} from "./InfiniteYieldAllocator.sol";

/// @title InfiniteYieldAllocatorFactory
/// @notice Permissionless deployer of InfiniteYieldAllocator. `isAllocator` lets UIs/auditors verify that an
/// allocator was built from this exact bytecode.
contract InfiniteYieldAllocatorFactory {
    mapping(address account => bool) public isAllocator;

    event CreateAllocator(address indexed vault, address indexed registry, address indexed allocator, address owner);

    function createAllocator(address vault, address registry, address owner, uint256 minApyDelta, uint256 cooldown)
        external
        returns (address allocator)
    {
        allocator = address(new InfiniteYieldAllocator(vault, registry, owner, minApyDelta, cooldown));
        isAllocator[allocator] = true;
        emit CreateAllocator(vault, registry, allocator, owner);
    }
}
