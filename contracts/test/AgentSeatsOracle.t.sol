// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { VelodromeItpOracle } from "../src/VelodromeItpOracle.sol";
import { MockITP, MockUSDC } from "../src/mock/MockITP.sol";
import { MockVelodromePool } from "../src/mock/MockVelodromePool.sol";

contract AgentSeatsOracleTest is Test {
    MockITP internal itp;
    MockUSDC internal usdc;
    MockITP internal velo;
    MockVelodromePool internal itpVelo; // token0 ITP, 0.15 VELO per ITP, 2M ITP deep
    MockVelodromePool internal veloUsdc; // token0 USDC, 24.69 VELO per USDC
    MockVelodromePool internal itpUsdc; // token0 ITP, 0.0061 USDC per ITP, 555k ITP deep
    VelodromeItpOracle internal oracle;
    address internal dao = makeAddr("daoSafe");

    function setUp() public {
        vm.warp(1_800_000_000);
        itp = new MockITP();
        usdc = new MockUSDC();
        velo = new MockITP();
        itpVelo = new MockVelodromePool(address(itp), address(velo), 0.1513e18, 2_000_000e18, 304_000e18);
        // USDC(6 dec) → VELO(18 dec): 1 USDC unit = 24.69e12 VELO wei.
        veloUsdc = new MockVelodromePool(address(usdc), address(velo), 24.69e12 * 1e18, 566_901e6, 14_000_000e18);
        // ITP(18) → USDC(6): 1 ITP wei = 0.006126e-12 USDC units.
        itpUsdc = new MockVelodromePool(address(itp), address(usdc), 0.006126e6, 555_000e18, 3401e6);
        oracle = new VelodromeItpOracle(dao, address(itp), address(usdc), _routes(), _params(2000));
    }

    function _routes() internal view returns (address[][] memory r) {
        r = new address[][](2);
        r[0] = new address[](2);
        (r[0][0], r[0][1]) = (address(itpVelo), address(veloUsdc));
        r[1] = new address[](1);
        r[1][0] = address(itpUsdc);
    }

    function _params(uint256 deviationBps) internal pure returns (VelodromeItpOracle.Params memory) {
        return VelodromeItpOracle.Params({
            quoteAmount: 1000e18,
            granularity: 4,
            maxStaleness: 1 days,
            minItpReserve: 100_000e18,
            maxDeviationBps: deviationBps
        });
    }

    function test_PicksMostLiquidRouteAndScales() public view {
        (uint256 index, uint256 depth) = oracle.mostLiquidRoute();
        assertEq(index, 0);
        assertEq(depth, 2_000_000e18);
        uint256 price = oracle.itpUsdPrice();
        // 1000 ITP → 151.3 VELO → 151.3 / 24.69 USDC = 6.1280 USDC → $0.0061280 per ITP.
        assertApproxEqRel(price, 0.006128e18, 0.0001e18);
        assertEq(price, oracle.routePrice(0));
        assertEq(oracle.routePrice(1), 0.006126e18);
    }

    function test_SwitchesRouteWhenLiquidityMoves() public {
        itpVelo.set(0.1513e18, 50_000e18, 7000e18, block.timestamp); // below minItpReserve
        (uint256 index,) = oracle.mostLiquidRoute();
        assertEq(index, 1);
        assertEq(oracle.itpUsdPrice(), 0.006126e18);
    }

    function test_RevertsWithoutLiquidRoute() public {
        itpVelo.set(0.1513e18, 1e18, 1e18, block.timestamp);
        itpUsdc.set(0.006126e6, 1e18, 1e6, block.timestamp);
        vm.expectRevert(VelodromeItpOracle.NoLiquidRoute.selector);
        oracle.itpUsdPrice();
    }

    function test_RevertsWhenAnyHopIsStale() public {
        veloUsdc.set(24.69e12 * 1e18, 566_901e6, 14_000_000e18, block.timestamp - 1 days - 1);
        vm.expectRevert(
            abi.encodeWithSelector(VelodromeItpOracle.StaleObservation.selector, address(veloUsdc), 1 days + 1)
        );
        oracle.itpUsdPrice();
    }

    function test_StaleSecondaryRouteIsSkipped() public {
        itpUsdc.set(0.001e6, 555_000e18, 3401e6, block.timestamp - 2 days);
        assertApproxEqRel(oracle.itpUsdPrice(), 0.006128e18, 0.0001e18);
    }

    function test_DeviationGuard() public {
        itpUsdc.set(0.0045e6, 555_000e18, 3401e6, block.timestamp); // ~27% below the main route
        vm.expectRevert();
        oracle.itpUsdPrice();

        vm.prank(dao);
        oracle.setParams(_params(0)); // disabled
        assertApproxEqRel(oracle.itpUsdPrice(), 0.006128e18, 0.0001e18);
    }

    function test_RouteValidation() public {
        address[][] memory bad = new address[][](1);
        bad[0] = new address[](1);
        bad[0][0] = address(veloUsdc); // does not start at ITP
        vm.prank(dao);
        vm.expectRevert(VelodromeItpOracle.InvalidRoute.selector);
        oracle.setRoutes(bad);

        bad[0][0] = address(itpVelo); // ends at VELO, not USDC
        vm.prank(dao);
        vm.expectRevert(VelodromeItpOracle.InvalidRoute.selector);
        oracle.setRoutes(bad);

        vm.prank(dao);
        vm.expectRevert(VelodromeItpOracle.InvalidRoute.selector);
        oracle.setRoutes(new address[][](0));

        address[][] memory only = new address[][](1);
        only[0] = new address[](1);
        only[0][0] = address(itpUsdc);
        vm.prank(dao);
        oracle.setRoutes(only);
        assertEq(oracle.routes().length, 1);
        assertEq(oracle.itpUsdPrice(), 0.006126e18);
    }

    function test_OnlyOwnerConfigures() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        oracle.setParams(_params(100));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        oracle.setRoutes(_routes());

        VelodromeItpOracle.Params memory p = _params(100);
        p.granularity = 0;
        vm.prank(dao);
        vm.expectRevert(VelodromeItpOracle.InvalidParams.selector);
        oracle.setParams(p);
    }
}
