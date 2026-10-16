// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/src/Script.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AgentSeats } from "../src/AgentSeats.sol";
import { VelodromeItpOracle } from "../src/VelodromeItpOracle.sol";
import { IAgentSeats } from "../src/interfaces/IAgentSeats.sol";

/// @notice Deploys the Infinite Agents seat contracts on Optimism:
///         VelodromeItpOracle (owner = DAO Safe) + AgentSeats implementation + ERC1967 proxy initialized with
///         owner = dao = DAO Safe, burn on, plans 1 = 30 days / $19.99 and 2 = 90 days / $49.99.
///
/// Usage:
///   DEPLOYER_PRIVATE_KEY=0x...   # any funded key; it holds no role afterwards
///   FOUNDRY_PROFILE=agent-seats forge script script/DeployAgentSeats.s.sol --rpc-url optimism --broadcast --verify
contract DeployAgentSeats is Script {
    address internal constant ITP = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0;
    address internal constant USDC = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address internal constant DAO_SAFE = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;

    // Velodrome v2 volatile pools.
    address internal constant ITP_VELO = 0xC04754F8027aBBFe9EeA492C9cC78b66946a07D1;
    address internal constant VELO_USDC = 0xa0A215dE234276CAc1b844fD58901351a50fec8A;
    address internal constant ITP_USDC = 0xB84C932059A49e82C2c1bb96E29D59Ec921998Be;
    address internal constant ITP_OP = 0x79F1af622FE2C636a2d946F03A62D1DfC8cA6de4;
    address internal constant OP_USDC = 0x67F56Ac099F11aD5F65E2ec804f75F2cEa6ab8C5;

    function run() external returns (AgentSeats seats, VelodromeItpOracle oracle) {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        (seats, oracle) = deploy(DAO_SAFE);
        vm.stopBroadcast();

        console.log("VelodromeItpOracle:", address(oracle));
        console.log("AgentSeats proxy  :", address(seats));
        console.log("Owner / DAO       :", seats.owner(), seats.dao());
        (uint256 itpFor30d,,) = seats.quote(1, 1);
        console.log("ITP wei for one 30-day seat now:", itpFor30d);
    }

    function deploy(address dao) public returns (AgentSeats seats, VelodromeItpOracle oracle) {
        oracle = new VelodromeItpOracle(dao, ITP, USDC, routes(), params());
        AgentSeats impl = new AgentSeats();
        bytes memory init = abi.encodeCall(AgentSeats.initialize, (IERC20(ITP), dao, oracle, plans()));
        seats = AgentSeats(address(new ERC1967Proxy(address(impl), init)));
    }

    function routes() public pure returns (address[][] memory r) {
        r = new address[][](3);
        r[0] = new address[](2);
        (r[0][0], r[0][1]) = (ITP_VELO, VELO_USDC);
        r[1] = new address[](1);
        r[1][0] = ITP_USDC;
        r[2] = new address[](2);
        (r[2][0], r[2][1]) = (ITP_OP, OP_USDC);
    }

    function params() public pure returns (VelodromeItpOracle.Params memory) {
        return VelodromeItpOracle.Params({
            quoteAmount: 1000e18, // small vs. pool depth, so TWAP price impact is negligible
            granularity: 4, // 4 × 30-min windows ≈ 2h TWAP
            maxStaleness: 1 days, // anyone can refresh with pool.sync() if trading is quiet
            minItpReserve: 100_000e18,
            maxDeviationBps: 2000 // 20% cross-route sanity check
        });
    }

    function plans() public pure returns (IAgentSeats.Plan[] memory p) {
        p = new IAgentSeats.Plan[](2);
        p[0] = IAgentSeats.Plan({ duration: 30 days, usdCents: 1999, active: true });
        p[1] = IAgentSeats.Plan({ duration: 90 days, usdCents: 4999, active: true });
    }
}
