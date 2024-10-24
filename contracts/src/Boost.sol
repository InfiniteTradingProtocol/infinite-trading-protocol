// This is a preliminary version of the boost contract, additional testing and features are still needed



// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IGauge} from "./interfaces/IGauge.sol"; 

contract BoosterVeloLp is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable itpToken;  
    IERC20 public immutable veloToken;  

    uint256 public balanceITP;  

    // mappings anidados para manejar  varios lp 
    mapping(address => mapping(address => uint256)) public balanceOf;  
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  
    mapping(address => mapping(address => uint256)) public rewards;
    mapping(address=> uint256) public lpFee;

    // mappings para  cada LPtoken con su contrato Gauge
    mapping(address => IGauge) public gauges;

    event Deposit(address indexed user, address indexed lpToken, uint256 amount);
    event Withdraw(address indexed user, address indexed lpToken, uint256 amount);
    event ClaimRewards(address indexed user, address indexed lpToken, uint256 reward);

    constructor(address _itpToken, address _veloToken, uint  _balanceITP) {
        itpToken = IERC20(_itpToken);
        veloToken = IERC20(_veloToken); balanceITP= _balanceITP;
    }

    /// @notice actualiza las recompensas acumuladas para el usuario y el LP token
    function _updateRewards(address _account, address lpToken) internal {
        IGauge gauge = gauges[lpToken];  
        require(address(gauge) != address(0), "Gauge not registered for this LP token");

        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken();  // Usa el rewardPerToken del Gauge original
        rewards[_account][lpToken] = earned(_account, lpToken);  // Actualiza las recompensas pendientes para este LP
        userRewardPerTokenPaid[_account][lpToken] = rewardPerTokenFromGauge;  
    }

    /// @notice calcula cuantas recompensas ha ganado el usuario hasta el momento
    /// @dev utilizo el valor de `rewardPerToken()` del Gauge original de Velodrome.
    function earned(address _account, address lpToken) public view returns (uint256) {
        IGauge gauge = gauges[lpToken];  // obtener el Gauge correspondiente al LP token
        require(address(gauge) != address(0), "Gauge not registered for this LP token");

        uint256 rewardPerTokenFromGauge = gauge.rewardPerToken(); 
        uint256 userBalance = balanceOf[_account][lpToken];  // Balance del usuario en tokens LP

        // calculo de las recompensas acumuladas basado en el  balance del usuario 
        return (userBalance * (rewardPerTokenFromGauge - userRewardPerTokenPaid[_account][lpToken])) / 1e18 + rewards[_account][lpToken];
    }

    /// @notice Permite a los usuarios depositar tokens LP para hacer staking en tu contrato y en el Gauge correspondiente
  
        function deposit(uint256 _amount, address lpToken) external nonReentrant {
            require(_amount > 0, "Cannot deposit 0 tokens");
            IGauge gauge = gauges[lpToken];
            require(address(gauge) != address(0), "Gauge not registered for this LP token");


            // obtener el Gauge correspondiente para este LP token
            IERC20(lpToken).safeTransferFrom(msg.sender, address(this), _amount);

            // transferir los LP tokens del usuario a tu contrato booster
            _updateRewards(msg.sender, lpToken);  // Actualiza las recompensas antes del cambio de balance

            IERC20(lpToken).safeIncreaseAllowance(address(gauge), _amount);

            // realiza el stake de los LP tokens en el contrato Gauge
            gauge.deposit(_amount);

            // actualiza el balance del usuario para este LP token
            balanceOf[msg.sender][lpToken] += _amount;

            emit Deposit(msg.sender, lpToken, _amount);
        }

    /// @notice Permite a los usuarios retirar sus tokens LP y reclamar sus recompensas.

    function withdraw(uint256 _amount, address lpToken) external nonReentrant {
        require(_amount > 0, "Cannot withdraw 0 tokens");

        IGauge gauge = gauges[lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP token");

        require(balanceOf[msg.sender][lpToken] >= _amount, "Insufficient balance");

        _updateRewards(msg.sender, lpToken);  // actualiza las recompensas antes del retiro

        balanceOf[msg.sender][lpToken] -= _amount;  // actualiza el balance del usuario para este LP

        // Se resta el %0.1 de la cantidad depositada 
            uint256 fee = (_amount * 1) / 1000; 
 
            uint256 amount = _amount - fee;

        gauge.withdraw(amount);
        IERC20(lpToken).safeTransfer(msg.sender,amount);  // regreso los lp al usuario

        lpFee[lpToken]+=fee;

        ///aca va a ir logica para manejar el %20 mas en $ITP al usuario
       
            }


    /**
     * @notice permite al owner reclamar las recompensas generadas en VELO para un LP token 
     */


    function claimVeloOwner(address _lpToken, address recipient) external onlyOwner nonReentrant {
    IGauge gauge = gauges[_lpToken];
    require(address(gauge) != address(0), "Gauge not registered for this LP token");

    uint256 _rewards = gauge.earned(address(this));
    require(_rewards > 0, "No rewards available");

    gauge.getReward(address(this));
    IERC20(veloToken).safeTransfer(recipient, _rewards);
    }

    /**
     * @notice Permite al owner extraer una cantidad específica de LP fees acumulados
     */

    function getLpFee (address _lpToken, address recipent, uint256 amount) external onlyOwner nonReentrant {

        require(amount <= lpFee[_lpToken], "Insufficient LP fee balance");

        IGauge gauge = gauges[_lpToken];
        require(address(gauge) != address(0), "Gauge not registered for this LP token");

        gauge.withdraw(amount);
        lpFee[_lpToken] -= amount;


        IERC20(_lpToken).safeTransfer(recipent, amount);

    }

        function withdrawITP(uint256 _amount, address _recipient) external onlyOwner nonReentrant {
        require(_amount > 0, "Cannot withdraw 0 tokens");
        require(_amount <= balanceITP, "Insufficient ITP balance in contract");

        itpToken.safeTransfer(_recipient, _amount);

        balanceITP -= _amount;

        }

        function changeItpBalance(uint256 _amount) onlyOwner external  {
        require(_amount > 0);
        balanceITP+= balanceITP;
        }


}
