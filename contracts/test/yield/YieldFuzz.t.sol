// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InfiniteYieldAllocator} from "../../src/yield/InfiniteYieldAllocator.sol";
import {YieldBase} from "./YieldBase.sol";

contract YieldFuzzTest is YieldBase {
    function testFuzz_thresholdRule(uint256 fromApr, uint256 toApr) public {
        fromApr = bound(fromApr, 0, 0.5e18);
        toApr = bound(toApr, 0, 0.5e18);
        _deposit(alice, 1_000e6);
        reader.setRate(address(comet), fromApr); // current
        reader.setRate(address(morphoA), toApr);
        vm.prank(keeper1);
        if (toApr >= fromApr + DELTA) {
            allocator.requireRebalance(adapters[2]);
            assertEq(vault.liquidityAdapter(), adapters[2]);
        } else {
            vm.expectRevert(
                abi.encodeWithSelector(
                    InfiniteYieldAllocator.InsufficientApyGain.selector, fromApr, toApr, fromApr + DELTA
                )
            );
            allocator.requireRebalance(adapters[2]);
        }
    }

    function testFuzz_cooldownRule(uint256 elapsed) public {
        elapsed = bound(elapsed, 0, 3 hours);
        reader.setRate(address(morphoA), 0.1e18);
        _rebalance(adapters[2]);
        reader.setRate(address(fluid), 0.2e18);
        vm.warp(block.timestamp + elapsed);
        vm.prank(keeper1);
        if (elapsed >= COOLDOWN) {
            allocator.requireRebalance(adapters[1]);
        } else {
            vm.expectRevert();
            allocator.requireRebalance(adapters[1]);
        }
    }

    /// @dev Deposit, any sequence of rebalances, then full exit: user never loses more than rounding.
    function testFuzz_noLossAcrossRebalances(uint256 amount, uint8 path, uint256 gain) public {
        amount = bound(amount, 1e6, 1e13); // 1 USDC .. 10M USDC
        gain = bound(gain, 0, amount / 50);
        uint256 shares = _deposit(alice, amount);
        address[4] memory route = [adapters[2], adapters[1], adapters[0], adapters[3]];
        uint256 t = block.timestamp; // via-IR caches block.timestamp; track time explicitly
        for (uint256 i; i < 4; i++) {
            if ((path >> i) & 1 == 0) continue;
            address to = route[i];
            if (to == vault.liquidityAdapter()) continue;
            reader.setRate(_targetOf(to), 0.3e18 + i * 0.01e18);
            t += COOLDOWN;
            vm.warp(t);
            _rebalance(to);
        }
        if (gain > 0) _accrueCurrent(gain);
        vm.warp(t + 1 days);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        assertGe(out + 2, amount);
        assertEq(vault.balanceOf(alice), 0);
    }

    function testFuzz_nonExecutorAlwaysRejected(address caller) public {
        vm.assume(!registry.isExecutor(caller));
        reader.setRate(address(morphoA), 0.3e18);
        vm.prank(caller);
        vm.expectRevert(InfiniteYieldAllocator.NotExecutor.selector);
        allocator.requireRebalance(adapters[2]);
    }

    function _targetOf(address adapter) internal view returns (address) {
        return registry.integration(adapter).target;
    }

    function _accrueCurrent(uint256 amount) internal {
        address cur = vault.liquidityAdapter();
        if (cur == adapters[3]) comet.accrue(cur, amount);
        else if (cur == adapters[0]) aave.accrue(amount);
        else if (cur == adapters[1]) fluid.accrue(amount);
        else morphoA.accrue(amount);
    }
}
