// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IItpPriceOracle } from "./interfaces/IItpPriceOracle.sol";

/// @notice Minimal Velodrome v2 pool surface used by the oracle.
interface IVelodromePool {
    struct Observation {
        uint256 timestamp;
        uint256 reserve0Cumulative;
        uint256 reserve1Cumulative;
    }

    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast);
    function lastObservation() external view returns (Observation memory);
    /// @dev Time-weighted average amount out over the last `granularity` observation windows (30 min each).
    function quote(address tokenIn, uint256 amountIn, uint256 granularity) external view returns (uint256 amountOut);
}

/// @title VelodromeItpOracle
/// @notice USD price of ITP from Velodrome v2 TWAPs. Among the configured ITP → … → USDC routes it prices the one
///         whose first pool holds the most ITP (the most liquid), and optionally cross-checks it against the others.
///         Spot reserves never set the price, so the result cannot be moved by a flash loan within a block.
contract VelodromeItpOracle is IItpPriceOracle, Ownable2Step {
    uint256 public constant MAX_ROUTES = 5;
    uint256 public constant MAX_HOPS = 3;

    address public immutable itp;
    address public immutable usdc;
    uint256 private immutable _scale; // 10 ** (18 + itpDecimals - usdcDecimals)

    uint256 public quoteAmount; // ITP wei sampled per quote
    uint256 public granularity; // 30-minute observation windows averaged
    uint256 public maxStaleness; // max age of each pool's last observation
    uint256 public minItpReserve; // depth a route's first pool needs to be eligible
    uint256 public maxDeviationBps; // 0 disables the cross-route check

    address[][] private _routes;

    event RoutesUpdated(address[][] routes);
    event ParamsUpdated(
        uint256 quoteAmount, uint256 granularity, uint256 maxStaleness, uint256 minItpReserve, uint256 maxDeviationBps
    );

    error InvalidRoute();
    error InvalidParams();
    error NoLiquidRoute();
    error StaleObservation(address pool, uint256 age);
    error PriceDeviation(uint256 price, uint256 otherPrice);

    struct Params {
        uint256 quoteAmount;
        uint256 granularity;
        uint256 maxStaleness;
        uint256 minItpReserve;
        uint256 maxDeviationBps;
    }

    constructor(
        address owner_,
        address itp_,
        address usdc_,
        address[][] memory routes_,
        Params memory params_
    )
        Ownable(owner_)
    {
        if (itp_ == address(0) || usdc_ == address(0)) revert InvalidRoute();
        itp = itp_;
        usdc = usdc_;
        uint8 itpDecimals = IERC20Metadata(itp_).decimals();
        uint8 usdcDecimals = IERC20Metadata(usdc_).decimals();
        if (usdcDecimals > 18 + itpDecimals) revert InvalidParams();
        _scale = 10 ** (18 + itpDecimals - usdcDecimals);
        _setRoutes(routes_);
        _setParams(params_);
    }

    // ==================================================================== price

    function itpUsdPrice() external view returns (uint256 price) {
        (uint256 best, uint256 bestDepth) = _mostLiquidRoute();
        if (bestDepth == 0) revert NoLiquidRoute();
        price = routePrice(best);

        uint256 bps = maxDeviationBps;
        if (bps == 0) return price;
        for (uint256 i; i < _routes.length; ++i) {
            if (i == best || _firstHopDepth(i) < minItpReserve) continue;
            // A secondary route that is stale or too young to quote is skipped rather than blocking purchases.
            try this.routePrice(i) returns (uint256 other) {
                uint256 diff = other > price ? other - price : price - other;
                if (diff * 10_000 > price * bps) revert PriceDeviation(price, other);
            } catch { }
        }
    }

    /// @notice TWAP price (USD per ITP, 1e18) along route `index`. Reverts if any hop's observations are stale.
    function routePrice(uint256 index) public view returns (uint256) {
        address[] storage route = _routes[index];
        address tokenIn = itp;
        uint256 amount = quoteAmount;
        for (uint256 h; h < route.length; ++h) {
            IVelodromePool pool = IVelodromePool(route[h]);
            uint256 age = block.timestamp - pool.lastObservation().timestamp;
            if (age > maxStaleness) revert StaleObservation(address(pool), age);
            amount = pool.quote(tokenIn, amount, granularity);
            address t0 = pool.token0();
            tokenIn = t0 == tokenIn ? pool.token1() : t0;
        }
        return amount * _scale / quoteAmount;
    }

    function mostLiquidRoute() external view returns (uint256 index, uint256 itpDepth) {
        return _mostLiquidRoute();
    }

    function routes() external view returns (address[][] memory) {
        return _routes;
    }

    // ==================================================================== owner

    function setRoutes(address[][] calldata routes_) external onlyOwner {
        _setRoutes(routes_);
    }

    function setParams(Params calldata params_) external onlyOwner {
        _setParams(params_);
    }

    // ================================================================= internal

    function _mostLiquidRoute() private view returns (uint256 index, uint256 depth) {
        uint256 min = minItpReserve;
        for (uint256 i; i < _routes.length; ++i) {
            uint256 d = _firstHopDepth(i);
            if (d >= min && d > depth) (index, depth) = (i, d);
        }
    }

    function _firstHopDepth(uint256 index) private view returns (uint256) {
        IVelodromePool pool = IVelodromePool(_routes[index][0]);
        (uint256 r0, uint256 r1,) = pool.getReserves();
        return pool.token0() == itp ? r0 : r1;
    }

    function _setRoutes(address[][] memory routes_) private {
        if (routes_.length == 0 || routes_.length > MAX_ROUTES) revert InvalidRoute();
        for (uint256 i; i < routes_.length; ++i) {
            address[] memory route = routes_[i];
            if (route.length == 0 || route.length > MAX_HOPS) revert InvalidRoute();
            address tokenIn = itp;
            for (uint256 h; h < route.length; ++h) {
                IVelodromePool pool = IVelodromePool(route[h]);
                address t0 = pool.token0();
                address t1 = pool.token1();
                if (t0 == tokenIn) tokenIn = t1;
                else if (t1 == tokenIn) tokenIn = t0;
                else revert InvalidRoute();
            }
            if (tokenIn != usdc) revert InvalidRoute();
        }
        delete _routes;
        for (uint256 i; i < routes_.length; ++i) {
            _routes.push(routes_[i]);
        }
        emit RoutesUpdated(routes_);
    }

    function _setParams(Params memory p) private {
        if (
            p.quoteAmount == 0 || p.granularity == 0 || p.granularity > 48 || p.maxStaleness == 0
                || p.maxDeviationBps > 10_000
        ) revert InvalidParams();
        quoteAmount = p.quoteAmount;
        granularity = p.granularity;
        maxStaleness = p.maxStaleness;
        minItpReserve = p.minItpReserve;
        maxDeviationBps = p.maxDeviationBps;
        emit ParamsUpdated(p.quoteAmount, p.granularity, p.maxStaleness, p.minItpReserve, p.maxDeviationBps);
    }
}
