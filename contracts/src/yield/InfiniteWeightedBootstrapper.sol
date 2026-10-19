// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InfiniteYieldBootstrapper} from "./InfiniteYieldBootstrapper.sol";
import {InfiniteWeightedAllocator} from "./InfiniteWeightedAllocator.sol";
import {IInfiniteTradingRegistry} from "./interfaces/IInfiniteTradingRegistry.sol";

contract InfiniteWeightedBootstrapper is InfiniteYieldBootstrapper {
    uint256[] private _initialWeights;

    constructor(uint256[] memory weights) {
        _initialWeights = weights;
    }

    function _bestAdapter(address r, address v) internal override returns (address) {
        IInfiniteTradingRegistry registry = IInfiniteTradingRegistry(r);
        InfiniteWeightedAllocator(registry.allocatorOf(v)).initializePolicy(registry.integrationsOf(v), _initialWeights);
        // Morpho's unmodified core has one liquidity adapter. In split mode deposits stay idle until rebalance.
        return address(0);
    }
}
