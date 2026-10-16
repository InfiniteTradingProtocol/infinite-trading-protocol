// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/src/Test.sol";

import {VaultV2Factory} from "morpho-vault-v2/VaultV2Factory.sol";
import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";
import {MorphoVaultV1AdapterFactory} from "morpho-vault-v2/adapters/MorphoVaultV1AdapterFactory.sol";
import {MAX_MAX_RATE} from "morpho-vault-v2/libraries/ConstantsLib.sol";

import {InfiniteTradingRegistry} from "../../src/yield/InfiniteTradingRegistry.sol";
import {InfiniteYieldAllocator} from "../../src/yield/InfiniteYieldAllocator.sol";
import {InfiniteYieldAllocatorFactory} from "../../src/yield/InfiniteYieldAllocatorFactory.sol";
import {InfiniteYieldBootstrapper} from "../../src/yield/InfiniteYieldBootstrapper.sol";
import {CompoundV3AdapterFactory} from "../../src/yield/adapters/CompoundV3AdapterFactory.sol";

import {MockUSDC, MockLendingVault, MockComet, MockRateReader} from "./mocks/YieldMocks.sol";

/// @dev Deploys the full stack locally (real Morpho VaultV2 + adapter factory, mock lending markets) through the
/// same bootstrapper used in production.
abstract contract YieldBase is Test {
    uint256 internal constant TIMELOCK = 3 days;
    uint256 internal constant DELTA = 0.007e18;
    uint256 internal constant COOLDOWN = 1 hours;
    uint256 internal constant SEED = 1e6; // 1 USDC

    address internal safe = makeAddr("safe");
    address internal keeper1 = makeAddr("keeper1");
    address internal keeper2 = makeAddr("keeper2");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");
    address internal deployerEOA = makeAddr("deployer");

    MockUSDC internal usdc;
    MockLendingVault internal aave; // index 0
    MockLendingVault internal fluid; // index 1
    MockLendingVault internal morphoA; // index 2
    MockComet internal comet; // index 3
    MockRateReader internal reader;

    VaultV2Factory internal vaultFactory;
    MorphoVaultV1AdapterFactory internal mvaFactory;
    CompoundV3AdapterFactory internal compFactory;
    InfiniteYieldAllocatorFactory internal allocFactory;
    InfiniteTradingRegistry internal registryImpl;
    InfiniteYieldBootstrapper internal boot;

    IVaultV2 internal vault;
    InfiniteTradingRegistry internal registry;
    InfiniteYieldAllocator internal allocator;
    address[] internal adapters;
    address[] internal targets;

    function setUp() public virtual {
        vm.warp(1_750_000_000);
        usdc = new MockUSDC();
        aave = new MockLendingVault(usdc, "stataUSDC");
        fluid = new MockLendingVault(usdc, "fUSDC");
        morphoA = new MockLendingVault(usdc, "mUSDC");
        comet = new MockComet(address(usdc));
        reader = new MockRateReader();
        targets = [address(aave), address(fluid), address(morphoA), address(comet)];
        reader.setRate(address(aave), 0.038e18);
        reader.setRate(address(fluid), 0.059e18);
        reader.setRate(address(morphoA), 0.050e18);
        reader.setRate(address(comet), 0.061e18);

        vaultFactory = new VaultV2Factory();
        mvaFactory = new MorphoVaultV1AdapterFactory();
        compFactory = new CompoundV3AdapterFactory();
        allocFactory = new InfiniteYieldAllocatorFactory();
        registryImpl = new InfiniteTradingRegistry(TIMELOCK);

        vm.prank(deployerEOA);
        boot = new InfiniteYieldBootstrapper();

        usdc.mint(deployerEOA, SEED);
        vm.prank(deployerEOA);
        usdc.approve(address(boot), SEED);

        vm.startPrank(deployerEOA);
        boot.deployVault(_config());
        InfiniteYieldBootstrapper.Deployment memory d = boot.finalize(_config());
        vm.stopPrank();
        vault = IVaultV2(d.vault);
        registry = InfiniteTradingRegistry(d.registry);
        allocator = InfiniteYieldAllocator(d.allocator);
        adapters = d.adapters;

        for (uint256 i; i < 4; i++) {
            vm.label(adapters[i], string.concat("adapter", vm.toString(i)));
        }
        vm.label(address(vault), "vault");
    }

    function _config() internal view returns (InfiniteYieldBootstrapper.Config memory c) {
        c.asset = address(usdc);
        c.vaultFactory = address(vaultFactory);
        c.morphoVaultV1AdapterFactory = address(mvaFactory);
        c.compoundV3AdapterFactory = address(compFactory);
        c.allocatorFactory = address(allocFactory);
        c.registryImplementation = address(registryImpl);
        c.safe = safe;
        c.salt = bytes32(0);
        c.name = "Infinite Trading USD Yield";
        c.symbol = "itUSDY";
        c.executors = new address[](2);
        c.executors[0] = keeper1;
        c.executors[1] = keeper2;
        c.sentinels = new address[](2);
        c.sentinels[0] = safe;
        c.sentinels[1] = keeper1;
        c.integrations = new InfiniteYieldBootstrapper.IntegrationConfig[](4);
        c.integrations[0] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, address(aave), "Aave v3");
        c.integrations[1] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, address(fluid), "Fluid");
        c.integrations[2] = _ic(InfiniteYieldBootstrapper.Kind.ERC4626, address(morphoA), "Morpho A");
        c.integrations[3] = _ic(InfiniteYieldBootstrapper.Kind.COMPOUND_V3, address(comet), "Compound v3");
        c.performanceFee = 0.1e18;
        c.minApyDelta = DELTA;
        c.cooldown = COOLDOWN;
        c.timelock = TIMELOCK;
        c.maxRate = MAX_MAX_RATE;
        c.seedAssets = SEED;
        c.seedReceiver = safe;
    }

    function _ic(InfiniteYieldBootstrapper.Kind kind, address target, string memory name)
        internal
        view
        returns (InfiniteYieldBootstrapper.IntegrationConfig memory)
    {
        return InfiniteYieldBootstrapper.IntegrationConfig({
            kind: kind, target: target, rateReader: address(reader), name: name
        });
    }

    function _deposit(address user, uint256 assets) internal returns (uint256 shares) {
        usdc.mint(user, assets);
        vm.startPrank(user);
        usdc.approve(address(vault), assets);
        shares = vault.deposit(assets, user);
        vm.stopPrank();
    }

    function _rebalance(address to) internal {
        vm.prank(keeper1);
        allocator.requireRebalance(to);
    }

    function _realAssets(uint256 i) internal view returns (uint256) {
        return IAdapterView(adapters[i]).realAssets();
    }

    function _sumReal() internal view returns (uint256 s) {
        for (uint256 i; i < adapters.length; i++) {
            s += _realAssets(i);
        }
        s += usdc.balanceOf(address(vault));
    }
}

interface IAdapterView {
    function realAssets() external view returns (uint256);
}
