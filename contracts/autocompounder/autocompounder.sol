
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface ILiquidityPool {
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
}

interface IStakingGauge {
    function stake(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getReward() external;
    function balanceOf(address account) external view returns (uint256);
}

contract AutoCompoundVault {
    // Token addresses for USDC, ITP, and VELO on Optimism
    address public usdcToken = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607; // USDC token address
    address public itpToken = 0xYourITPTokenAddressHere; // ITP token address (replace with actual)
    address public veloToken = 0xYourVELOTokenAddressHere; // VELO token address (replace with actual)

    // DEX Router (e.g., Velodrome or 1inch) and liquidity pool addresses
    address public dexRouter = 0x11111112542d85B3EF69AE05771c2dCCff4fAa26; // Velodrome or 1inch router
    address public liquidityPool = 0xYourLiquidityPoolAddressHere; // ITP-USDC liquidity pool
    address public stakingGauge = 0xYourStakingGaugeAddressHere; // Velodrome staking gauge

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
        uint256 itpAmount = swapUSDCForITP(halfUsdc);

        // Add liquidity to the ITP-USDC pool
        uint256 liquidity = addLiquidity(halfUsdc, itpAmount);

        // Stake the LP tokens in the Velodrome staking gauge
        stakeInGauge(liquidity);

        // Calculate the user's share of the vault based on their contribution to the total pool
        uint256 shares = (totalShares == 0) ? liquidity : (liquidity * totalShares) / getTotalVaultValue();
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
        (uint256 usdcAmount, uint256 itpAmount) = ILiquidityPool(liquidityPool).removeLiquidity(
            liquidity,
            address(this),
            block.timestamp + 600
        );

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
        IStakingGauge(stakingGauge).getReward();

        uint256 veloBalance = IERC20(veloToken).balanceOf(address(this));
        if (veloBalance > 0) {
            // Swap VELO rewards into USDC and ITP
            uint256 halfVelo = veloBalance / 2;
            uint256 usdcAmount = swapVELOForUSDC(halfVelo);
            uint256 itpAmount = swapVELOForITP(halfVelo);

            // Add liquidity to the ITP-USDC pool
            uint256 liquidity = addLiquidity(usdcAmount, itpAmount);

            // Stake the new LP tokens back in the staking gauge
            stakeInGauge(liquidity);

            // No change to shares, rewards are auto-compounded back into the pool
            // Each user's shares automatically reflect their new proportion of the pool
        }
    }

    // Internal function to swap USDC for ITP using the DEX router
    function swapUSDCForITP(uint256 usdcAmount) internal returns (uint256 itpAmount) {
        address[] memory path = new address[](2);
        path[0] = usdcToken;
        path[1] = itpToken;

        IERC20(usdcToken).approve(dexRouter, usdcAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            usdcAmount,
            0, // Accept any amount of ITP (adjust for slippage)
            path,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of ITP obtained from the swap
    }

    // Internal function to swap ITP for USDC using the DEX router
    function swapITPForUSDC(uint256 itpAmount) internal returns (uint256 usdcAmount) {
        address[] memory path = new address[](2);
        path[0] = itpToken;
        path[1] = usdcToken;

        IERC20(itpToken).approve(dexRouter, itpAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            itpAmount,
            0, // Accept any amount of USDC (adjust for slippage)
            path,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of USDC obtained from the swap
    }

    // Internal function to swap VELO for USDC
    function swapVELOForUSDC(uint256 veloAmount) internal returns (uint256 usdcAmount) {
        address[] memory path = new address[](2);
        path[0] = veloToken;
        path[1] = usdcToken;

        IERC20(veloToken).approve(dexRouter, veloAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            veloAmount,
            0, // Accept any amount of USDC
            path,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of USDC obtained from the swap
    }

    // Internal function to swap VELO for ITP
    function swapVELOForITP(uint256 veloAmount) internal returns (uint256 itpAmount) {
        address[] memory path = new address[](2);
        path[0] = veloToken;
        path[1] = itpToken;

        IERC20(veloToken).approve(dexRouter, veloAmount);

        uint256[] memory amountsOut = IRouter(dexRouter).swapExactTokensForTokens(
            veloAmount,
            0, // Accept any amount of ITP
            path,
            address(this),
            block.timestamp + 600
        );

        return amountsOut[1]; // Return the amount of ITP obtained from the swap
    }

    // Internal function to add liquidity to the ITP-USDC pool
    function addLiquidity(uint256 usdcAmount, uint256 itpAmount) internal returns (uint256 liquidity) {
        IERC20(usdcToken).approve(liquidityPool, usdcAmount);
        IERC20(itpToken).approve(liquidityPool, itpAmount);

        return ILiquidityPool(liquidityPool).addLiquidity(
            usdcAmount,
            itpAmount,
            address(this),
            block.timestamp + 600
        );
    }

    // Internal function to stake LP tokens in the Velodrome gauge
    function stakeInGauge(uint256 liquidity) internal {
        IERC20(liquidityPool).approve(stakingGauge, liquidity);
        IStakingGauge(stakingGauge).stake(liquidity);
    }

    // Helper function to calculate the total vault value (total liquidity + rewards)
    function getTotalVaultValue() public view returns (uint256) {
        // Get the total liquidity staked in the gauge (representing the vault's value)
        uint256 stakedLiquidity = IStakingGauge(stakingGauge).balanceOf(address(this));

        // Add any unclaimed VELO rewards (converted to their value in the pool) or other assets
        uint256 unclaimedVELO = IERC20(veloToken).balanceOf(address(this)); 

        // Calculate the total vault value by adding staked liquidity and rewards (adjust to account for LP token value)
        return stakedLiquidity; // Adjust as needed to reflect rewards
    }
}
