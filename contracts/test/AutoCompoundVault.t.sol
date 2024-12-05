// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Test} from "forge-std/src/Test.sol";
import {AutoCompoundVault} from "../src/autocompounder.sol";
import {SimpleToken} from "../src/mock/SimpleToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {console} from "forge-std/src/console.sol";

contract AutoCompoundVaultTest is Test {
    AutoCompoundVault public autoCompoundVault;
    uint256 constant DECIMALS = 10 ** 18;
    // Token addresses for USDC, ITP, and VELO on Optimism
    IERC20 public usdcToken = IERC20(0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85); // USDC token address
    IERC20 public itpToken = IERC20(0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0); // ITP token address (replace with actual)
    IERC20 public veloToken = IERC20(0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db); // VELO token address (replace with actual)

    // DEX Router (e.g., Velodrome or 1inch) and liquidity pool addresses
    address public dexRouter = 0x11111112542D85B3EF69AE05771c2dCCff4fAa26; // Velodrome or 1inch router
    address public liquidityPool = 0xB84C932059A49e82C2c1bb96E29D59Ec921998Be; // ITP-USDC liquidity pool
    address public stakingGauge = 0x571E95563A6798C76144c8C5ed293406Ed81A437; // Velodrome staking gauge

    address public userA = address(0xacD03D601e5bB1B275Bb94076fF46ED9D753435A); // Whale address

    function setUp() public {
        autoCompoundVault = new AutoCompoundVault(userA);
    }

    function test_Deposit() public {
        vm.startPrank(userA);

        uint256 depositAmount = 10**2 * 10**6;
        console.log("userA usdc balance: ", usdcToken.balanceOf(userA));
        usdcToken.approve(address(autoCompoundVault), depositAmount);
        autoCompoundVault.deposit(depositAmount);
        vm.stopPrank();
    }

    function test_Withdraw() public {
        vm.startPrank(userA);

        uint256 depositAmount = 10**2 * 10**6;
        console.log("userA usdc balance: ", usdcToken.balanceOf(userA));
        usdcToken.approve(address(autoCompoundVault), depositAmount);
        autoCompoundVault.deposit(depositAmount);

        autoCompoundVault.withdraw(108684712301638);

        vm.stopPrank();
    }

    function test_Autocompound() public {
        vm.startPrank(userA);

        uint256 depositAmount = 10**2 * 10**6;
        console.log("userA usdc balance: ", usdcToken.balanceOf(userA));
        usdcToken.approve(address(autoCompoundVault), depositAmount);
        autoCompoundVault.deposit(depositAmount);

        vm.warp(block.timestamp + 1 days);
        autoCompoundVault.autoCompound();

        vm.stopPrank();
    }
}
