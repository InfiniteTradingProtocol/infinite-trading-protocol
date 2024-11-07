// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Booster.sol";
import "../src/interfaces/IGauge.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title BoosterVeloLpForkSegmentedTest
 * @dev pruebas de integración de `BoosterVeloLp` y `Gauge` con varios usuarios y recompensas escalonadas
 */
contract BoosterVeloLpForkSegmentedTest is Test {
    // instancias de los contratos para probar
    BoosterVeloLp public booster;
    IGauge public gauge;
    IERC20 public itpToken;
    IERC20 public veloToken;
    IERC20 public lpToken;
    
    // direcciones simuladas de los usuarios
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    address public user5;

    // constantes de configuración inicial
    uint256 constant INITIAL_BALANCE = 1000 ether; 
    uint256 constant DEPOSIT_AMOUNT = 100 ether;

    /**
     * @dev configuración inicial de los contratos y saldos de prueba para los usuarios
     */
    function setUp() public {
        // inicialización de tokens y gauge desde direcciones externas
        itpToken = IERC20(vm.envAddress("ITP_TOKEN_ADDRESS"));
        veloToken = IERC20(vm.envAddress("VELO_TOKEN_ADDRESS"));
        lpToken = IERC20(vm.envAddress("LP_TOKEN_ADDRESS"));
        gauge = IGauge(vm.envAddress("GAUGE_ADDRESS"));
        
        booster = new BoosterVeloLp(
            address(itpToken),
            address(veloToken),
            vm.envAddress("ROUTER_ADDRESS"),
            10000 ether
        );

        // asignación del gauge para el `lpToken`
        booster.ArGauge(address(lpToken), gauge);

        // direcciones de prueba de usuarios
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        user4 = address(0x4);
        user5 = address(0x5);

        // asignación de saldo inicial en ether para cada usuario
        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(user3, INITIAL_BALANCE);
        vm.deal(user4, INITIAL_BALANCE);
        vm.deal(user5, INITIAL_BALANCE);

        // asignación de `lpToken` para cada usuario
        deal(address(lpToken), user1, 10000 ether);
        deal(address(lpToken), user2, 10000 ether);
        deal(address(lpToken), user3, 10000 ether);
        deal(address(lpToken), user4, 10000 ether);
        deal(address(lpToken), user5, 10000 ether);
    }

    /**
     * @dev prueba de depósitos de usuarios en el gauge y en booster en intervalos de tiempo
     */
    function testUserDepositsWithIntervals() public {
        // depósito de user1 en gauge y booster en el mismo dia
        vm.startPrank(user1);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        console.log("user 1 deposita en ambos Gauge y Booster el mismo dia.");

        // avance de tiempo y depósito de user2 solo en gauge despues de 1 dia
        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user2);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
        console.log("user 2 deposita solo en Gauge despues de 1 dia");

        // otro dia despues, user3 deposita solo en booster
        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user3);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));

        // verificación de recompensas para user1
        console.log("RECOMPENSAS USER1", booster.earned(user1, address(lpToken)));
        console.log("RECOMPENSAS USER1", gauge.earned(user1));
        vm.stopPrank();
        console.log("user 3 deposita solo en Booster despues de 2 dias");

        // user4 deposita en ambos gauge y booster despues de 4 dias
        vm.warp(block.timestamp + 2 days);
        vm.startPrank(user4);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        console.log("user 4 deposita en ambos Gauge y Booster despues de 4 dias");

        // user5 deposita solo en gauge despues de 5 dias
        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user5);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
        console.log("user 5 deposita solo en Gauge despues de 5 dias");

        // avance de tiempo y cálculo de recompensas finales para usuarios
        vm.warp(block.timestamp + 2 days);

        vm.startPrank(user1);
        uint256 rewardsInGauge = gauge.earned(user1);
        uint256 rewardsInBooster = booster.earned(user1, address(lpToken));
        console.log("recompensas de user 1 en Gauge:", rewardsInGauge);
        console.log("recompensas de user 1 en Booster:", rewardsInBooster);
        assertEq(rewardsInGauge, rewardsInBooster, "Las recompensas de user 1 deberian ser iguales en Gauge y Booster");
        vm.stopPrank();

        console.log("recompensas de user 2 en Gauge:", gauge.earned(user2));
        console.log("recompensas de user 3 en Booster:", booster.earned(user3, address(lpToken)));
        console.log("recompensas de user 4 en Gauge:", gauge.earned(user4));
        console.log("recompensas de user 4 en Booster:", booster.earned(user4, address(lpToken)));
        console.log("recompensas de user 5 en Gauge:", gauge.earned(user5));
    }
}
