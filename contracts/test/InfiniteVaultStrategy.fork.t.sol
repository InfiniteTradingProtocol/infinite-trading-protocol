// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test, console } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { UpgradeableBeacon } from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import { BeaconProxy } from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import { InfiniteVaultStrategy } from "../src/velodrome/InfiniteVaultStrategy.sol";
import { ISolidlyRouter } from "../src/velodrome/interfaces/ISolidlyRouter.sol";

interface IMulticall3 {
    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory);
}

interface IVaultFactory {
    function getActiveVaults() external view returns (address[] memory);
    function upgradeBeacon(address newImplementation) external;
}

/// Forks Optimism, upgrades the live beacon to the new implementation and exercises the real vaults.
/// Run: forge test --evm-version cancun --skip script --match-path test/InfiniteVaultStrategy.fork.t.sol -vv
contract InfiniteVaultStrategyForkTest is Test {
    address constant FACTORY = 0x88E883a28C8C2f7524C7aAd0a44309E190337D5b;
    // DAO Safe: sole DEFAULT_ADMIN_ROLE holder since 2026-09-30.
    address constant FACTORY_ADMIN = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant BEACON = 0x7Ef3e66BD423B774E132fB15b19bd4c5216926e6;
    address constant OLD_IMPL = 0x65c1D7Ae1F840f288c2CCD9a5871fca6497a65f2;
    address constant LIVE_V2 = 0xaE62D9A7682C1c8ca780dCe94E53D0153bb679dd;
    address constant VOTER = 0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C;
    address constant MULTICALL3 = 0xcA11bde05977b3631167028862bE2a173976CA11;
    address constant VELO_VAULT = 0x569D92f0c94C04C74c2f3237983281875D9e2247;
    address constant WSTETH_VAULT = 0x2811a577cf57A2Aa34e94B0Eb56157066717563f;
    // Velodrome killed this gauge: no emissions, swap fees stuck in the gauge.
    address constant DHT_VAULT = 0xFCEa66a3333a4A3d911ce86cEf8Bdbb8bC16aCA6;
    address constant RECIPIENT = address(0xBEEF);
    address constant USER = address(0xA11CE);

    address[] vaults;

    function setUp() public {
        vm.createSelectFork(vm.envOr("OPTIMISM_RPC_URL", string("https://optimism-rpc.publicnode.com")));
        vaults = IVaultFactory(FACTORY).getActiveVaults();
    }

    function _upgrade() internal {
        address impl = address(new InfiniteVaultStrategy());
        // Same call the DAO/admin will make on mainnet.
        vm.prank(FACTORY_ADMIN);
        IVaultFactory(FACTORY).upgradeBeacon(impl);
        assertEq(UpgradeableBeacon(BEACON).implementation(), impl);
    }

    function _snapshot(InfiniteVaultStrategy v) internal view returns (bytes32) {
        (uint256 total, uint256 inf, uint256 call, uint256 burn,, bool active) = v.feeCategory();
        return keccak256(
            abi.encode(
                abi.encode(v.want(), v.output(), v.native(), v.lpToken0(), v.lpToken1(), v.gauge(), v.unirouter()),
                abi.encode(v.factory(), v.stable(), v.lastHarvest(), v.withdrawalFee(), v.slippageTolerance()),
                abi.encode(v.swapDeadline(), total, inf, call, burn, active, v.infiniteFeeRecipient()),
                abi.encode(v.owner(), v.totalSupply(), v.balance(), v.name(), v.symbol(), v.paused()),
                abi.encode(_route(v, 0), _route(v, 1), _route(v, 2))
            )
        );
    }

    function test_StorageLayoutPreservedOnAllVaults() public {
        bytes32[] memory before = new bytes32[](vaults.length);
        for (uint256 i; i < vaults.length; ++i) {
            InfiniteVaultStrategy v = InfiniteVaultStrategy(vaults[i]);
            before[i] = _snapshot(v);
        }
        _upgrade();
        for (uint256 i; i < vaults.length; ++i) {
            InfiniteVaultStrategy v = InfiniteVaultStrategy(vaults[i]);
            assertEq(_snapshot(v), before[i]);
            assertTrue(v.harvestOnDeposit(), "harvestOnDeposit should default to true");
        }
    }

    function test_HarvestDeploysIdleTokens() public {
        _upgrade();
        InfiniteVaultStrategy v = InfiniteVaultStrategy(WSTETH_VAULT);
        IERC20 t0 = IERC20(v.lpToken0());
        IERC20 t1 = IERC20(v.lpToken1());
        vm.warp(block.timestamp + 2 hours);

        uint256 idle0 = t0.balanceOf(address(v));
        uint256 idle1 = t1.balanceOf(address(v));
        uint256 tvlBefore = v.balance();

        v.harvest(RECIPIENT);

        console.log("idle ITP", idle0, "->", t0.balanceOf(address(v)));
        console.log("idle wstETH", idle1, "->", t1.balanceOf(address(v)));
        assertGt(v.balance(), tvlBefore, "no LP added");
        assertLt(t0.balanceOf(address(v)), idle0 / 100 + 1, "token0 still idle");
    }

    function test_ZapIsCappedForIlliquidPools() public {
        _upgrade();
        vm.warp(block.timestamp + 2 hours);
        for (uint256 i; i < vaults.length; ++i) {
            InfiniteVaultStrategy v = InfiniteVaultStrategy(vaults[i]);
            (uint256 r0, uint256 r1,) = IPair(v.want()).getReserves();
            v.harvest(RECIPIENT);
            (uint256 a0, uint256 a1,) = IPair(v.want()).getReserves();
            // ITP price in the pair (token1 per ITP), scaled; must not move more than ~1.5% in one harvest.
            uint256 pBefore = r1 * 1e36 / r0;
            uint256 pAfter = a1 * 1e36 / a0;
            uint256 moveBps = (pBefore > pAfter ? pBefore - pAfter : pAfter - pBefore) * 10_000 / pBefore;
            console.log(v.name(), "ITP price move bps", moveBps);
            assertLe(moveBps, 150);
        }
    }

    function test_HarvestNoArgStillPaysCaller() public {
        _upgrade();
        vm.warp(block.timestamp + 1 days);
        InfiniteVaultStrategy v = InfiniteVaultStrategy(VELO_VAULT);
        IERC20 itp = IERC20(v.native());
        uint256 before = itp.balanceOf(USER);
        vm.prank(USER);
        v.harvest();
        assertGt(itp.balanceOf(USER), before, "caller got no call fee");
    }

    function test_HarvestAllViaMulticallPaysRecipient() public {
        _upgrade();
        address native = InfiniteVaultStrategy(vaults[0]).native();

        IMulticall3.Call3[] memory calls = new IMulticall3.Call3[](vaults.length);
        for (uint256 i; i < vaults.length; ++i) {
            calls[i] = IMulticall3.Call3(vaults[i], false, abi.encodeWithSignature("harvest(address)", RECIPIENT));
        }

        vm.warp(block.timestamp + 1 days);
        uint256 multicallBefore = IERC20(native).balanceOf(MULTICALL3);
        IMulticall3(MULTICALL3).aggregate3(calls);

        assertGt(IERC20(native).balanceOf(RECIPIENT), 0, "recipient got no call fee");
        assertEq(IERC20(native).balanceOf(MULTICALL3), multicallBefore, "call fee leaked to Multicall3");
    }

    function test_DepositWithdrawRoundTripAllLiveVaults() public {
        _upgrade();
        for (uint256 i; i < vaults.length; ++i) {
            if (vaults[i] == DHT_VAULT) continue;
            InfiniteVaultStrategy v = InfiniteVaultStrategy(vaults[i]);
            IERC20 want = IERC20(v.want());
            uint256 amount = v.balance() / 10 + 1e12;
            deal(address(want), USER, amount);

            vm.startPrank(USER);
            want.approve(address(v), amount);
            v.deposit(amount);
            vm.warp(block.timestamp + 1 days);
            v.withdraw(v.balanceOf(USER));
            vm.stopPrank();

            uint256 received = want.balanceOf(USER);
            console.log(v.name(), amount, received);
            assertGe(received, amount * (10_000 - v.withdrawalFee()) / 10_000 - 1, "lost more than withdrawal fee");
        }
    }

    function test_WithdrawNeverBlockedByHarvest() public {
        _upgrade();
        vm.warp(block.timestamp + 1 days);
        for (uint256 i; i < vaults.length; ++i) {
            InfiniteVaultStrategy v = InfiniteVaultStrategy(vaults[i]);
            uint256 shares = v.totalSupply() / 100 + 1;
            deal(address(v), USER, shares, true);
            vm.prank(USER);
            v.withdraw(shares);
            assertEq(v.balanceOf(USER), 0);
        }
    }

    function test_DeadGaugeUnstakesAndCompoundsSwapFees() public {
        _upgrade();
        InfiniteVaultStrategy v = InfiniteVaultStrategy(DHT_VAULT);
        assertFalse(v.gaugeAlive());
        uint256 tvl = v.balance();
        assertGt(v.balanceOfPool(), 0);

        vm.warp(block.timestamp + 2 hours);
        v.harvest(RECIPIENT);
        assertEq(v.balanceOfPool(), 0, "LP still in dead gauge");
        assertGe(v.balance(), tvl, "TVL lost on unstake");
        uint256 afterUnstake = v.balance();

        _churnPool(v, 20);
        vm.warp(block.timestamp + 2 hours);
        v.harvest(RECIPIENT);
        console.log("DHT vault LP: unstaked", afterUnstake, "-> after fee compounding", v.balance());
        assertGt(v.balance(), afterUnstake, "swap fees not compounded");
        assertEq(v.balanceOfPool(), 0);
    }

    function test_DeadGaugeDepositStaysUnstaked() public {
        _upgrade();
        InfiniteVaultStrategy v = InfiniteVaultStrategy(DHT_VAULT);
        deal(v.want(), USER, 1e18);
        vm.startPrank(USER);
        IERC20(v.want()).approve(address(v), 1e18);
        v.deposit(1e18);
        assertEq(v.balanceOfPool(), 0);
        v.withdraw(v.balanceOf(USER));
        vm.stopPrank();
        assertGe(IERC20(v.want()).balanceOf(USER), 1e18 * 9989 / 10_000);
    }

    function test_RevivedGaugeRestakes() public {
        _upgrade();
        InfiniteVaultStrategy v = InfiniteVaultStrategy(DHT_VAULT);
        v.harvest(RECIPIENT);
        assertEq(v.balanceOfPool(), 0);

        // Revival as seen by both the vault and the gauge's own deposit check.
        vm.mockCall(VOTER, abi.encodeWithSignature("isAlive(address)", v.gauge()), abi.encode(true));
        assertTrue(v.gaugeAlive());

        v.harvest(RECIPIENT);
        assertEq(v.balanceOfPool(), v.balance(), "LP not re-staked");
    }

    /// Round-trip swaps through the pair to generate swap fees.
    function _churnPool(InfiniteVaultStrategy v, uint256 rounds) internal {
        address t0 = v.lpToken0();
        address t1 = v.lpToken1();
        ISolidlyRouter router = ISolidlyRouter(v.unirouter());
        (uint256 r0,,) = IPair(v.want()).getReserves();
        uint256 amount = r0 / 500;
        deal(t0, USER, amount);
        vm.startPrank(USER);
        IERC20(t0).approve(address(router), type(uint256).max);
        IERC20(t1).approve(address(router), type(uint256).max);
        ISolidlyRouter.Route[] memory fwd = new ISolidlyRouter.Route[](1);
        ISolidlyRouter.Route[] memory back = new ISolidlyRouter.Route[](1);
        fwd[0] = ISolidlyRouter.Route(t0, t1, v.stable(), v.factory());
        back[0] = ISolidlyRouter.Route(t1, t0, v.stable(), v.factory());
        for (uint256 i; i < rounds; ++i) {
            router.swapExactTokensForTokens(IERC20(t0).balanceOf(USER), 0, fwd, USER, block.timestamp);
            router.swapExactTokensForTokens(IERC20(t1).balanceOf(USER), 0, back, USER, block.timestamp);
        }
        vm.stopPrank();
    }

    function test_FirstDepositMintsDeadShares() public {
        _upgrade();
        InfiniteVaultStrategy src = InfiniteVaultStrategy(VELO_VAULT);
        bytes memory init = abi.encodeCall(
            InfiniteVaultStrategy.initialize,
            (
                src.want(),
                src.gauge(),
                src.unirouter(),
                src.infiniteFeeRecipient(),
                "Test",
                "TST",
                _route(src, 0),
                _route(src, 1),
                _route(src, 2)
            )
        );
        InfiniteVaultStrategy v = InfiniteVaultStrategy(address(new BeaconProxy(BEACON, init)));
        assertTrue(v.harvestOnDeposit());

        deal(v.want(), USER, 1e18);
        vm.startPrank(USER);
        IERC20(v.want()).approve(address(v), 1e18);
        v.deposit(1e18);
        vm.stopPrank();
        assertEq(v.balanceOf(v.DEAD()), v.MIN_SHARES());
        assertEq(v.balanceOf(USER), 1e18 - v.MIN_SHARES());
    }

    function test_RollbackToPreviousImplementations() public {
        _upgrade();
        vm.prank(FACTORY_ADMIN);
        IVaultFactory(FACTORY).upgradeBeacon(LIVE_V2);
        assertEq(UpgradeableBeacon(BEACON).implementation(), LIVE_V2);
        vm.prank(FACTORY_ADMIN);
        IVaultFactory(FACTORY).upgradeBeacon(OLD_IMPL);
        assertEq(UpgradeableBeacon(BEACON).implementation(), OLD_IMPL);
        assertFalse(InfiniteVaultStrategy(WSTETH_VAULT).harvestOnDeposit());
    }

    function _route(InfiniteVaultStrategy v, uint256 which) internal view returns (ISolidlyRouter.Route[] memory r) {
        ISolidlyRouter.Route[] memory tmp = new ISolidlyRouter.Route[](4);
        uint256 n;
        for (; n < 4; ++n) {
            try this.routeAt(v, which, n) returns (ISolidlyRouter.Route memory x) {
                tmp[n] = x;
            } catch {
                break;
            }
        }
        r = new ISolidlyRouter.Route[](n);
        for (uint256 i; i < n; ++i) r[i] = tmp[i];
    }

    function routeAt(InfiniteVaultStrategy v, uint256 which, uint256 i)
        external
        view
        returns (ISolidlyRouter.Route memory x)
    {
        if (which == 0) (x.from, x.to, x.stable, x.factory) = v.outputToNativeRoute(i);
        else if (which == 1) (x.from, x.to, x.stable, x.factory) = v.outputToLp0Route(i);
        else (x.from, x.to, x.stable, x.factory) = v.outputToLp1Route(i);
    }
}

interface IPair {
    function getReserves() external view returns (uint256, uint256, uint256);
}

interface IVoter {
    function emergencyCouncil() external view returns (address);
    function reviveGauge(address gauge) external;
}
