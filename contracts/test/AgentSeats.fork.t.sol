// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test, console } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AgentSeats } from "../src/AgentSeats.sol";
import { VelodromeItpOracle } from "../src/VelodromeItpOracle.sol";
import { DeployAgentSeats } from "../script/DeployAgentSeats.s.sol";

/// @notice Real Optimism pools and ITP. Opt-in:
///   AGENT_SEATS_FORK=true FOUNDRY_PROFILE=agent-seats forge test --match-path test/AgentSeats.fork.t.sol
contract AgentSeatsForkTest is Test {
    address internal constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address internal constant DAO_SAFE = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address internal constant ITP_USDC = 0xB84C932059A49e82C2c1bb96E29D59Ec921998Be;

    AgentSeats internal seats;
    VelodromeItpOracle internal oracle;
    bool internal enabled;

    function setUp() public {
        enabled = vm.envOr("AGENT_SEATS_FORK", false);
        if (!enabled) return;
        vm.createSelectFork(vm.envOr("OPTIMISM_RPC_URL", string("https://mainnet.optimism.io")));
        (seats, oracle) = new DeployAgentSeats().deploy(DAO_SAFE);
    }

    function test_Fork_OraclePicksVeloRouteAndAgreesWithDirectPool() public {
        if (!enabled) return;
        (uint256 index, uint256 depth) = oracle.mostLiquidRoute();
        uint256 price = oracle.itpUsdPrice();
        uint256 direct = oracle.routePrice(1);
        console.log("route", index, "ITP depth", depth / 1e18);
        console.log("TWAP $/ITP 1e18 (best, ITP/USDC)", price, direct);
        assertEq(index, 0, "ITP/VELO should be the deepest ITP pool");
        assertApproxEqRel(price, direct, 0.1e18);
        assertGt(price, 1e14); // > $0.0001
        assertLt(price, 1e18); // < $1
    }

    function test_Fork_BuyBurnsRealItpThroughProxy() public {
        if (!enabled) return;
        address manager = makeAddr("manager");
        (uint256 cost,, uint256 price) = seats.quote(1, 2);
        assertApproxEqRel(cost * price, uint256(3998) * 1e34, 0.0001e18);
        deal(ITP, manager, cost);
        uint256 supply = IERC20(ITP).totalSupply();

        vm.startPrank(manager);
        IERC20(ITP).approve(address(seats), cost);
        uint256 first = seats.buySeats(1, 2, cost);
        vm.stopPrank();

        assertEq(IERC20(ITP).totalSupply(), supply - cost);
        assertEq(IERC20(ITP).balanceOf(manager), 0);
        assertTrue(seats.isSeatActive(first + 1));
        assertEq(seats.owner(), DAO_SAFE);
    }

    function test_Fork_BurnOffSendsToDaoSafe() public {
        if (!enabled) return;
        vm.prank(DAO_SAFE);
        seats.setBurnEnabled(false);
        address manager = makeAddr("manager");
        (uint256 cost,,) = seats.quote(2, 1);
        deal(ITP, manager, cost);
        vm.startPrank(manager);
        IERC20(ITP).approve(address(seats), cost);
        seats.buySeats(2, 1, cost);
        vm.stopPrank();

        uint256 before = IERC20(ITP).balanceOf(DAO_SAFE);
        seats.withdrawToDao();
        assertEq(IERC20(ITP).balanceOf(DAO_SAFE), before + cost);
    }
}
