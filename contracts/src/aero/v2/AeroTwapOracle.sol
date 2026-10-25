// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IAeroV2Pool } from "./IAeroV2.sol";

/// @notice Permissionless TWAP of classic Aero pool reserves, built from the pool's reserve cumulatives.
/// @dev Aero classic pools on Optimism expose currentCumulativePrices() but no quote()/observations, so the
/// snapshots live here. Anyone may call update(); writes are rate-limited to one per GRANULARITY per pool, so
/// spam cannot evict useful history. A same-block reserve manipulation adds nothing to the cumulative.
/// averageReserves() returns ok=false when no snapshot is between MIN_WINDOW and MAX_WINDOW old; callers
/// must then skip price-sensitive work (never fall back to spot).
contract AeroTwapOracle {
    uint256 public constant GRANULARITY = 10 minutes;
    uint256 public constant MIN_WINDOW = 30 minutes;
    uint256 public constant MAX_WINDOW = 36 hours;
    uint256 public constant SIZE = 240;

    struct Observation {
        uint256 timestamp;
        uint256 reserve0Cumulative;
        uint256 reserve1Cumulative;
    }

    mapping(address pool => Observation[SIZE]) private _observations;
    mapping(address pool => uint256) public nextIndex;
    mapping(address pool => uint256) public observationCount;

    event Updated(address indexed pool, uint256 timestamp, uint256 reserve0Cumulative, uint256 reserve1Cumulative);

    /// @return written true when a new snapshot was stored.
    function update(address pool) public returns (bool written) {
        uint256 count = observationCount[pool];
        uint256 next = nextIndex[pool];
        if (count != 0 && block.timestamp - _observations[pool][(next + SIZE - 1) % SIZE].timestamp < GRANULARITY) {
            return false;
        }
        (uint256 c0, uint256 c1,) = IAeroV2Pool(pool).currentCumulativePrices();
        _observations[pool][next] = Observation(block.timestamp, c0, c1);
        nextIndex[pool] = (next + 1) % SIZE;
        if (count < SIZE) observationCount[pool] = count + 1;
        emit Updated(pool, block.timestamp, c0, c1);
        return true;
    }

    function updateMany(address[] calldata pools) external {
        for (uint256 i; i < pools.length; ++i) {
            update(pools[i]);
        }
    }

    /// @notice Time-weighted average reserves over the newest window that is at least MIN_WINDOW long.
    function averageReserves(address pool) external view returns (bool ok, uint256 reserve0, uint256 reserve1) {
        uint256 count = observationCount[pool];
        if (count == 0) return (false, 0, 0);
        (uint256 c0, uint256 c1,) = IAeroV2Pool(pool).currentCumulativePrices();
        uint256 next = nextIndex[pool];
        for (uint256 i; i < count; ++i) {
            Observation storage o = _observations[pool][(next + SIZE - 1 - i) % SIZE];
            uint256 age = block.timestamp - o.timestamp;
            if (age < MIN_WINDOW) continue;
            if (age > MAX_WINDOW) return (false, 0, 0);
            reserve0 = (c0 - o.reserve0Cumulative) / age;
            reserve1 = (c1 - o.reserve1Cumulative) / age;
            return (reserve0 != 0 && reserve1 != 0, reserve0, reserve1);
        }
        return (false, 0, 0);
    }

    function observation(address pool, uint256 index) external view returns (Observation memory) {
        return _observations[pool][index % SIZE];
    }
}
