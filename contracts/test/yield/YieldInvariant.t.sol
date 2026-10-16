// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/src/Test.sol";
import {IVaultV2} from "morpho-vault-v2/interfaces/IVaultV2.sol";

import {InfiniteYieldAllocator} from "../../src/yield/InfiniteYieldAllocator.sol";
import {YieldBase} from "./YieldBase.sol";
import {MockUSDC, MockLendingVault, MockComet, MockRateReader} from "./mocks/YieldMocks.sol";

contract YieldHandler is Test {
    IVaultV2 internal vault;
    InfiniteYieldAllocator internal allocator;
    MockUSDC internal usdc;
    MockRateReader internal reader;
    MockComet internal comet;
    address[] internal adapters;
    address[] internal targets;
    address internal keeper;
    address[] internal users;

    uint256 public lastRebalanceSeen;
    uint256 public cooldownViolations;
    uint256 public rebalances;
    uint256 public redeemFailures;

    constructor(
        IVaultV2 _vault,
        InfiniteYieldAllocator _allocator,
        MockUSDC _usdc,
        MockRateReader _reader,
        MockComet _comet,
        address[] memory _adapters,
        address[] memory _targets,
        address _keeper
    ) {
        vault = _vault;
        allocator = _allocator;
        usdc = _usdc;
        reader = _reader;
        comet = _comet;
        adapters = _adapters;
        targets = _targets;
        keeper = _keeper;
        users.push(makeAddr("u1"));
        users.push(makeAddr("u2"));
        users.push(makeAddr("u3"));
    }

    function deposit(uint256 u, uint256 amount) external {
        address user = users[u % users.length];
        amount = bound(amount, 1e6, 1e12);
        usdc.mint(user, amount);
        vm.startPrank(user);
        usdc.approve(address(vault), amount);
        vault.deposit(amount, user);
        vm.stopPrank();
    }

    function redeem(uint256 u, uint256 fraction) external {
        address user = users[u % users.length];
        uint256 shares = vault.balanceOf(user) * bound(fraction, 1, 100) / 100;
        if (shares == 0) return;
        uint256 expected = vault.previewRedeem(shares);
        vm.prank(user);
        try vault.redeem(shares, user, user) returns (uint256 out) {
            assertEq(out, expected);
        } catch {
            redeemFailures++;
        }
    }

    function setRate(uint256 t, uint256 apr) external {
        reader.setRate(targets[t % targets.length], bound(apr, 0, 0.3e18));
    }

    function warp(uint256 dt) external {
        vm.warp(block.timestamp + bound(dt, 1, 2 hours));
    }

    function accrue(uint256 amount) external {
        amount = bound(amount, 0, 1e9);
        address cur = vault.liquidityAdapter();
        if (cur == address(0) || amount == 0) return;
        uint256 real = IAdapterLike(cur).realAssets();
        if (real == 0) return;
        if (cur == adapters[3]) comet.accrue(cur, amount);
        else MockLendingVault(_target(cur)).accrue(amount);
    }

    function keeperTick() external {
        (bool ready,, address to,,,) = allocator.bestRebalance();
        if (!ready) return;
        uint256 prev = allocator.lastRebalance();
        vm.prank(keeper);
        allocator.requireRebalance(to);
        if (prev != 0 && block.timestamp < prev + allocator.cooldown()) cooldownViolations++;
        rebalances++;
    }

    function griefForceDeallocate(uint256 amount) external {
        address cur = vault.liquidityAdapter();
        uint256 real = IAdapterLike(cur).realAssets();
        if (real == 0) return;
        amount = bound(amount, 1, real);
        vault.forceDeallocate(cur, "", amount, address(this));
        vm.prank(keeper);
        allocator.allocateIdle();
    }

    function _target(address adapter) internal view returns (address) {
        for (uint256 i; i < adapters.length; i++) {
            if (adapters[i] == adapter) return targets[i];
        }
        revert("unknown");
    }

    function usersList() external view returns (address[] memory) {
        return users;
    }
}

interface IAdapterLike {
    function realAssets() external view returns (uint256);
}

contract YieldInvariantTest is YieldBase {
    YieldHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new YieldHandler(vault, allocator, usdc, reader, comet, adapters, targets, keeper1);
        targetContract(address(handler));
    }

    /// @dev Vault accounting never exceeds what it really holds (beyond rounding).
    function invariant_solvent() public view {
        assertLe(vault.totalAssets(), _sumReal() + 4 * adapters.length);
    }

    /// @dev The whole position sits in the liquidity adapter; other adapters hold only rounding dust.
    function invariant_singlePosition() public view {
        address cur = vault.liquidityAdapter();
        for (uint256 i; i < adapters.length; i++) {
            if (adapters[i] == cur) continue;
            assertLe(_realAssets(i), 2);
        }
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function invariant_noStrayFunds() public view {
        assertEq(usdc.balanceOf(address(allocator)), 0);
        assertEq(usdc.balanceOf(address(registry)), 0);
        assertEq(usdc.balanceOf(address(boot)), 0);
    }

    function invariant_cooldownRespected() public view {
        assertEq(handler.cooldownViolations(), 0);
    }

    function invariant_redeemsNeverFail() public view {
        assertEq(handler.redeemFailures(), 0);
    }

    function invariant_rolesUnchanged() public view {
        assertEq(vault.owner(), safe);
        assertEq(vault.curator(), safe);
        assertTrue(vault.isAllocator(address(allocator)));
        assertEq(registry.owner(), safe);
    }
}
