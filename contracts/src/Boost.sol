// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Pausable.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IGauge} from "./interfaces/IGauge.sol"; 

interface IVelodromeRouter {
    struct Path {
        address from;
        address to;
        bool stable;
        address factory;
    }
}

interface VeloOracle {
    function getManyRatesWithConnectors(uint8 src_len, IERC20[] memory connectors) external view returns (uint256[] memory rates);
}

contract BoosterVeloLp is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;


    //mapping para las rewards por pool
    struct RewardPool {
        uint256 totalRewards;
        uint256 distributedRewards;
    }



    // declaracion de variables publicas del contrato
    IERC20 public immutable itpToken;  
    IERC20 public immutable veloToken;  
    IVelodromeRouter public router;
    VeloOracle public oracle;

    uint256 public feePercentage = 10;     
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

    //eventos relacionados al sistema de pausa

    event EmergencyWithdraw(address indexed user, address indexed lpToken, uint256 amount);
    event GlobalPause(address indexed owner);
    event GlobalUnPaused(address indexed owner);


    // eventos relacionados con acciones de usuario
    event ClaimRewards(address indexed user, address indexed lpToken, uint256 veloRewards);

    // eventos relacionados con acciones de owner
    event LpFeeCollected(address indexed lpToken, uint256 feeAmount, uint256 veloRewardsTransferred);


    /**
     * 
     * @dev Configura los contratos de tokens, el router y el oracle
     * @param _itpToken direccion del token ITP
     * @param _veloToken direccion del token VELO
     * @param _router direccion del contrato Velodrome Router
     * @param _oracle direccion del contrato del oracle
     */
    constructor(address _itpToken, address _veloToken, address _router, address _oracle, address _owner) Ownable (_owner) {
        itpToken = IERC20(_itpToken);
        veloToken = IERC20(_veloToken);
        router = IVelodromeRouter(_router); 
        oracle = VeloOracle(_oracle);
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
     * @notice Reclama las recompensas VELO acumuladas en el gauge y las envia al dao.
     */
    function claimVeloOwner(address _lpToken) external nonReentrant onlyOwner{
        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");

        uint256 _rewards = gauge.earned(address(this));
        require(_rewards > 0, "No rewards available");

        gauge.getReward(address(this));
        IERC20(veloToken).safeTransfer(msg.sender, _rewards);
        emit ClaimRewards(msg.sender, _lpToken, _rewards);
    }





    /**
     * @notice Recupera comisiones acumuladas de un LP y las envia a una address en especifico
     */
    function getLpFeeAndVelo(address _lpToken, uint256 amount) external nonReentrant onlyOwner{
        require(amount <= lpFee[_lpToken], "Insufficient LP fee balance");

        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");

        gauge.withdraw(amount);
        lpFee[_lpToken] -= amount;
        IERC20(_lpToken).safeTransfer(msg.sender, amount);

        uint256 _rewards = gauge.earned(address(this));
        if(_rewards>0){
            gauge.getReward(address(this));
            IERC20(veloToken).safeTransfer(msg.sender, _rewards);
        }
        emit LpFeeCollected(_lpToken, amount,  _rewards);

    }

    /**
     * @notice Retira tokens ITP del contrato
     */
    function withdrawITP(uint256 _amount) external nonReentrant onlyOwner {
        require(_amount > 0, "Cannot withdraw 0 tokens");
        uint256 balanceItpContract = itpToken.balanceOf(address(this));
        require(_amount <= balanceItpContract, "Insufficient ITP balance in contract");

        uint256 totalPendingRewards = calculatePendingRewards();
        uint256 availableBalance = balanceItpContract - totalPendingRewards;
        require(_amount <= availableBalance, "Cannot withdraw more than available balance after pending rewards");



        itpToken.safeTransfer(msg.sender, _amount);
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
            gauges[_lpToken] = gauge;
            boostPercentage[_lpToken] = _boostPercentage;
            lpTokens.push(_lpToken);
            setRewardPool(_lpToken, gaugeReward);

            emit GaugeAdded(_lpToken, address(gauge), _boostPercentage);
        }
    }


    

    /**
     * @notice Configura la direccion del contrato Velodrome Router
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router address");
        router = IVelodromeRouter(_router);
        emit RouterUpdated(_router);
    }

    /**
     * @notice Configura la direccion del contrato Oracle
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = VeloOracle(_oracle);
        emit OracleUpdated(_oracle);
    }

    /**
     * @notice Configura el porcentaje de comisión para retiros
     * @param newFeePercentage Nuevo porcentaje de comisión (en base 1000)
     */
    function setFeePercentage(uint256 newFeePercentage ) external onlyOwner {
        require(newFeePercentage <= 10, "Fee percentage cannot exceed 1%");
        feePercentage = newFeePercentage;
        emit FeePercentageUpdated(newFeePercentage);
    }

    /**
     * @notice Configura el porcentaje de boost aplicado a las recompensas
     * @param newBoostPercentage Nuevo porcentaje de boost (en base 1000)
     */
    function setBoostPercentage(uint256 newBoostPercentage, address _lpToken) external onlyOwner {
        require(newBoostPercentage >= 50, "The boostReward must be at least 5%");
        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");
        boostPercentage[_lpToken] = newBoostPercentage;
        emit BoostPercentageUpdated(_lpToken, newBoostPercentage);
        }
    
    /**
     * @notice Funcion para asignar un maximo de recompensas en un Lp
     */

    function setRewardPool(address _lpToken, uint256 _rewardAmount) public onlyOwner {
        uint256 balanceItp= itpToken.balanceOf(address(this));
       
        require(balanceItp>=_rewardAmount, "The contract doesn't have enough tokens");
        require(address(gauges[_lpToken])!= address(0), "Gauge not registred for this Lp");
        rewardPools[_lpToken].totalRewards= _rewardAmount;
    }


       ///////////////////////////////////FUNCIONES PARA USUARIOS ///////////////////////////////////


    /**
     * @notice Deposito de LPtokens
     */
    function deposit(uint256 _amount, address _lpToken) external nonReentrant whenNotPaused  {
        require(_amount > 0, "Cannot deposit 0 tokens");
        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");

        uint256 totalPendingRewards= calculatePendingRewards();
        uint256 balanceItpContract = itpToken.balanceOf(address(this));
        require(balanceItpContract>totalPendingRewards, "Cannot withdraw more than available balance after pending rewards");

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
    function withdraw(uint256 _amount, address lpToken) external nonReentrant whenNotPaused {
        require(_amount > 0, "Cannot withdraw 0 tokens");

        IGauge gauge = gauges[lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");
        require(balanceOf[msg.sender][lpToken] >= _amount, "Insufficient balance");

        _updateRewards(msg.sender, lpToken);
        balanceOf[msg.sender][lpToken] -= _amount;

        gauge.withdraw(_amount);
        uint256 fee = (_amount * feePercentage) / 1000;
        lpFee[lpToken]+=fee;
        
        uint256 amount = _amount - fee;
        IERC20(lpToken).safeTransfer(msg.sender, amount);

        uint256 _rewards = rewards[msg.sender][lpToken];
        if (_rewards > 0) {
            uint256 boostreward = _rewardBoost(_rewards, lpToken);
            rewards[msg.sender][lpToken] = 0;
            itpToken.safeTransfer(msg.sender, boostreward);
        }

        emit Withdraw(msg.sender, lpToken, _amount);
    }
    
    /**
     * @notice Reclama recompensas de un gauge especifico.
     */


    function claimRewardITP(address _lpToken) external nonReentrant whenNotPaused{
        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");
        _updateRewards(msg.sender, _lpToken);
        
        uint256 _rewards = rewards[msg.sender][_lpToken];
        if (_rewards > 0) {
            uint256 boostreward = _rewardBoost(_rewards, _lpToken);

            RewardPool storage pool = rewardPools[_lpToken];
            pool.distributedRewards += boostreward;

            rewards[msg.sender][_lpToken] = 0;
            itpToken.safeTransfer(msg.sender, boostreward);
            emit ClaimRewardsUser(msg.sender, _lpToken , _rewards);
        }
    } 




    /**
     * @notice Calcula las recompensas acumuladas de un usuario para un LP especifico 
     * @return uint256 Cantidad de recompensas acumuladas
     */
     function earned(address _account, address lpToken) public view returns (uint256) {
        IGauge gauge = gauges[lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP");

        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken(); 
        uint256 userBalance = balanceOf[_account][lpToken];  

        // calculo de las recompensas acumuladas basado en el  balance del usuario 
        return (userBalance * (rewardPerTokenFromGauge - userRewardPerTokenPaid[_account][lpToken])) / 1e18 + rewards[_account][lpToken];
    }

    /**
     * @notice devuelve el balance de LP  de un usuario para un token específico
     */
    function balanceOfLp(address user, address lpToken) external view returns (uint256) {
        return balanceOf[user][lpToken];
    }

    /**
     * @notice devuelve las rewards en itp de cada  usuario para cada lp especifico 
     */
    function earnedItp(address _acount, address _lpToken) public view returns (uint256){
        IGauge gauge = gauges[_lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP");

       uint256 _rewardVelo= earned(_acount,_lpToken);
       uint256 _rewardItp= _rewardBoost(_rewardVelo, _lpToken);
       return _rewardItp;

    }


     /**
     * @notice muestra el BoostPercentage de un lp especifico
     */
    function viewBoostPercentage(address _lpToken) external  view returns (uint256) {
        IGauge gauge= gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");
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


    function emergencyWithdraw(address _lpToken) external nonReentrant whenPaused{
        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP");
        uint256 userBalance = balanceOf[msg.sender][_lpToken];
        require(userBalance > 0, "No balance to withdraw" );

        balanceOf[msg.sender][_lpToken]=0;

        gauge.withdraw(userBalance);
        IERC20(_lpToken).safeTransfer(msg.sender, userBalance);

        emit EmergencyWithdraw(msg.sender, _lpToken, userBalance);

    }

       ///////////////////////////////////FUNCIONES INTERNAS/////////////////////////////////////////

        /**
     * @notice Calcula las recompensas con boost adicional
     * @dev Esta funcion aplica un boost sobre las recompensas en VELO utilizando el Oracle y las tasas de los conectores.
     */
        function _rewardBoost(uint256 _veloAmount , address _lpToken) internal view returns (uint256 ) {
            
            IERC20[] memory connectors = new IERC20[](2) ;
            connectors[0] = IERC20(0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db); 
            connectors[1] = IERC20(0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0);

            uint256[] memory rates = oracle.getManyRatesWithConnectors(1, connectors); //llamada al oraculo para obtener el rate
            
            // aplica la tasa de conversion obtenida para calcular el valor final con boost
            uint256 baseValor = (_veloAmount * rates[0]) / 10**18; 
            uint _boostPercentage= boostPercentage[_lpToken];
            uint256 boostedValor = (baseValor * (1000 + _boostPercentage)) / 1000;


            return boostedValor;
        }

    /**
     * @notice Actualiza las recompensas acumuladas de un usuario para un LP, utiliza 
     * @dev Esta funcion se llama antes de cualquier acción de depósito o retiro, actualizando las recompensas no reclamadas
     */

    function _updateRewards(address _account, address lpToken) internal {
        IGauge gauge = gauges[lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP");

        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken(); 
        rewards[_account][lpToken] = earned(_account, lpToken);  
        userRewardPerTokenPaid[_account][lpToken] = rewardPerTokenFromGauge;  
    }

    /**
     * @notice Devuelve el total de recompensas en itp pendientes
     */

    function calculatePendingRewards() internal view returns (uint256 totalPendingRewards) {
    totalPendingRewards = 0;
    
    for (uint256 i = 0; i < lpTokens.length; i++) {
        address currentLpToken = lpTokens[i];
        IGauge gauge = gauges[currentLpToken];
        
        if (address(gauge) != address(0)) {
            uint256 veloRewards = gauge.earned(address(this));
            
            uint256 lpPendingRewards = _rewardBoost(veloRewards, currentLpToken);
            
            totalPendingRewards += lpPendingRewards;
        }
    }
}

}
