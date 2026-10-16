// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRateReader} from "../interfaces/IRateReader.sol";
import {IFluidLendingResolver} from "../interfaces/IExternal.sol";

/// @title FluidRateReader
/// @notice Supply APR of a Fluid fToken = Liquidity-layer supply rate + fToken rewards rate (both accrue into the
/// fToken exchange price). `target` is the fToken.
/// @dev Uses Fluid's LendingResolver. Resolvers are periodically redeployed with new ABIs; if that happens deploy a
/// new reader and swap it in the registry (`setRateReader`).
contract FluidRateReader is IRateReader {
    IFluidLendingResolver public immutable resolver;

    /// @dev Liquidity supply rate: 1e2 = 1%  -> WAD multiplier 1e14.
    uint256 internal constant SUPPLY_RATE_TO_WAD = 1e14;
    /// @dev Rewards rate model: 1e12 = 1%   -> WAD multiplier 1e4.
    uint256 internal constant REWARDS_RATE_TO_WAD = 1e4;

    constructor(address _resolver) {
        resolver = IFluidLendingResolver(_resolver);
    }

    function supplyRate(address target) external view returns (uint256) {
        IFluidLendingResolver.FTokenDetails memory d = resolver.getFTokenDetails(target);
        return d.supplyRate * SUPPLY_RATE_TO_WAD + d.rewardsRate * REWARDS_RATE_TO_WAD;
    }
}
