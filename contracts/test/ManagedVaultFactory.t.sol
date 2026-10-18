// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IBeacon } from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

import { ManagedVault } from "../src/ManagedVault.sol";
import { ManagedVaultFactory } from "../src/ManagedVaultFactory.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockRouter {
    event Swap(address tokenIn, address tokenOut, uint256 amount, address recipient);

    function swap(address tokenIn, address tokenOut, uint256 amount, address recipient) external returns (uint256) {
        emit Swap(tokenIn, tokenOut, amount, recipient);
        IERC20(tokenIn).transfer(recipient, amount);
        return amount;
    }
}

contract MockBeacon is IBeacon {
    address public immutable implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }
}

contract ManagedVaultFactoryTest is Test {
    ManagedVault internal impl;
    ManagedVaultFactory internal factory;
    MockERC20 internal tokenIn;
    MockERC20 internal tokenOut;
    MockRouter internal router;
    MockBeacon internal beacon;

    address internal dao = address(0xDAD);
    address internal treasury = address(0xBEEF);
    address internal executor = address(0xE11E);
    address internal otherOwner = address(0x1234);

    function setUp() public {
        impl = new ManagedVault();
        beacon = new MockBeacon(address(impl));
        factory = new ManagedVaultFactory(dao, treasury, address(beacon));
        tokenIn = new MockERC20("Token In", "TIN");
        tokenOut = new MockERC20("Token Out", "TOU");
        router = new MockRouter();

        vm.prank(dao);
        factory.setApprovedAsset(address(tokenIn), true);
        vm.prank(dao);
        factory.setApprovedAsset(address(tokenOut), true);
        vm.prank(dao);
        factory.setApprovedRouter(address(router), true);
        vm.prank(dao);
        factory.setApprovedExecutor(executor, true);
    }

    function test_create_vault_and_owner_can_withdraw() public {
        vm.prank(otherOwner);
        address vaultAddr = factory.createVault(otherOwner, keccak256("strategy-v1"), "ipfs://metadata", "momentum", bytes32(0));

        ManagedVault vault = ManagedVault(vaultAddr);
        assertEq(vault.owner(), otherOwner);

        tokenIn.mint(otherOwner, 1_000e18);
        vm.startPrank(otherOwner);
        tokenIn.approve(vaultAddr, 1_000e18);
        vault.depositERC20(address(tokenIn), 1_000e18);
        vault.withdrawERC20(address(tokenIn), 250e18, otherOwner);
        vm.stopPrank();

        assertEq(tokenIn.balanceOf(otherOwner), 250e18);
    }

    function test_trade_fee_and_multicall_executor_reward_flow() public {
        vm.prank(otherOwner);
        address vaultAddr = factory.createVault(otherOwner, keccak256("strategy-v2"), "ipfs://metadata", "macro", bytes32(0));
        ManagedVault vault = ManagedVault(vaultAddr);

        tokenIn.mint(vaultAddr, 1_000e18);
        tokenOut.mint(address(router), 1_000e18);

        bytes memory data = abi.encodeWithSelector(MockRouter.swap.selector, address(tokenIn), address(tokenOut), 100e18, executor);

        vm.prank(factory.MULTICALL3());
        vault.executeTrade(address(router), address(tokenIn), address(tokenOut), 100e18, data, executor, executor, 0);

        assertGt(tokenIn.balanceOf(executor), 100e18);
    }
} 
