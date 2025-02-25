/ SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/InfiniteBoost.sol";
import "../src/interfaces/IGauge.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

    contract InfiniteBoostForkSegmentedTest is Test {
        // instancias de los contratos para probar
        InfiniteBoost public booster;
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

        //Configuracion inicial  de saldos y tokens para la prueba
        function setUp() public {
            itpToken = IERC20(vm.envAddress("ITP_TOKEN_ADDRESS"));
            veloToken = IERC20(vm.envAddress("VELO_TOKEN_ADDRESS"));
            lpToken = IERC20(vm.envAddress("LP_TOKEN_ADDRESS"));
            gauge = IGauge(vm.envAddress("GAUGE_ADDRESS"));

            string memory forkUrl = vm.envString("RPC_URL");
            vm.createSelectFork(forkUrl);

            booster = new InfiniteBoost(
                address(itpToken),
                address(veloToken),
                vm.envAddress("WETH_TOKEN_ADDRESS"),
                vm.envAddress("USDT_TOKEN_ADDRESS"),
                vm.envAddress("ROUTER_ADDRESS"),
                vm.envAddress("ORACULE_ADDRESS"),
                address(0x9)
            );


            console.log("OWNEEEER", booster.owner());
            deal(address(itpToken), address(booster), 89999 ether);

            vm.startPrank(address(0x9));
            booster.addGauge(address(lpToken), gauge, 200, 1000 ether);
            vm.stopPrank();

            user1 = address(0x1);
            user2 = address(0x2);
            user3 = address(0x3);
            user4 = address(0x4);
            user5 = address(0x5);
            dao = address(0x6);
            

            vm.deal(user1, INITIAL_BALANCE);
            vm.deal(user2, INITIAL_BALANCE);
            vm.deal(user3, INITIAL_BALANCE);
            vm.deal(user4, INITIAL_BALANCE);
            vm.deal(user5, INITIAL_BALANCE);

          

            deal(address(lpToken), user1, 1000000 ether);
            deal(address(lpToken), user2, 1000000 ether);
            deal(address(lpToken), user3, 1000000 ether);
            deal(address(lpToken), user4, 1000000 ether);
            deal(address(lpToken), user5, 1000000 ether);

            //asignacion al notify
            deal(address(veloToken), address(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C), 10000000000 ether);
        }

        
    
     //prueba de deposito s en diferentes tiempos, para verificar  y seguir las recompensas en el gauge y boost
     
        function testUserDepositsWithIntervals() public {
    console.log("=== Inicio de prueba de deposito s y recompensas ===");

    // dia 0: deposito s iniciales de User1
    {
        vm.startPrank(user1);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        console.log("dia 0: User 1 deposito  en Gauge y Booster");
    }

    // dia 1: deposito  de User2 en Gauge
    {
        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user2);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
        console.log("dia 1: User 2 deposito  solo en Gauge");
    }

    // dia 2: Distribucion de recompensas y deposito  de User3
    {
        vm.warp(block.timestamp + 1 days);
        
        // Distribucion de recompensas
        vm.startPrank(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C);
        veloToken.approve(address(gauge), 1000 ether);
        gauge.notifyRewardAmount(100 ether);
        vm.stopPrank();

        // deposito  de User3
        vm.startPrank(user3);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        
        // Verificacion de recompensas de User1
        vm.startPrank(user1);
        uint256 rewardsInGauge = gauge.earned(user1);
        uint256 rewardsInBooster = booster.earned(user1, address(lpToken));
        console.log("dia 2 - User 1 recompensas Gauge:", rewardsInGauge);
        console.log("dia 2 - User 1 recompensas Booster:", rewardsInBooster);
        vm.stopPrank();

        // deposito  adicional de User4
        vm.startPrank(user4);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    // dia 4: deposito s de User4 en ambos
    {
        vm.warp(block.timestamp + 2 days);
        vm.startPrank(user4);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();

        // Nueva distribucion de recompensas
        vm.startPrank(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C);
        veloToken.approve(address(gauge), 1000 ether);
        gauge.notifyRewardAmount(1000 ether);
        vm.stopPrank();
    }

    // dia 5: deposito  de User5 en Gauge
    {
        vm.warp(block.timestamp + 1 days);
        vm.startPrank(user5);
        lpToken.approve(address(gauge), DEPOSIT_AMOUNT);
        gauge.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

        uint256 tokenspendientes= booster._calculatePendingRewards();
        console.log("balances de tokens pendientes ",tokenspendientes );

    // dia 7: Verificaciones finales
    {
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(user1);
        uint256 rewardsInGauge = gauge.earned(user1);
        uint256 rewardsInBooster = booster.earned(user1, address(lpToken));
        console.log("dia 7 - User 1 recompensas finales Gauge:", rewardsInGauge);
        console.log("dia 7 - User 1 recompensas finales Booster:", rewardsInBooster);


        assertEq(rewardsInGauge, rewardsInBooster, "Las recompensas de User 1 deberian ser iguales");

        // retiro y verificacion de balances
        console.log("Balance ITP antes del retiro:", itpToken.balanceOf(user1));
        booster.withdraw(booster.getBalanceOfLp(user1, address(lpToken)), address(lpToken));
        booster.claimBoostRewards(address(lpToken));
        console.log("LP en fee pool:", lpToken.balanceOf(address(booster)));
        console.log("Balance ITP despues del retiro:", itpToken.balanceOf(user1));
        vm.stopPrank();
    }

    // Verificaciones del DAO
    {
        vm.startPrank(address(0x9));
        booster.claimBaseRewardTokenOwner(address(lpToken));
        console.log("DAO Balance inicial - VELO:", veloToken.balanceOf(address(0x9)));
        console.log("DAO Balance inicial - LP:", lpToken.balanceOf(address(0x9)));
        
        uint256 balanceFee = booster.lpFee(address(lpToken));
        console.log("Balance Fee", balanceFee);

        booster.collectLpFee(address(lpToken), balanceFee);
        console.log("DAO Balance final - VELO:", veloToken.balanceOf(address(0x9)));
        console.log("DAO Balance final - LP:", lpToken.balanceOf(address(0x9)));
        
        assertEq(100 ether, lpToken.balanceOf(address(0x9)), "Balance LP incorrecto para DAO");
        vm.stopPrank();
    }

    // Estado final del sistema
    {
        console.log("=== Estado Final del Sistema ===");
        console.log("Porcentaje de Boost:", booster.getBoostPercentage(address(lpToken)));
        console.log("Pool Activo:", booster.isPoolActive(address(lpToken)));
        console.log("Pool Inactivo Status:", booster.isPoolActive(address(0xA56a25Dee5B3199A9198Bbd48715EE3D0ed98378)));

        console.log("=== LP Tokens Registrados ===");
        address[] memory lpTokens = booster.getAllLPTokens();
        for (uint256 i = 0; i < lpTokens.length; i++) {
            console.log("LP Token", i, ":", lpTokens[i]);
        }

        console.log("=== Recompensas Finales por Usuario ===");
        console.log("User 2 (Gauge):", gauge.earned(user2));
        console.log("User 3 (Booster):", booster.earned(user3, address(lpToken)));
        console.log("User 4 (Gauge):", gauge.earned(user4));
        console.log("User 4 (Booster):", booster.earned(user4, address(lpToken)));
        console.log("User 5 (Gauge):", gauge.earned(user5));
        


    }
}

        
         // prueba de configuración de la comision a 1% y comprobación del retiro con comision aplicada

            function test_SetFeePercentageToOnePercentAndWithdraw() public {
            vm.startPrank(address(0x9)); 
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

       // prueba de que solo el owner puede configurar la comision
    
        
        function test_SetFeePercentageNoOwner() public {
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(
            Ownable.OwnableUnauthorizedAccount.selector,
            user1 
        ));
        booster.setFeePercentage(10);
        vm.stopPrank();
    }


     // prueba de reclamo de comisiones por un usuario no owner

    function test_collectLpFeeNoOwner() public {
        vm.startPrank(user1);
        vm.expectRevert(abi.encodeWithSelector(
        Ownable.OwnableUnauthorizedAccount.selector,
        user1
    ));
        booster.collectLpFee(address(lpToken), 100 ether);
        vm.stopPrank();
    }


    //prueba para setear las recompensas 
    function testSetRewardPool() public {
        uint256 rewardAmount = 222 ether;
        
        vm.startPrank(address(0x9));
        booster.setRewardPool(address(lpToken), rewardAmount);
        
        (uint256 totalRewards, uint256 distributedRewards,) = booster.rewardPools(address(lpToken));
        assertEq(totalRewards, rewardAmount, "Total rewards should match set amount");
        assertEq(distributedRewards, 0, "Distributed rewards should start at 0");
        vm.stopPrank();
    }

    // Prueba de prueba cuando hay recompensas disponibles
    function testDepositWithAvailableRewards() public {
        uint256 rewardAmount = 23 ether;
        
        uint256 balancedelcontrato = IERC20(itpToken).balanceOf(address(booster));
        console.log(" BALANCE QUE PROBOCA EL ERRORRRRRRRR", balancedelcontrato);

        // configuracion del pool de recompensas
        vm.startPrank(address(0x9));
        booster.setRewardPool(address(lpToken), rewardAmount);
        vm.stopPrank();
        
        vm.startPrank(user1);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        
        uint256 balance = booster.getBalanceOfLp(user1, address(lpToken));
        assertEq(balance, DEPOSIT_AMOUNT, "Deposit should be successful");
        vm.stopPrank();
    }

    // // Prueba de prueba cuando no hay recompensas disponibles
    // function testDepositWithNoRewardsAvailable() public {
    //     // No configurar recompensas (o configurar en 0)
    //     vm.startPrank(address(0x9));
    //     booster.setRewardPool(address(lpToken), 0);
    //     vm.stopPrank();
        
    //     // Intentar depositar
    //     vm.startPrank(user1);
    //     lpToken.approve(address(booster), DEPOSIT_AMOUNT);
    //     vm.expectRevert("No rewards left for this LP");
    //     booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
    //     vm.stopPrank();
    // }

    // Prueba de distribucion de recompensas
    function testRewardDistribution() public {



         (uint256 totalRewards1, uint256 distributedRewards1,) = booster.rewardPools(address(lpToken));

        console.log("Total Rewards al principio", totalRewards1);
        console.log("Total Distribuido al principio", distributedRewards1);
        
        vm.startPrank(user1);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        
        vm.warp(block.timestamp + 7 days);
        
        uint256 initialBalance = itpToken.balanceOf(user1);
        booster.claimBoostRewards(address(lpToken));
        uint256 finalBalance = itpToken.balanceOf(user1);
        
        uint256 claimedRewards = finalBalance - initialBalance;
        assert(claimedRewards > 0);
        
        (uint256 totalRewards, uint256 distributedRewards,) = booster.rewardPools(address(lpToken));

        console.log("Total Rewards", totalRewards);
        console.log("Total Distribuido", distributedRewards);
        assert(distributedRewards > 0);
        assert(distributedRewards <= totalRewards);
        vm.stopPrank();
    }

    // Prueba de multiples usuarios compartiendo recompensas
    function testMultipleUsersRewardSharing() public {
        uint256 rewardAmount = 10000 ether;
        deal(address(itpToken), address(booster), 10000000 ether);

        // configuracion del pool de recompensas
        vm.startPrank(address(0x9));
        booster.setRewardPool(address(lpToken), rewardAmount);
        vm.stopPrank();
        
        // Usuario 1 deposita
        vm.startPrank(user1);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        
        vm.warp(block.timestamp + 1 days);
        
        vm.startPrank(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C);
        veloToken.approve(address(gauge), 1000 ether);
        gauge.notifyRewardAmount(1000 ether);
        vm.stopPrank();
        
        // Usuario 2 deposita
        vm.startPrank(user2);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
        vm.stopPrank();
        
        vm.warp(block.timestamp + 6 days);
        
        // Ambos usuarios reclaman recompensas
        vm.startPrank(user1);
        uint256 user1InitialBalance = itpToken.balanceOf(user1);
        booster.claimBoostRewards(address(lpToken));
        uint256 user1Rewards = itpToken.balanceOf(user1) - user1InitialBalance;
        vm.stopPrank();
        
        vm.startPrank(user2);
        uint256 user2InitialBalance = itpToken.balanceOf(user2);
        uint256 balance1 = booster.earnedRewardToken(user1, address(lpToken));
        console.log("BALANCE !!!111", balance1);
        booster.claimBoostRewards(address(lpToken));
        uint256 user2Rewards = itpToken.balanceOf(user2) - user2InitialBalance;
        vm.stopPrank();
        
        console.log("USER 1 Recompemsas", user1Rewards);
        console.log("USER 2 Recompemsas", user2Rewards);


        assert(user1Rewards > 0 );
        assert(user2Rewards > 0);
        
        assert(user1Rewards > user2Rewards);
    }

    // Prueba de limite de recompensas


    // function testRewardLimit() public {
    //     uint256 rewardAmount = 10 ether;
    //     deal(address(itpToken), address(booster), 10000000 ether);
    //     console.log("balance del contrato", IERC20(itpToken).balanceOf(address(booster)));

    //     //pool pequeño de recompensas
    //     vm.startPrank(address(0x9));
    //     booster.setRewardPool(address(lpToken), rewardAmount);
    //     vm.stopPrank();
        
    //     // varios usuarios depositan hasta agotar recompensas
    //     vm.startPrank(user1);
    //     lpToken.approve(address(booster), DEPOSIT_AMOUNT);
    //     booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
    //     vm.stopPrank();
        
    //     vm.warp(block.timestamp + 1 days);
        
    //     // Reclamar todas las recompensas
    //     vm.startPrank(user1);
    //     booster.claimBoostRewards(address(lpToken));
    //     vm.stopPrank();
        
    //     //  depositar mas cuando las recompensas estan agotadas
    //     vm.startPrank(user2);
    //     lpToken.approve(address(booster), DEPOSIT_AMOUNT);
    //     vm.expectRevert("No rewards left for this LP");
    //     booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
    //     vm.stopPrank();
    // }

    function testModifier () public {
        vm.startPrank(user1);
        lpToken.approve(address(booster), DEPOSIT_AMOUNT);
        vm.expectRevert("LP token does not have an associated Gauge");
        booster.deposit(DEPOSIT_AMOUNT, address(0xC04754f8027ABbfE9EeA492c9CC78b66946a07d4));
        vm.stopPrank();
    }


    
    function test_calculatePendingRewards() public {
    uint256 rewardAmount = 1000 ether;
    deal(address(itpToken), address(booster), 1000000 ether);

    vm.startPrank(address(0x9));
    booster.setRewardPool(address(lpToken), rewardAmount);
    vm.stopPrank();

    // Verificación inicial - deberia ser 0 ya que no se han ganado recompensas
    uint256 initialPendingRewards = booster._calculatePendingRewards();
    assertEq(initialPendingRewards, 0, "Las recompensas pendientes iniciales deberian ser 0");

    vm.startPrank(user1);
    lpToken.approve(address(booster), DEPOSIT_AMOUNT);
    booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
    vm.stopPrank();

    vm.startPrank(0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C);
    veloToken.approve(address(gauge), 100 ether);
    gauge.notifyRewardAmount(100 ether);
    vm.stopPrank();

    vm.warp(block.timestamp + 1 days);

    uint256 pendingRewards = booster._calculatePendingRewards();
    console.log("Recompensas pendientes despues de 1 dia:", pendingRewards);
    assert(pendingRewards > 0);

    // Agregar otro usuario para dividir recompensas
    vm.startPrank(user2);
    lpToken.approve(address(booster), DEPOSIT_AMOUNT);
    booster.deposit(DEPOSIT_AMOUNT, address(lpToken));
    vm.stopPrank();

    vm.warp(block.timestamp + 1 days);

    // Verificar nuevas recompensas pendientes
    uint256 newPendingRewards = booster._calculatePendingRewards();
    console.log("Recompensas pendientes despues del segundo dia:", newPendingRewards);
    assert(newPendingRewards > pendingRewards);

    // Verificar que las recompensas pendientes estén dentro de los limites esperados
    (, uint256 distributedRewards,) = booster.rewardPools(address(lpToken));
    assert(newPendingRewards + distributedRewards <= rewardAmount);

    // Probar despues de que los usuarios reclamen recompensas
    vm.startPrank(user1);
    booster.claimBoostRewards(address(lpToken));
    vm.stopPrank();

    vm.startPrank(user2);
    booster.claimBoostRewards(address(lpToken));
    vm.stopPrank();

    // Verificar recompensas pendientes despues de los reclamos
    uint256 pendingAfterClaims = booster._calculatePendingRewards();
    console.log("Recompensas pendientes despues de los reclamos:", pendingAfterClaims);
    assert(pendingAfterClaims < newPendingRewards);
    vm.stopPrank();     
    }

    // function testpruebasalidaconversor() public view returns(uint256){
    // uint256 inputAmount = 1 ether;
    // address lpTokenAddress = address(lpToken);
    
    // console.log("Input Amount:", inputAmount);
    // console.log("LP Token Address:", lpTokenAddress);
    
    // uint256 resultado = booster._rewardBoost(inputAmount, lpTokenAddress);
    
    // console.log("Resultado conversion:", resultado);
    // return resultado;
    // }

    }


