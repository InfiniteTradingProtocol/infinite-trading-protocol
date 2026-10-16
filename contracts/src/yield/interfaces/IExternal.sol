// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal external protocol interfaces used by the yield vault adapters and rate readers (Base mainnet).

interface IComet {
    function baseToken() external view returns (address);
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getUtilization() external view returns (uint256);
    function getSupplyRate(uint256 utilization) external view returns (uint64);
}

interface IAaveV3Pool {
    struct ReserveConfigurationMap {
        uint256 data;
    }

    struct ReserveDataLegacy {
        ReserveConfigurationMap configuration;
        uint128 liquidityIndex;
        uint128 currentLiquidityRate;
        uint128 variableBorrowIndex;
        uint128 currentVariableBorrowRate;
        uint128 currentStableBorrowRate;
        uint40 lastUpdateTimestamp;
        uint16 id;
        address aTokenAddress;
        address stableDebtTokenAddress;
        address variableDebtTokenAddress;
        address interestRateStrategyAddress;
        uint128 accruedToTreasury;
        uint128 unbacked;
        uint128 isolationModeTotalDebt;
    }

    function getReserveData(address asset) external view returns (ReserveDataLegacy memory);
}

interface IFluidLendingResolver {
    struct UserSupplyData {
        bool modeWithInterest;
        uint256 supply;
        uint256 withdrawalLimit;
        uint256 lastUpdateTimestamp;
        uint256 expandPercent;
        uint256 expandDuration;
        uint256 baseWithdrawalLimit;
        uint256 withdrawableUntilLimit;
        uint256 withdrawable;
        uint256 decayEndTimestamp;
        uint256 decayAmount;
    }

    struct FTokenDetails {
        address tokenAddress;
        bool eip2612Deposits;
        bool isNativeUnderlying;
        string name;
        string symbol;
        uint256 decimals;
        address asset;
        uint256 totalAssets;
        uint256 totalSupply;
        uint256 convertToShares;
        uint256 convertToAssets;
        uint256 rewardsRate; // 1e12 = 1%
        uint256 supplyRate; // 1e2 = 1%
        int256 rebalanceDifference;
        UserSupplyData liquidityUserSupplyData;
    }

    function getFTokenDetails(address fToken) external view returns (FTokenDetails memory);
}

type Id is bytes32;

struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
    uint128 fee;
}

interface IMorphoBlue {
    function market(Id id) external view returns (Market memory);
    function idToMarketParams(Id id) external view returns (MarketParams memory);
    function position(Id id, address user)
        external
        view
        returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral);
}

interface IIrm {
    function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
}

interface IMetaMorpho {
    function MORPHO() external view returns (address);
    function fee() external view returns (uint96);
    function withdrawQueueLength() external view returns (uint256);
    function withdrawQueue(uint256 index) external view returns (Id);
}
