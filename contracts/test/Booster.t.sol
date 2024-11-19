// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
        address public dao; 

        // constantes de configuración inicial
        uint256 constant INITIAL_BALANCE = 10000 ether; 
        uint256 constant DEPOSIT_AMOUNT = 10000 ether;

        /**
         * @dev configuración inicial de los contratos y saldos de prueba para los usuarios
         */
        function setUp() public {
            // inicialización de tokens y gauge desde direcciones externas
            itpToken = IERC20(vm.envAddress("ITP_TOKEN_ADDRESS"));
            veloToken = IERC20(vm.envAddress("VELO_TOKEN_ADDRESS"));
            lpToken = IERC20(vm.envAddress("LP_TOKEN_ADDRESS"));
            gauge = IGauge(vm.envAddress("GAUGE_ADDRESS"));

            string memory forkUrl = vm.envString("RPC_URL_MAINNET");
            vm.createSelectFork(forkUrl);

            booster = new BoosterVeloLp(
                address(itpToken),
                address(veloToken),
                vm.envAddress("ROUTER_ADDRESS"),
                vm.envAddress("ORACULE_ADDRESS")
            );

            // asignación del gauge para el `lpToken`
            booster.AddGauge(address(lpToken), gauge);

            // direcciones de prueba de usuarios
            user1 = address(0x1);
            user2 = address(0x2);
            user3 = address(0x3);
            user4 = address(0x4);
            user5 = address(0x5);
            dao = address(0x6);
            

            // asignación de saldo inicial en ether para cada usuario
            vm.deal(user1, INITIAL_BALANCE);
            vm.deal(user2, INITIAL_BALANCE);
            vm.deal(user3, INITIAL_BALANCE);
            vm.deal(user4, INITIAL_BALANCE);
            vm.deal(user5, INITIAL_BALANCE);

            deal(address(itpToken), address(booster), 9999999999 ether);

            // asignación de `lpToken` para cada usuario
            deal(address(lpToken), user1, 1000000 ether);
            deal(address(lpToken), user2, 1000000 ether);
            deal(address(lpToken), user3, 1000000 ether);
            deal(address(lpToken), user4, 1000000 ether);
            deal(address(lpToken), user5, 1000000 ether);
        }

        /**
         * @dev prueba de depositos en diferentes tiempos, para verificar  y seguir las recompensas en el gauge y boost
         */
        function testUserDepositsWithIntervals() public {
            // deposito de `user1` en gauge y booster en el mismo dia
            vm.startPrank(user1);
            lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
            gauge.deposit(DEPOSIT_AMOUNT);
            lpToken.approve(address(booster), DEPOSIT_AMOUNT);
            booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
            vm.stopPrank();
            console.log("user 1 deposita en ambos Gauge y Booster el mismo dia.");

            // avance de tiempo y deposito de `user2` solo en gauge despues de 1 dia
            vm.warp(block.timestamp + 1 days);
            vm.startPrank(user2);
            lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
            gauge.deposit(DEPOSIT_AMOUNT);
            vm.stopPrank();
            console.log("user 2 deposita solo en Gauge despues de 1 dia");
            vm.stopPrank();


            // otro dia despues, `user3` deposita solo en booster
            vm.warp(block.timestamp + 1 days);
            vm.startPrank(address(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C));
            veloToken.approve(address(gauge),70441057953891792591424);
            gauge.notifyRewardAmount(70441057953891792591424);



            vm.startPrank(user3);
            lpToken.approve(address(booster), DEPOSIT_AMOUNT);
            booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
            vm.stopPrank();

            vm.startPrank(user4);
            lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
            gauge.deposit(DEPOSIT_AMOUNT);
            vm.stopPrank();


            // verificación de recompensas para `user1`
            console.log("RECOMPENSAS USER1", booster.earned(user1, address(lpToken)));
            console.log("RECOMPENSAS USER1", gauge.earned(user1));
            vm.stopPrank();
            console.log("user 3 deposita solo en Booster despues de 2 dias");


            // `user4` deposita en ambos gauge y booster despues de 4 dias
            vm.warp(block.timestamp + 2 days);
            vm.startPrank(user4);
            lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
            gauge.deposit(DEPOSIT_AMOUNT);
            lpToken.approve(address(booster), DEPOSIT_AMOUNT);
            booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
            vm.stopPrank();
            console.log("user 4 deposita en ambos Gauge y Booster despues de 4 dias");

            vm.startPrank(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C);
            veloToken.approve(address(gauge), 1000 ether);
            gauge.notifyRewardAmount(1000 ether);
            vm.stopPrank();


            // `user5` deposita solo en gauge despues de 5 dias
            vm.warp(block.timestamp + 1 days);
            vm.startPrank(user5);
            lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
            gauge.deposit(DEPOSIT_AMOUNT);
            vm.stopPrank();
            console.log("user 5 deposita solo en Gauge despues de 5 dias");

        
            vm.warp(block.timestamp + 2 days);
            vm.startPrank(user1);
            uint256 rewardsInGauge = gauge.earned(user1);
            uint256 rewardsInBooster = booster.earned(user1, address(lpToken));
            console.log("recompensas de user 1 en Gauge:", rewardsInGauge);
            console.log("recompensas de user 1 en Booster:", rewardsInBooster);
            assertEq(rewardsInGauge, rewardsInBooster, "Las recompensas de user 1 deberian ser iguales en Gauge y Booster");

            booster.withdraw(DEPOSIT_AMOUNT,address(lpToken));
            console.log("Balance del LP en fee para ser reclamado", lpToken.balanceOf(address(booster)));
            console.log("balance en itp user 1", itpToken.balanceOf(user1));
            console.log("saldo de cosecha despues del retiro", booster.BalanceOfLp(user1, address(lpToken)));
            vm.stopPrank();

            
            /**
         * @dev prueba de retiro de feelp al dao
         */
            vm.startPrank(address(this));
            booster.getLpFee(address(lpToken), dao, lpToken.balanceOf(address(booster)));
            assertEq(100 ether,lpToken.balanceOf(dao));
            vm.stopPrank();


            console.log("recompensas de user 2 en Gauge:", gauge.earned(user2));
            console.log("recompensas de user 3 en Booster:", booster.earned(user3, address(lpToken)));
            console.log("recompensas de user 4 en Gauge:", gauge.earned(user4));
            console.log("recompensas de user 4 en Booster:", booster.earned(user4, address(lpToken)));
            console.log("recompensas de user 5 en Gauge:", gauge.earned(user5));
        }


        /**
         * @dev prueba de configuración de la comision a 1% y comprobación del retiro con comision aplicada
         */

                function test_SetFeePercentageToOnePercentAndWithdraw() public {
            vm.startPrank(address(this)); 
            booster.setFeePercentage(10); // 1% en base 1000
            vm.stopPrank();

            vm.startPrank(user1);
            lpToken.approve(address(booster), DEPOSIT_AMOUNT);
            booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
            
            uint256 initialLpBalance = lpToken.balanceOf(user1);

            booster.withdraw(DEPOSIT_AMOUNT, address(lpToken));
            uint256 finalLpBalance = lpToken.balanceOf(user1);

            uint256 expectedFee = (DEPOSIT_AMOUNT * 10) / 1000; // Calcular el 1% correctamente
            uint256 expectedAmountAfterFee = DEPOSIT_AMOUNT - expectedFee;

            assertEq(
                finalLpBalance - initialLpBalance,
                expectedAmountAfterFee,
                "El monto recibido despues del retiro debe reflejar una comision del 1%"
            );
            vm.stopPrank();
        }


        /**
         * @dev prueba de que solo el owner puede configurar la comision
         */
        
        function test_SetFeePercentageNoOwner() public {
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(
            Ownable.OwnableUnauthorizedAccount.selector,
            user1 
        ));
        booster.setFeePercentage(10);
        vm.stopPrank();
    }


    /**
     * @dev prueba de reclamo de comisiones por un usuario no owner
     */
    function test_GetLpFeeNoOwner() public {
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(
        Ownable.OwnableUnauthorizedAccount.selector,
        user1
    ));
        booster.getLpFee(address(lpToken), user1, 100 ether);
        vm.stopPrank();
    }
    }

