// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/src/Test.sol";

import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {MAX_MAX_RATE} from "morpho-vault-v2/libraries/ConstantsLib.sol";

import {InfiniteTradingRegistry} from "../../src/yield/InfiniteTradingRegistry.sol";
import {InfiniteYieldAllocator} from "../../src/yield/InfiniteYieldAllocator.sol";
import {InfiniteYieldAllocatorFactory} from "../../src/yield/InfiniteYieldAllocatorFactory.sol";
import {InfiniteYieldBootstrapper} from "../../src/yield/InfiniteYieldBootstrapper.sol";
import {CompoundV3AdapterFactory} from "../../src/yield/adapters/CompoundV3AdapterFactory.sol";
import {AaveV3RateReader} from "../../src/yield/readers/AaveV3RateReader.sol";
import {CompoundV3RateReader} from "../../src/yield/readers/CompoundV3RateReader.sol";
import {FluidRateReader} from "../../src/yield/readers/FluidRateReader.sol";
import {MetaMorphoRateReader} from "../../src/yield/readers/MetaMorphoRateReader.sol";

interface IERC20Like {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

interface IAdapterView {
    function realAssets() external view returns (uint256);
}

/// @dev Full production flow against real Base protocols. Runs only when BASE_RPC_URL is set:
///   BASE_RPC_URL=https://base-rpc.publicnode.com FOUNDRY_PROFILE=yield forge test --mc YieldForkTest -vv
contract YieldForkTest is Test {
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant SAFE = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant VAULT_FACTORY = 0x4501125508079A99ebBebCE205DeC9593C2b5857;
    address constant MVA_FACTORY = 0xF42D9c36b34c9c2CF3Bc30eD2a52a90eEB604642;
    address constant AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant FLUID_RESOLVER = 0x48D32f49aFeAEC7AE66ad7B9264f446fc11a1569;
    address constant KEEPER1 = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
    address constant KEEPER2 = 0x233EC2735d58698eFC4d5f24A521AA251252f0C0;

    address constant STATA = 0xC768c589647798a6EE01A91FdE98EF2ed046DBD6;
    address constant COMET = 0xb125E6687d4313864e53df431d5425969c15Eb2F;
    address constant FUSDC = 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169;
    address constant GAUNTLET = 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61;
    address constant SPARK = 0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A;
    address constant STEAKHOUSE = 0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2;

    bool internal enabled;
    address internal deployer = makeAddr("deployer");
    address internal alice = makeAddr("alice");

    AaveV3RateReader aaveReader;
    CompoundV3RateReader cometReader;
    FluidRateReader fluidReader;
    MetaMorphoRateReader mmReader;

    IVaultV2 vault;
    InfiniteTradingRegistry registry;
    InfiniteYieldAllocator allocator;
    address[] adapters;

    function setUp() public {
        string memory rpc = vm.envOr("BASE_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        uint256 forkBlock = vm.envOr("BASE_FORK_BLOCK", uint256(0));
        if (forkBlock == 0) vm.createSelectFork(rpc);
        else vm.createSelectFork(rpc, forkBlock);
        enabled = true;

        aaveReader = new AaveV3RateReader(AAVE_POOL);
        cometReader = new CompoundV3RateReader();
        fluidReader = new FluidRateReader(FLUID_RESOLVER);
        mmReader = new MetaMorphoRateReader();
    }

    modifier onlyFork() {
        if (!enabled) {
            vm.skip(true);
            return;
        }
        _;
    }

    function test_fork_readersReturnSaneRates() public onlyFork {
        uint256[6] memory r = [
            aaveReader.supplyRate(STATA),
            cometReader.supplyRate(COMET),
            fluidReader.supplyRate(FUSDC),
            mmReader.supplyRate(GAUNTLET),
            mmReader.supplyRate(SPARK),
            mmReader.supplyRate(STEAKHOUSE)
        ];
        string[6] memory n = ["aave", "comet", "fluid", "gauntlet", "spark", "steakhouse"];
        for (uint256 i; i < 6; i++) {
            console2.log(n[i], r[i]);
            assertGt(r[i], 0.001e18, n[i]);
            assertLt(r[i], 0.25e18, n[i]);
        }
    }

    function test_fork_fullLifecycle() public onlyFork {
        _bootstrap();

        assertEq(vault.owner(), SAFE);
        assertEq(vault.curator(), SAFE);
        assertTrue(vault.isAllocator(address(allocator)));
        assertEq(registry.owner(), SAFE);
        assertEq(adapters.length, 6);

        (address[] memory a, uint256[] memory aprs, bool[] memory ok,) = registry.getApys(address(vault));
        for (uint256 i; i < a.length; i++) {
            assertTrue(ok[i]);
            console2.log(registry.integration(a[i]).name, aprs[i]);
        }

        uint256 amount = 100_000e6;
        deal(USDC, alice, amount);
        vm.startPrank(alice);
        IERC20Like(USDC).approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, alice);
        vm.stopPrank();

        address start = vault.liquidityAdapter();
        assertApproxEqAbs(IAdapterView(start).realAssets(), amount + 1e6, 10);

        // Visit every real protocol (DAO path skips APY gating), checking the whole position follows.
        for (uint256 i; i < adapters.length; i++) {
            address prev = vault.liquidityAdapter();
            if (adapters[i] == prev) continue;
            uint256 before = vault.totalAssets();
            vm.prank(SAFE);
            allocator.daoRebalance(prev, adapters[i]);
            assertEq(vault.liquidityAdapter(), adapters[i]);
            assertLe(IAdapterView(prev).realAssets(), 2, "dust left behind");
            assertApproxEqAbs(vault.totalAssets(), before, 10, "value lost on move");
            assertEq(IERC20Like(USDC).balanceOf(address(vault)), 0);
        }

        // Keeper path: send it to the best integration via bestRebalance/requireRebalance.
        vm.warp(block.timestamp + 1 hours);
        (bool ready, address from, address to, uint256 fromApr, uint256 toApr,) = allocator.bestRebalance();
        console2.log("keeper ready", ready);
        if (ready) {
            assertGe(toApr, fromApr + allocator.minApyDelta());
            vm.prank(KEEPER1);
            allocator.requireRebalance(to);
            assertEq(vault.liquidityAdapter(), to);
            assertLe(IAdapterView(from).realAssets(), 2);
        }

        // Interest accrues and alice gets at least her deposit back (minus rounding on 6+ hops).
        vm.warp(block.timestamp + 7 days);
        vm.roll(block.number + 302_400);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        console2.log("deposited", amount, "redeemed", out);
        assertGe(out + 20, amount);
    }

    function test_fork_keeperCannotMoveToWorseRate() public onlyFork {
        _bootstrap();
        address cur = vault.liquidityAdapter();
        (address[] memory a, uint256[] memory aprs,,) = registry.getApys(address(vault));
        uint256 curApr = registry.getApy(cur);
        for (uint256 i; i < a.length; i++) {
            if (a[i] == cur || aprs[i] >= curApr + allocator.minApyDelta()) continue;
            vm.prank(KEEPER1);
            vm.expectRevert();
            allocator.requireRebalance(a[i]);
        }
    }

    function _bootstrap() internal {
        InfiniteTradingRegistry impl = new InfiniteTradingRegistry(3 days);
        CompoundV3AdapterFactory compFactory = new CompoundV3AdapterFactory();
        InfiniteYieldAllocatorFactory allocFactory = new InfiniteYieldAllocatorFactory();
        vm.prank(deployer);
        InfiniteYieldBootstrapper boot = new InfiniteYieldBootstrapper();

        InfiniteYieldBootstrapper.Config memory c;
        c.asset = USDC;
        c.vaultFactory = VAULT_FACTORY;
        c.morphoVaultV1AdapterFactory = MVA_FACTORY;
        c.compoundV3AdapterFactory = address(compFactory);
        c.allocatorFactory = address(allocFactory);
        c.registryImplementation = address(impl);
        c.safe = SAFE;
        c.salt = keccak256("fork-test");
        c.name = "Infinite Trading USD Yield";
        c.symbol = "itUSDY";
        c.executors = new address[](2);
        c.executors[0] = KEEPER1;
        c.executors[1] = KEEPER2;
        c.sentinels = new address[](2);
        c.sentinels[0] = SAFE;
        c.sentinels[1] = KEEPER1;
        c.integrations = new InfiniteYieldBootstrapper.IntegrationConfig[](6);
        c.integrations[0] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, STATA, address(aaveReader), "Aave v3");
        c.integrations[1] = _ic(InfiniteYieldBootstrapper.Kind.COMPOUND_V3, COMET, address(cometReader), "Compound v3");
        c.integrations[2] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, FUSDC, address(fluidReader), "Fluid");
        c.integrations[3] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, GAUNTLET, address(mmReader), "Gauntlet USDC Prime");
        c.integrations[4] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, SPARK, address(mmReader), "Spark USDC");
        c.integrations[5] =
            _ic(InfiniteYieldBootstrapper.Kind.ERC4626, STEAKHOUSE, address(mmReader), "Steakhouse Prime USDC");
        c.performanceFee = 0.1e18;
        c.minApyDelta = 0.007e18;
        c.cooldown = 1 hours;
        c.timelock = 3 days;
        c.maxRate = MAX_MAX_RATE;
        c.seedAssets = 1e6;
        c.seedReceiver = SAFE;

        deal(USDC, deployer, c.seedAssets);
        vm.startPrank(deployer);
        IERC20Like(USDC).approve(address(boot), c.seedAssets);
        uint256 g = gasleft();
        boot.deployVault(c);
        uint256 g1 = g - gasleft();
        g = gasleft();
        InfiniteYieldBootstrapper.Deployment memory d = boot.finalize(c);
        uint256 g2 = g - gasleft();
        console2.log("deployVault gas", g1);
        console2.log("finalize gas", g2);
        assertLt(g1, 15_000_000, "deployVault over EIP-7825 margin");
        assertLt(g2, 15_000_000, "finalize over EIP-7825 margin");
        vm.stopPrank();

        vault = IVaultV2(d.vault);
        registry = InfiniteTradingRegistry(d.registry);
        allocator = InfiniteYieldAllocator(d.allocator);
        adapters = d.adapters;
    }

    function _ic(InfiniteYieldBootstrapper.Kind kind, address target, address reader, string memory name)
        internal
        pure
        returns (InfiniteYieldBootstrapper.IntegrationConfig memory)
    {
        return InfiniteYieldBootstrapper.IntegrationConfig({kind: kind, target: target, rateReader: reader, name: name});
    }
}
