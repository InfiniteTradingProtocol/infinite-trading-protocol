// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AeroChains } from "../../src/aero/AeroChains.sol";
import { AeroFactory } from "../../src/aero/AeroFactory.sol";
import { AeroVault } from "../../src/aero/AeroVault.sol";
import { IAeroPool } from "../../src/aero/IAero.sol";

interface IBaseGaugeFactory {
    function computeGaugeAddress(address pool) external view returns (address);
    function isGauge(address gauge) external view returns (bool);
}

/// @notice Read-only remote state; deals and every transaction execute only in Foundry's local fork.
contract AeroBaseForkTest is Test {
    address constant POOL = 0x800EB395B577B234C5065c8E0cCb0F3A1401B2c2;
    address constant GAUGE_FACTORY = 0x9FBCf2Df0DC553ce40Ef63963Bff465b76792B7E;
    address constant ALICE = address(0xa11ce);
    address constant KEEPER = address(0xcafe);
    address constant TREASURY = address(0xfee);
    AeroFactory factory;

    function setUp() public {
        if (!vm.envOr("AERO_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("AERO_FORK_RPC_URL", string("https://base-rpc.publicnode.com")));
        address[] memory keepers = new address[](1);
        keepers[0] = KEEPER;
        (address stableGauge, address volatileGauge) = AeroChains.gaugeFactories(8453);
        factory = new AeroFactory(
            address(this),
            TREASURY,
            AeroChains.STABLE_FACTORY,
            AeroChains.VOLATILE_FACTORY,
            stableGauge,
            volatileGauge,
            AeroChains.LEAF_VOTER,
            AeroChains.rewardToken(8453),
            AeroChains.ROOT_HANDLER,
            keepers
        );
    }

    function _vault(address targetPool, address gauge) private returns (AeroVault vault) {
        vault = AeroVault(
            factory.createVault(
                AeroVault.Config(
                    targetPool,
                    gauge,
                    AeroChains.rewardToken(8453),
                    address(this),
                    address(0x57),
                    1000,
                    200,
                    0,
                    0,
                    "Fork classic vault",
                    "faLP"
                )
            )
        );
        deal(targetPool, ALICE, 1 ether);
        vm.startPrank(ALICE);
        IERC20(targetPool).approve(address(vault), 1 ether);
        vault.deposit(1 ether, 1, [uint256(0), uint256(0), uint256(0)]);
        vm.stopPrank();
    }

    function test_BaseUnstakedDepositAndRedeem() public {
        AeroVault vault = _vault(POOL, address(0));
        uint256 shares = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        vault.redeem(shares, 1 ether - 1000, [uint256(0), uint256(0), uint256(0)]);
        assertEq(IERC20(POOL).balanceOf(ALICE), 1 ether - 1000);
    }

    function test_BaseActualPoolMintCompoundsBothTokens() public {
        AeroVault vault = _vault(POOL, address(0));
        address token0 = IAeroPool(POOL).token0();
        address token1 = IAeroPool(POOL).token1();
        (uint256 r0, uint256 r1,) = IAeroPool(POOL).getReserves();
        uint256 reward0 = r0 / 10_000;
        uint256 reward1 = r1 / 10_000;
        deal(token0, address(vault), reward0);
        deal(token1, address(vault), reward1);
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](0);
        uint256 beforeLp = vault.totalAssets();
        vm.prank(KEEPER);
        uint256 compounded = vault.harvest(swaps, 1, block.timestamp + 60);
        assertGt(compounded, 0);
        assertEq(vault.totalAssets(), beforeLp + compounded);
        assertEq(IERC20(token0).balanceOf(TREASURY), reward0 * 200 / 10_000);
        assertEq(IERC20(token1).balanceOf(TREASURY), reward1 * 200 / 10_000);
    }

    function test_BaseActualGaugeStakeClaimAndRedeem() public {
        address gauge = IBaseGaugeFactory(GAUGE_FACTORY).computeGaugeAddress(POOL);
        assertTrue(IBaseGaugeFactory(GAUGE_FACTORY).isGauge(gauge), "Expected registered Aero gauge");
        AeroVault vault = _vault(POOL, gauge);
        assertEq(IERC20(POOL).balanceOf(gauge) >= 1 ether, true);
        vault.estimateKeeperReward();
        uint256 shares = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        vault.redeem(shares, 1 ether - 1000, [uint256(0), uint256(0), uint256(0)]);
        assertEq(IERC20(POOL).balanceOf(ALICE), 1 ether - 1000);
    }

    function test_BaseActualStablePoolMintAndRedeem() public {
        address stablePool = 0x67c8Cb3E74dda2C58c9501E49AC9523E258c24fe;
        AeroVault vault = _vault(stablePool, address(0));
        address token0 = IAeroPool(stablePool).token0();
        address token1 = IAeroPool(stablePool).token1();
        (uint256 r0, uint256 r1,) = IAeroPool(stablePool).getReserves();
        deal(token0, address(vault), r0 / 10_000);
        deal(token1, address(vault), r1 / 10_000);
        AeroVault.Swap[] memory swaps = new AeroVault.Swap[](0);
        vm.prank(KEEPER);
        assertGt(vault.harvest(swaps, 1, block.timestamp + 60), 0);
        uint256 shares = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        vault.redeem(shares, 1 ether - 1000, [uint256(0), uint256(0), uint256(0)]);
        assertGt(IERC20(stablePool).balanceOf(ALICE), 1 ether - 1000);
    }
}
