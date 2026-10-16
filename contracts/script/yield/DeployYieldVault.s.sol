// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/src/Script.sol";

import {InfiniteTradingRegistry} from "../../src/yield/InfiniteTradingRegistry.sol";
import {InfiniteYieldAllocatorFactory} from "../../src/yield/InfiniteYieldAllocatorFactory.sol";
import {InfiniteYieldBootstrapper} from "../../src/yield/InfiniteYieldBootstrapper.sol";
import {CompoundV3AdapterFactory} from "../../src/yield/adapters/CompoundV3AdapterFactory.sol";
import {AaveV3RateReader} from "../../src/yield/readers/AaveV3RateReader.sol";
import {CompoundV3RateReader} from "../../src/yield/readers/CompoundV3RateReader.sol";
import {FluidRateReader} from "../../src/yield/readers/FluidRateReader.sol";
import {MetaMorphoRateReader} from "../../src/yield/readers/MetaMorphoRateReader.sol";

interface IERC20Approve {
    function approve(address, uint256) external returns (bool);
}

/// @notice CLI equivalent of the dashboard deploy wizard (USD Yield vault on Base), same contracts and defaults.
/// The dashboard wizard is the primary path; this is for Anvil forks and as a fallback:
///   FOUNDRY_PROFILE=yield forge script script/yield/DeployYieldVault.s.sol --rpc-url <base> --account <keystore> --broadcast
/// The broadcaster must be an EOA holding SEED_USDC (default 1 USDC).
contract DeployYieldVault is Script {
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant SAFE = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;
    address constant VAULT_FACTORY = 0x4501125508079A99ebBebCE205DeC9593C2b5857;
    address constant MVA_FACTORY = 0xF42D9c36b34c9c2CF3Bc30eD2a52a90eEB604642;
    address constant AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant FLUID_RESOLVER = 0x48D32f49aFeAEC7AE66ad7B9264f446fc11a1569;
    address constant KEEPER1 = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
    address constant KEEPER2 = 0x233EC2735d58698eFC4d5f24A521AA251252f0C0;

    function run() external returns (InfiniteYieldBootstrapper.Deployment memory d) {
        string memory salt = vm.envOr("SALT", string("itp-usd-yield"));
        uint256 seed = vm.envOr("SEED_USDC", uint256(1e6));

        vm.startBroadcast();
        address impl = address(new InfiniteTradingRegistry(3 days));
        address compFactory = address(new CompoundV3AdapterFactory());
        address allocFactory = address(new InfiniteYieldAllocatorFactory());
        address aave = address(new AaveV3RateReader(AAVE_POOL));
        address comet = address(new CompoundV3RateReader());
        address fluid = address(new FluidRateReader(FLUID_RESOLVER));
        address mm = address(new MetaMorphoRateReader());
        InfiniteYieldBootstrapper boot = new InfiniteYieldBootstrapper();

        InfiniteYieldBootstrapper.Config memory c;
        c.asset = USDC;
        c.vaultFactory = VAULT_FACTORY;
        c.morphoVaultV1AdapterFactory = MVA_FACTORY;
        c.compoundV3AdapterFactory = compFactory;
        c.allocatorFactory = allocFactory;
        c.registryImplementation = impl;
        c.safe = SAFE;
        c.salt = keccak256(bytes(salt));
        c.name = "Infinite Trading USD Yield";
        c.symbol = "itUSDY";
        c.executors = new address[](2);
        c.executors[0] = KEEPER1;
        c.executors[1] = KEEPER2;
        c.sentinels = new address[](2);
        c.sentinels[0] = SAFE;
        c.sentinels[1] = KEEPER1;
        c.integrations = new InfiniteYieldBootstrapper.IntegrationConfig[](6);
        c.integrations[0] = _ic(false, 0xC768c589647798a6EE01A91FdE98EF2ed046DBD6, aave, "Aave v3");
        c.integrations[1] = _ic(true, 0xb125E6687d4313864e53df431d5425969c15Eb2F, comet, "Compound v3");
        c.integrations[2] = _ic(false, 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169, fluid, "Fluid");
        c.integrations[3] = _ic(false, 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61, mm, "Gauntlet USDC Prime");
        c.integrations[4] = _ic(false, 0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A, mm, "Spark USDC");
        c.integrations[5] = _ic(false, 0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2, mm, "Steakhouse Prime USDC");
        c.performanceFee = 0.1e18;
        c.minApyDelta = 0.007e18;
        c.cooldown = 1 hours;
        c.timelock = 3 days;
        c.maxRate = uint256(0.5e18) / 365 days;
        c.seedAssets = seed;
        c.seedReceiver = SAFE;

        boot.deployVault(c);
        IERC20Approve(USDC).approve(address(boot), seed);
        d = boot.finalize(c);
        vm.stopBroadcast();

        console2.log("vault                 ", d.vault);
        console2.log("registry              ", d.registry);
        console2.log("allocator             ", d.allocator);
        console2.log("initialAdapter        ", d.initialAdapter);
        console2.log("bootstrapper          ", address(boot));
        console2.log("registryImplementation", impl);
    }

    function _ic(bool isComet, address target, address reader, string memory name)
        internal
        pure
        returns (InfiniteYieldBootstrapper.IntegrationConfig memory)
    {
        return InfiniteYieldBootstrapper.IntegrationConfig({
            kind: isComet ? InfiniteYieldBootstrapper.Kind.COMPOUND_V3 : InfiniteYieldBootstrapper.Kind.ERC4626,
            target: target,
            rateReader: reader,
            name: name
        });
    }
}
