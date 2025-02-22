// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Pausable.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IGauge} from "./interfaces/IGauge.sol"; 

interface IRouter {
    struct Path {
        address from;
        address to;
        bool stable;
        address factory;
    }
}

interface IOracle {
    function getManyRatesWithConnectors(uint8 src_len, IERC20[] memory connectors) external view returns (uint256[] memory rates);
}

contract InfiniteBoost is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;


    //mapping para las rewards por pool
    struct RewardPool {
        uint256 totalRewards;
        uint256 distributedRewards;
        uint256 baseRewardTokenEarned;
    }




    // declaracion de variables publicas del contrato
    IERC20 public immutable boostRewardToken;  
    IERC20 public immutable baseRewardToken;  
    IERC20 public immutable weth;
    IERC20 public immutable connectorToken;

    IRouter public router;
    IOracle public oracle;

    uint256 public feePercentage = 10;    

    // variable para seguir la asignacion de los tokens del contrato
    uint256 public totalAssignedBoostRewards;

    mapping(address => uint256) public boostPercentage;


    // mapeo control de recompensas
    mapping(address => RewardPool) public rewardPools;

    // mapeos de balances y recompensas por usuario y LP
    mapping(address => mapping(address => uint256)) public balanceOf;  
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  
    mapping(address => mapping(address => uint256)) public rewards;
    mapping(address => uint256) public lpFee;


    // mapeo para asociar LPs con contratos Gauge
    mapping(address => IGauge) public gauges;

    address[] public lpTokens;



    // evento usuarios
    event Deposit(address indexed user, address indexed lpToken, uint256 amount);
    event Withdraw(address indexed user, address indexed lpToken, uint256 amount);
    event ClaimRewardsUser(address indexed user, address indexed lpToken, uint256 reward);

    // eventos relacionados con configuracion
    event FeePercentageUpdated(uint256 newFeePercentage);
    event BoostPercentageUpdated(address indexed lpToken, uint256 newBoostPercentage);
    event RouterUpdated(address indexed newRouter);
    event OracleUpdated(address indexed newOracle);
    event GaugeAdded(address indexed lpToken, address indexed gauge, uint256 feeBoostPercentage);
    event GaugeRemoved(address indexed lpToken);
    event BoostRewardDeposited(address indexed depositor, uint256 amount);

    //eventos relacionados al sistema de pausa

    event EmergencyWithdraw(address indexed user, address indexed lpToken, uint256 amount);
    event GlobalPause(address indexed owner);
    event GlobalUnPaused(address indexed owner);


    // eventos relacionados con acciones de usuario
    event ClaimRewards(address indexed user, address indexed lpToken, uint256 baseRewardToken);

    // eventos relacionados con acciones de owner
    event LpFeeCollected(address indexed lpToken, uint256 feeAmount);


    event RewardPoolUpdated(address indexed lpToken, uint256 rewardAmount);

    event RewardTokenWithdrawn(address indexed owner, uint256 amount);

    // modifier para verificar gauge activo 
    modifier gaugeActive(address _lpToken) {
        require(address(gauges[_lpToken]) != address(0),"LP token does not have an associated Gauge");
        _;
    }



    /**
     * 
     * @dev Configura los contratos de tokens, el router y el oracle
     * @param _boostRewardToken direccion del token con el que se paga al usuario
     * @param _baseRewardToken  direccion del token que obtiene el dao
     * @param _router direccion del contrato  Router
     * @param _oracle direccion del contrato del oracle
     */
    constructor(address _boostRewardToken, address _baseRewardToken ,address _weth, address _connectorToken, address _router, address _oracle, address _owner) Ownable (_owner) {
        require(_boostRewardToken != address(0), "Invalid boostRewardToken address");
        require(_baseRewardToken != address(0), "Invalid baseRewardToken address");
        require(_weth != address(0), "Invalid baseRewardToken address");
        require(_connectorToken != address(0), "Invalid baseRewardToken address");
        require(_router != address(0), "Invalid router address");
        require(_oracle != address(0), "Invalid oracle address");

        boostRewardToken = IERC20(_boostRewardToken);
        baseRewardToken  = IERC20(_baseRewardToken );
        weth = IERC20(_weth );
        connectorToken  = IERC20(_connectorToken );
        router = IRouter(_router); 
        oracle = IOracle(_oracle);
    }

       

       ///////////////////////////////////FUNCIONES PARA EL OWNER ///////////////////////////////////

    /**
     * 
     * @notice Pausa todas las operaciones del contrato
     */
    
    function pause() external  onlyOwner{
        _pause();
        emit GlobalPause(msg.sender);
    }


    /**
     * 
     * @notice Renauda todas las operaciones del contrato
     */
        
    function unPause() external  onlyOwner{
        _unpause();
        emit GlobalUnPaused(msg.sender);
    }


    /**
     * @notice Reclama las recompensas baseRewardToken acumuladas en el gauge y las envia al dao.
     */
    function claimBaseRewardTokenOwner(address _lpToken) external nonReentrant onlyOwner gaugeActive(_lpToken){
        IGauge gauge = gauges[_lpToken];
        uint256 _rewards = gauge.earned(address(this));
        require(_rewards > 0, "No rewards available");

        uint256 pendingRewards = calculatePendingRewards();
        uint256 balanceBoostRewardToken = IERC20(boostRewardToken).balanceOf(address(this));
        require(balanceBoostRewardToken>=pendingRewards, "Insufficient RewardToken balance to cover pending rewards");
        rewardPools[_lpToken].baseRewardTokenEarned= 0;

        gauge.getReward(address(this));
        IERC20(baseRewardToken).safeTransfer(msg.sender, _rewards);
        emit ClaimRewards(msg.sender, _lpToken, _rewards);
    }





    /**
     * @notice Recupera comisiones acumuladas de un LP y las envia a una address en especifico
     */
    function getLpFee(address _lpToken, uint256 _amount) external nonReentrant onlyOwner gaugeActive(_lpToken){
        require(_amount <= lpFee[_lpToken], "Insufficient LP fee balance");
        require(_amount > 0, "Amount must be greater than 0");

        IGauge gauge = gauges[_lpToken];
        gauge.withdraw(_amount);
        lpFee[_lpToken] -= _amount;
        IERC20(_lpToken).safeTransfer(msg.sender, _amount);
        emit LpFeeCollected(_lpToken, _amount);

    }

    /**
     * @notice Retira  RewardToken del contrato
     */
    function withdrawRewardToken(uint256 _amount) external nonReentrant onlyOwner {
        require(_amount > 0, "Cannot withdraw 0 tokens");
        uint256 balanceRewardTokenContract = boostRewardToken.balanceOf(address(this));
        require(_amount <= balanceRewardTokenContract, "Insufficient RewardToken balance in contract");

        uint256 totalPendingRewards = calculatePendingRewards();
        uint256 availableBalance = balanceRewardTokenContract - totalPendingRewards;
        require(_amount <= availableBalance, "Cannot withdraw more than available balance after pending rewards");



        boostRewardToken.safeTransfer(msg.sender, _amount);
        emit RewardTokenWithdrawn(msg.sender, _amount);
    }

   
    /**
     * @notice Agrega un nuevo contrato Gauge para un LP token o elimina el existente.
     * @dev Si `gauge` es `address(0)`, se elimina el Gauge y el LP token del array `lpTokens`.
     * @param _lpToken La dirección del LP token.
     * @param gauge La dirección del contrato Gauge (o `address(0)` para eliminar).
     * @param _boostPercentage El porcentaje de boost para las recompensas (se ignora si se elimina).
     */
    function addGauge(address _lpToken, IGauge gauge, uint256 _boostPercentage, uint256 gaugeReward) external onlyOwner {
        if (address(gauge) == address(0)) {
            require(address(gauges[_lpToken]) != address(0), "Gauge does not exist for this LP");
            delete gauges[_lpToken];
            delete boostPercentage[_lpToken];

            
            for (uint256 i = 0; i < lpTokens.length; i++) {
                if (lpTokens[i] == _lpToken) {
                    lpTokens[i] = lpTokens[lpTokens.length - 1];
                    lpTokens.pop(); 
                    break;
                }
            }

            emit GaugeRemoved(_lpToken);
        } else {
            require(address(gauges[_lpToken]) == address(0), "Gauge already exists for this LP");
            require(_boostPercentage >= 50, "The boostReward must be at least 5%");

            require(
            IERC20(_lpToken).balanceOf(address(gauge)) >= 0 && 
            gauge.stakingToken() == _lpToken, 
            "Invalid gauge for this LP token"
            );


            gauges[_lpToken] = gauge;
            boostPercentage[_lpToken] = _boostPercentage;
            lpTokens.push(_lpToken);
            setRewardPool(_lpToken, gaugeReward);

            emit GaugeAdded(_lpToken, address(gauge), _boostPercentage);
        }
    }


    

    /**
     * @notice Configura la direccion del contrato baseRewardTokendrome Router
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router address");
        router = IRouter(_router);
        emit RouterUpdated(_router);
    }

    /**
     * @notice Configura la direccion del contrato Oracle
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = IOracle(_oracle);
        emit OracleUpdated(_oracle);
    }

    /**
     * @notice Configura el porcentaje de comisión para retiros
     * @param newFeePercentage Nuevo porcentaje de comisión (en base 1000, donde 10 = 1%)
     */
    function setFeePercentage(uint256 newFeePercentage ) external onlyOwner {
        require(newFeePercentage <= 10, "Fee percentage cannot exceed 1%");
        feePercentage = newFeePercentage;
        emit FeePercentageUpdated(newFeePercentage);
    }

    /**
     * @notice Configura el porcentaje de boost aplicado a las recompensas
     * @param newBoostPercentage Nuevo porcentaje de boost (en base 1000, donde 50 = 5%)
     */
    function setBoostPercentage(uint256 newBoostPercentage, address _lpToken) external onlyOwner gaugeActive(_lpToken) {
        require(newBoostPercentage >= 50, "The boostReward must be at least 5%");
        boostPercentage[_lpToken] = newBoostPercentage;
        emit BoostPercentageUpdated(_lpToken, newBoostPercentage);
        }
    
    /**
     * @notice Funcion para asignar un maximo de recompensas en un Lp
     */

    function setRewardPool(address _lpToken, uint256 _rewardAmount) public onlyOwner gaugeActive(_lpToken) {
        uint256 balanceRewardToken= boostRewardToken.balanceOf(address(this));
       
        uint256 previousAssigned  = rewardPools[_lpToken].totalRewards;
        uint256 newTotalAssigned = (totalAssignedBoostRewards - previousAssigned) + _rewardAmount;
        uint256 distributedRewards = rewardPools[_lpToken].distributedRewards;
        require(newTotalAssigned > distributedRewards,"New total assigned must be greater than distributed rewards");
        require(newTotalAssigned <= balanceRewardToken, "Insufficient tokens to assign");
        rewardPools[_lpToken].totalRewards = _rewardAmount;
        totalAssignedBoostRewards = newTotalAssigned;

        emit RewardPoolUpdated(_lpToken, _rewardAmount);
    }


    function depositBoostReward(uint256 _amount) public onlyOwner {
        require(_amount >0, "Cannot deposit 0 tokens");
        IERC20(boostRewardToken).safeTransferFrom(msg.sender, address(this), _amount);
        emit BoostRewardDeposited(msg.sender, _amount);
    }

       ///////////////////////////////////FUNCIONES PARA USUARIOS ///////////////////////////////////


    /**
     * @notice Deposito de LPtokens
     */
    function deposit(uint256 _amount, address _lpToken) external nonReentrant whenNotPaused gaugeActive(_lpToken) {
        require(_amount > 0, "Cannot deposit 0 tokens");

        IGauge gauge = gauges[_lpToken];

        uint256 totalPendingRewards= calculatePendingRewards();
        uint256 balanceRewardToken = boostRewardToken.balanceOf(address(this));
        require(balanceRewardToken>totalPendingRewards, "Cannot withdraw more than available balance after pending rewards");

        RewardPool storage pool = rewardPools[_lpToken];
        require(pool.totalRewards>pool.distributedRewards, "No rewards left for this LP");

        
        _updateRewards(msg.sender, _lpToken);
        IERC20(_lpToken).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(_lpToken).safeIncreaseAllowance(address(gauge), _amount);
        gauge.deposit(_amount);
        balanceOf[msg.sender][_lpToken] += _amount;

        emit Deposit(msg.sender, _lpToken, _amount);
    }

    /**
     * @notice Retiro de LP  junto con las recompensas generadas.
     */
    function withdraw(uint256 _amount, address _lpToken) external nonReentrant whenNotPaused gaugeActive(_lpToken) {
        require(_amount > 0, "Cannot withdraw 0 tokens");

        require(balanceOf[msg.sender][_lpToken] >= _amount, "Insufficient balance");

        _updateRewards(msg.sender, _lpToken);
        balanceOf[msg.sender][_lpToken] -= _amount;

        IGauge gauge = gauges[_lpToken];
        uint256 fee = (_amount * feePercentage) / 1000;
        lpFee[_lpToken]+=fee;
        
        uint256 amount = _amount - fee;
        gauge.withdraw(amount);
        IERC20(_lpToken).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, _lpToken, _amount);
    }
    
    /**
     * @notice Reclama recompensas de un gauge especifico.
     */


    function claimRewardRewardToken(address _lpToken) external nonReentrant whenNotPaused gaugeActive(_lpToken){
        _updateRewards(msg.sender, _lpToken);
        
        uint256 _rewards = rewards[msg.sender][_lpToken];
        if (_rewards > 0) {
            uint256 boostreward = _rewardBoost(_rewards, _lpToken);

            RewardPool storage pool = rewardPools[_lpToken];
            pool.distributedRewards += boostreward;
            pool.baseRewardTokenEarned += _rewards;

            rewards[msg.sender][_lpToken] = 0;
            boostRewardToken.safeTransfer(msg.sender, boostreward);
            emit ClaimRewardsUser(msg.sender, _lpToken , _rewards);
        }
    } 

    /**
     * @notice Calcula las recompensas acumuladas de un usuario para un LP especifico 
     * @return uint256 Cantidad de recompensas acumuladas
     */
     function earned(address _account, address _lpToken) public view returns (uint256) {
        IGauge gauge = gauges[_lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP");
        
        
        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken(); 
        uint256 userBalance = balanceOf[_account][_lpToken];  

        // calculo de las recompensas acumuladas basado en el  balance del usuario 
        return (userBalance * (rewardPerTokenFromGauge - userRewardPerTokenPaid[_account][_lpToken])) / 1e18 + rewards[_account][_lpToken];
    }

    /**
     * @notice devuelve el balance de LP  de un usuario para un token específico
     */
    function balanceOfLp(address user, address lpToken) external view returns (uint256) {
        return balanceOf[user][lpToken];
    }

    /**
     * @notice devuelve las rewards en RewardToke de cada  usuario para cada lp especifico 
     */
    function earnedRewardToken(address _acount, address _lpToken) public view returns (uint256){
        IGauge gauge = gauges[_lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP");
       uint256 _rewardbaseRewardToken= earned(_acount,_lpToken);
       uint256 _rewardToken= _rewardBoost(_rewardbaseRewardToken, _lpToken);
       return _rewardToken;
    }


     /**
     * @notice muestra el BoostPercentage de un lp especifico
     */
    function viewBoostPercentage(address _lpToken) external  view gaugeActive(_lpToken) returns (uint256)  {
        return boostPercentage[_lpToken];
    }


     /**
     * @notice verifica si el pool esta activo 
     */
    function isActivePool(address _lpToken) external  view returns (bool) {
    return address(gauges[_lpToken]) != address(0);
    }


    /**
     * @notice Devuelve todas las direcciones de los LP tokens registrados
     * @return Un array de direcciones de los LP tokens
     */
    function getAllLPTokens() external view returns (address[] memory) {
        return lpTokens;
    }


    function emergencyWithdraw(address _lpToken) external nonReentrant whenPaused gaugeActive(_lpToken){
        uint256 userBalance = balanceOf[msg.sender][_lpToken];
        require(userBalance > 0, "No balance to withdraw" );


        balanceOf[msg.sender][_lpToken]=0;

        IGauge gauge = gauges[_lpToken];
        gauge.withdraw(userBalance);
        IERC20(_lpToken).safeTransfer(msg.sender, userBalance);

        emit EmergencyWithdraw(msg.sender, _lpToken, userBalance);

    }

       ///////////////////////////////////FUNCIONES INTERNAS/////////////////////////////////////////

        /**
     * @notice Calcula las recompensas con boost adicional
     * @dev Esta funcion aplica un boost sobre las recompensas en baseRewardToken utilizando el Oracle y las tasas de los conectores.
     */
        function _rewardBoost(uint256 _baseRewardTokenAmount , address _lpToken) public view returns (uint256 ) {
            
            IERC20[] memory connectors = new IERC20[](4) ;
            connectors[0] = IERC20(baseRewardToken );
            connectors[1] = IERC20(weth );
            connectors[2] = IERC20(connectorToken );
            connectors[3] = IERC20(boostRewardToken);

            uint256[] memory rates = oracle.getManyRatesWithConnectors(1, connectors); 
            require(rates.length > 0 && rates[0] > 0, "Invalid oracle rate");

            
            // aplica la tasa de conversion obtenida para calcular el valor final con boost
            uint256 baseValor = (_baseRewardTokenAmount * rates[0]) / 10**18; 
            uint _boostPercentage= boostPercentage[_lpToken];
            uint256 boostedValor = (baseValor * (1000 + _boostPercentage)) / 1000;


            return boostedValor;
        }

    /**
     * @notice Actualiza las recompensas acumuladas de un usuario para un LP, utiliza 
     * @dev Esta funcion se llama antes de cualquier acción de depósito o retiro, actualizando las recompensas no reclamadas
     */

    function _updateRewards(address _account, address _lpToken) internal gaugeActive(_lpToken) {
        IGauge gauge = gauges[_lpToken];
        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken(); 
        rewards[_account][_lpToken] = earned(_account, _lpToken);  
        userRewardPerTokenPaid[_account][_lpToken] = rewardPerTokenFromGauge;  
    }

    /**
     * @notice Devuelve el total de recompensas en RewardToken pendientes
     */

    function calculatePendingRewards() public view returns (uint256 totalPendingRewards) {
    totalPendingRewards = 0;
    
    for (uint256 i = 0; i < lpTokens.length; i++) {
        address currentLpToken = lpTokens[i];
        IGauge gauge = gauges[currentLpToken];
        
        if (address(gauge) != address(0)) {
            RewardPool storage pool = rewardPools[currentLpToken];

            uint256 totalBaseRewards = gauge.earned(address(this));
            uint256 alreadyPaidRewards = pool.baseRewardTokenEarned;

            if (totalBaseRewards > alreadyPaidRewards) {
                uint256 pendingBaseRewards = totalBaseRewards - alreadyPaidRewards;

                if (pendingBaseRewards > 0) {
                    uint256 potentialBoostRewards = _rewardBoost(pendingBaseRewards, currentLpToken);
                    totalPendingRewards += potentialBoostRewards;
                }
            }
        }
    }
    return totalPendingRewards;
}
}
