
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {console} from "forge-std/src/console.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }
    
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
}

interface ILiquidityPool {
    function approve(address spender, uint256 amount) external returns (bool);
    
    function addLiquidity(
        uint256 amountA,
        uint256 amountB,
        address to,
        uint256 deadline
    ) external returns (uint256 liquidity);

    function removeLiquidity(
        uint256 liquidity,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function token0() external view returns (address);
}

interface IStakingGauge {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getReward(address account) external;
    function balanceOf(address account) external view returns (uint256);
}

contract AutoCompoundVault {
    // Token addresses for USDC, ITP, and VELO on Optimism
    address public usdcToken = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85; // USDC token address
    address public itpToken = 0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0; // ITP token address (replace with actual)
    address public veloToken = 0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db; // VELO token address (replace with actual)

    // DEX Router (e.g., Velodrome or 1inch) and liquidity pool addresses
    address public dexRouter = 0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858; // Velodrome or 1inch router
    address public liquidityPool = 0xB84C932059A49e82C2c1bb96E29D59Ec921998Be; // ITP-USDC liquidity pool
    address public stakingGauge = 0x571E95563A6798C76144c8C5ed293406Ed81A437; // Velodrome staking gauge

    uint256 public totalShares; // Total shares in the vault representing all users' holdings
    mapping(address => uint256) public userShares; // Tracks user's proportional shares in the vault

    // Chainlink Keeper address for invoking auto-compounding
    address public chainlinkKeeper;

    // Modifier to restrict auto-compound function to Chainlink Keeper
    modifier onlyKeeper() {
        require(msg.sender == chainlinkKeeper, "Not authorized");
        _;
    }

    // Constructor to initialize the Chainlink Keeper
    constructor(address _chainlinkKeeper) {
        chainlinkKeeper = _chainlinkKeeper;
    }

    // Deposit function that swaps USDC to ITP, provides liquidity to the ITP-USDC pool, and stakes LP tokens
    function deposit(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be greater than 0");

        // Transfer USDC from the user to the vault
        IERC20(usdcToken).transferFrom(msg.sender, address(this), usdcAmount);

        // Swap half of the USDC to ITP
        uint256 halfUsdc = usdcAmount / 2;
        console.log("halfUsdc: ", halfUsdc);
        uint256 itpAmount = swapUSDCForITP(halfUsdc);
        console.log("itpAmount: ", itpAmount);

        // Add liquidity to the ITP-USDC pool
        uint256 liquidity = addLiquidity(halfUsdc, itpAmount);

        // Stake the LP tokens in the Velodrome staking gauge
        stakeInGauge(liquidity);

        // Calculate the user's share of the vault based on their contribution to the total pool
        uint256 shares = (totalShares == 0) ? liquidity : (liquidity * totalShares) / getTotalVaultValue();
        console.log("shares: ", shares);
        totalShares += shares;
        userShares[msg.sender] += shares;
    }

    // Withdraw function that allows the user to redeem their share of the vault
    function withdraw(uint256 shareAmount) external {
        require(userShares[msg.sender] >= shareAmount, "Not enough shares");

        // Calculate the amount of liquidity proportional to the user's shares
        uint256 liquidity = (shareAmount * getTotalVaultValue()) / totalShares;

        // Unstake the LP tokens from the staking gauge
        IStakingGauge(stakingGauge).withdraw(liquidity);

        // Remove liquidity from the ITP-USDC pool and get USDC and ITP back
        (uint256 usdcAmount, uint256 itpAmount) = removeLiquidity(liquidity);

        // Swap the ITP back to USDC
        uint256 usdcFromITP = swapITPForUSDC(itpAmount);

        // Return the total USDC to the user
        IERC20(usdcToken).transfer(msg.sender, usdcAmount + usdcFromITP);

        // Update the user's shares and total shares
        totalShares -= shareAmount;
        userShares[msg.sender] -= shareAmount;
    }

    // Auto-compound function to claim rewards and reinvest them in the vault (invoked by Chainlink Keeper)
    function autoCompound() external onlyKeeper {
        // Claim VELO rewards from the staking gauge
        IStakingGauge(stakingGauge).getReward(address(this));

        uint256 veloBalance = IERC20(veloToken).balanceOf(address(this));
        console.log("autoCompound(): veloBalance - ", veloBalance);
        if (veloBalance > 0) {
            // Swap VELO rewards into USDC and ITP
            (uint256 amountUsdc, uint256 amountItp) = getLiquiditySplitAmount(usdcToken, itpToken, veloBalance);
            uint256 usdcAmount = swapVELOForUSDC(amountUsdc);
            uint256 itpAmount = swapVELOForITP(amountItp);

            // Add liquidity to the ITP-USDC pool
            uint256 liquidity = addLiquidity(usdcAmount, itpAmount);
            console.log("autoCompound(): added liquidity - ", liquidity);
            
            // Stake the new LP tokens back in the staking gauge
            stakeInGauge(liquidity);

            // No change to shares, rewards are auto-compounded back into the pool
            // Each user's shares automatically reflect their new proportion of the pool
        }
    }

    function getLiquiditySplitAmount(address tokenB, address tokenC, uint256 amountA) internal view returns (uint256 amountToSwapB, uint256 amountToSwapC) {
        uint8 decimalsB = IERC20(tokenB).decimals();
        uint8 decimalsC = IERC20(tokenC).decimals();

        (uint112 reserve0, uint112 reserve1, ) = ILiquidityPool(liquidityPool).getReserves();

        uint256 priceBtoC = ILiquidityPool(liquidityPool).token0() == tokenB ? (uint256(reserve1) * 1e18) / uint256(reserve0) : (uint256(reserve0) * 1e18) / uint256(reserve1);

        uint256 adjustedPriceBtoC;

        if (decimalsB >= decimalsC) {
            adjustedPriceBtoC = priceBtoC * (10**(decimalsB - decimalsC));
        } else {
            adjustedPriceBtoC = priceBtoC / (10**(decimalsC - decimalsB));
        }

        amountToSwapB = (amountA * adjustedPriceBtoC) / (adjustedPriceBtoC + 1e18); // Amount to convert to B
        amountToSwapC = amountA - amountToSwapB;
    }

    // Internal function to swap USDC for ITP using the DEX router
    function swapUSDCForITP(uint256 usdcAmount) internal returns (uint256 itpAmount) {
        IRouter.Route[] memory routes = new IRouter.Route[](1);
        
        routes[0] = IRouter.Route({
            from: usdcToken,
            to: itpToken,
            stable: false,
            factory: address(0)
        });

        IERC20(usdcToken).approve(dexRouter, usdcAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            usdcAmount,
            0, // Accept any amount of ITP (adjust for slippage)
            routes,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of ITP obtained from the swap
    }

    // Internal function to swap ITP for USDC using the DEX router
    function swapITPForUSDC(uint256 itpAmount) internal returns (uint256 usdcAmount) {
        IRouter.Route[] memory routes = new IRouter.Route[](1);
        
        routes[0] = IRouter.Route({
            from: itpToken,
            to: usdcToken,
            stable: false,
            factory: address(0)
        });

        IERC20(itpToken).approve(dexRouter, itpAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            itpAmount,
            0, // Accept any amount of USDC (adjust for slippage)
            routes,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of USDC obtained from the swap
    }

    // Internal function to swap VELO for USDC
    function swapVELOForUSDC(uint256 veloAmount) internal returns (uint256 usdcAmount) {
        IRouter.Route[] memory routes = new IRouter.Route[](1);
        
        routes[0] = IRouter.Route({
            from: veloToken,
            to: usdcToken,
            stable: false,
            factory: address(0)
        });

        IERC20(veloToken).approve(dexRouter, veloAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            veloAmount,
            0, // Accept any amount of USDC
            routes,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of USDC obtained from the swap
    }

    // Internal function to swap VELO for ITP
    function swapVELOForITP(uint256 veloAmount) internal returns (uint256 itpAmount) {
        IRouter.Route[] memory routes = new IRouter.Route[](1);
        
        routes[0] = IRouter.Route({
            from: veloToken,
            to: itpToken,
            stable: false,
            factory: address(0)
        });

        IERC20(veloToken).approve(dexRouter, veloAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            veloAmount,
            0, // Accept any amount of ITP
            routes,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of ITP obtained from the swap
    }

    // Internal function to add liquidity to the ITP-USDC pool
    function addLiquidity(uint256 usdcAmount, uint256 itpAmount) internal returns (uint256 liquidity) {
        IERC20(usdcToken).approve(dexRouter, usdcAmount);
        IERC20(itpToken).approve(dexRouter, itpAmount);

        (, , liquidity) = IRouter(dexRouter).addLiquidity(
            usdcToken,
            itpToken,
            false,
            usdcAmount,
            itpAmount,
            0,
            0,
            address(this),
            block.timestamp + 600
        );
    }

    // Internal function to remove liquidity to the ITP-USDC pool
    function removeLiquidity(uint256 liquidity) internal returns (uint256 amountA, uint256 amountB) {
        ILiquidityPool(liquidityPool).approve(dexRouter, liquidity);

        (amountA, amountB) = IRouter(dexRouter).removeLiquidity(
            usdcToken,
            itpToken,
            false,
            liquidity,
            0,
            0,
            address(this),
            block.timestamp + 600
        );
    }

    // Internal function to stake LP tokens in the Velodrome gauge
    function stakeInGauge(uint256 liquidity) internal {
        IERC20(liquidityPool).approve(stakingGauge, liquidity);
        IStakingGauge(stakingGauge).deposit(liquidity);
    }

    // Helper function to calculate the total vault value (total liquidity + rewards)
    function getTotalVaultValue() public view returns (uint256) {
        // Get the total liquidity staked in the gauge (representing the vault's value)
        uint256 stakedLiquidity = IStakingGauge(stakingGauge).balanceOf(address(this));

        // Calculate the total vault value by adding staked liquidity and rewards (adjust to account for LP token value)
        return stakedLiquidity; // Adjust as needed to reflect rewards
    }
}
