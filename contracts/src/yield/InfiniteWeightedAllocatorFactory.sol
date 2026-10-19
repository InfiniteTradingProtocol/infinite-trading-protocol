// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InfiniteWeightedAllocator} from "./InfiniteWeightedAllocator.sol";

contract InfiniteWeightedAllocatorFactory {
    event AllocatorCreated(address indexed vault, address indexed allocator);

    function createAllocator(address vault, address registry, address dao, uint256 drift, uint256 cooldown)
        external
        returns (address allocator)
    {
        allocator = address(new InfiniteWeightedAllocator(vault, registry, dao, msg.sender, drift, cooldown));
        emit AllocatorCreated(vault, allocator);
    }
}
