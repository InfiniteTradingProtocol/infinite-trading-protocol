// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC4626} from "morpho-vault-v2/interfaces/IERC4626.sol";
import {IRateReader} from "../interfaces/IRateReader.sol";
import {IAaveV3Pool} from "../interfaces/IExternal.sol";

/// @title AaveV3RateReader
/// @notice Supply APR of an Aave v3 static aToken (stata, ERC-4626) = the pool's `currentLiquidityRate`.
/// @dev Aave rates are RAY (1e27) APRs; converted to WAD. External incentives (Merit etc.) are not included.
contract AaveV3RateReader is IRateReader {
    IAaveV3Pool public immutable pool;

    constructor(address _pool) {
        pool = IAaveV3Pool(_pool);
    }

    function supplyRate(address target) external view returns (uint256) {
        address underlying = IERC4626(target).asset();
        return uint256(pool.getReserveData(underlying).currentLiquidityRate) / 1e9;
    }
}
