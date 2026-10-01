// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// OZ >=5.5 guard is stateless and uses the same ERC-7201 slot as the deployed ReentrancyGuardUpgradeable.
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "./interfaces/ISolidlyRouter.sol";
import "./interfaces/ISolidlyPair.sol";
import "./interfaces/IVelodromeGauge.sol";
import "./interfaces/IITP.sol";

interface IPoolFactory {
    function getFee(address pool, bool stable) external view returns (uint256);
}

interface IVoter {
    function isAlive(address gauge) external view returns (bool);
}

/// @dev Beacon implementation: storage layout must stay identical to the deployed one; append only.
/// UUPSUpgradeable was dropped: it holds no storage and upgradeToAndCall always reverted behind a BeaconProxy.
contract InfiniteVaultStrategy is ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuard, PausableUpgradeable {
    using SafeERC20 for IERC20;

    struct FeeCategory {
        uint256 total;
        uint256 infinite;
        uint256 call;
        uint256 burn;
        string label;
        bool active;
    }

    address public want;
    address public native;
    address public output;
    address public lpToken0;
    address public lpToken1;

    address public gauge;
    address public unirouter;
    address public factory;

    bool public stable;
    // Inverted meaning of the legacy `harvestOnDeposit` slot so every existing vault (all stored false) is enabled.
    bool private harvestOnDepositDisabled;
    uint256 public lastHarvest;
    uint256 public withdrawalFee;
    uint256 public slippageTolerance;
    uint256 public swapDeadline;
    
    uint256 public constant WITHDRAWAL_MAX = 10000;
    uint256 public constant DIVISOR = 1 ether;
    uint256 public constant MAX_FEE = 500 * 1e15;
    uint256 public constant MAX_WITHDRAWAL_FEE = 500;
    uint256 public constant SLIPPAGE_DIVISOR = 10000;
    uint256 public constant MAX_TWAP_DEVIATION = 300;
    uint256 public constant TWAP_GRANULARITY = 2;
    /// @dev Max share of the pair's reserve sold by one zap; ITP pools are thin.
    uint256 public constant MAX_ZAP_BPS = 50;
    uint256 public constant ZAP_COOLDOWN = 1 hours;
    uint256 public constant MIN_SHARES = 1000;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    FeeCategory public feeCategory;
    address public infiniteFeeRecipient;

    ISolidlyRouter.Route[] public outputToNativeRoute;
    ISolidlyRouter.Route[] public outputToLp0Route;
    ISolidlyRouter.Route[] public outputToLp1Route;

    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event ChargedFees(uint256 callFees, uint256 infiniteFees, uint256 burnedFees);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient);
    event FeeCategoryChanged(uint256 total, uint256 infinite, uint256 call, uint256 burn);
    event WithdrawalFeeChanged(uint256 oldFee, uint256 newFee);
    event SlippageToleranceChanged(uint256 oldTolerance, uint256 newTolerance);
    event SwapFailed(address indexed tokenIn, uint256 amountIn);
    event AddLiquidityFailed(uint256 amount0, uint256 amount1);
    event LiquidityDeferred();
    event GetRewardFailed();
    event EarnFailed(uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _want,
        address _gauge,
        address _unirouter,
        address _infiniteFeeRecipient,
        string memory _name,
        string memory _symbol,
        ISolidlyRouter.Route[] calldata _outputToNativeRoute,
        ISolidlyRouter.Route[] calldata _outputToLp0Route,
        ISolidlyRouter.Route[] calldata _outputToLp1Route
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Ownable_init(msg.sender);
        __Pausable_init();


        require(_want != address(0), "Invalid want address");
        require(_gauge != address(0), "Invalid gauge address");
        require(_unirouter != address(0), "Invalid router address");
        require(_infiniteFeeRecipient != address(0), "Invalid fee recipient");
        require(_outputToNativeRoute.length > 0, "Invalid native route");

        want = _want;
        gauge = _gauge;
        unirouter = _unirouter;
        infiniteFeeRecipient = _infiniteFeeRecipient;

        factory = ISolidlyRouter(unirouter).defaultFactory();
        stable = ISolidlyPair(want).stable();

        _setupRoutes(_outputToNativeRoute, _outputToLp0Route, _outputToLp1Route);

        feeCategory = FeeCategory({
            total: 100 * 1e15,
            infinite: 700 * 1e15,
            call: 100 * 1e15,
            burn: 200 * 1e15,
            label: "Default",
            active: true
        });

        withdrawalFee = 10;
        slippageTolerance = 50;
        swapDeadline = 300;

        _giveAllowances();
    }

    function _setupRoutes(
        ISolidlyRouter.Route[] calldata _outputToNativeRoute,
        ISolidlyRouter.Route[] calldata _outputToLp0Route,
        ISolidlyRouter.Route[] calldata _outputToLp1Route
    ) internal {
        for (uint i; i < _outputToNativeRoute.length; ++i) {
            outputToNativeRoute.push(_outputToNativeRoute[i]);
        }

        output = outputToNativeRoute[0].from;
        native = outputToNativeRoute[outputToNativeRoute.length - 1].to;

        address token0 = ISolidlyPair(want).token0();
        address token1 = ISolidlyPair(want).token1();

        if (_outputToLp0Route.length > 0) {
            for (uint i; i < _outputToLp0Route.length; ++i) {
                outputToLp0Route.push(_outputToLp0Route[i]);
            }
            lpToken0 = outputToLp0Route[outputToLp0Route.length - 1].to;
            require(lpToken0 == token0 || lpToken0 == token1, "Bad LP0 route");
        } else {
            require(output == token0 || output == token1, "Bad LP0 route");
            lpToken0 = output;
        }

        if (_outputToLp1Route.length > 0) {
            for (uint i; i < _outputToLp1Route.length; ++i) {
                outputToLp1Route.push(_outputToLp1Route[i]);
            }
            lpToken1 = outputToLp1Route[outputToLp1Route.length - 1].to;
            require(lpToken1 == token0 || lpToken1 == token1, "Bad LP1 route");
        } else {
            require(output == token0 || output == token1, "Bad LP1 route");
            lpToken1 = output;
        }

        require(lpToken0 != lpToken1, "Bad LP tokens");

        if (lpToken0 != token0) {
            address temp = lpToken0;
            lpToken0 = lpToken1;
            lpToken1 = temp;
        }

        require(lpToken0 == token0 && lpToken1 == token1, "Bad LP tokens");
    }

    function balance() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this)) + balanceOfPool();
    }

    function available() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    function getPricePerFullShare() public view returns (uint256) {
        return totalSupply() == 0 ? 1e18 : balance() * 1e18 / totalSupply();
    }

    function depositAll() external {
        deposit(IERC20(want).balanceOf(msg.sender));
    }

    function deposit(uint256 _amount) public nonReentrant whenNotPaused {
        require(_amount > 0, "Cannot deposit 0");

        // Harvest before pricing shares so the depositor can't capture pending rewards.
        if (!harvestOnDepositDisabled) {
            _harvest(msg.sender);
        }

        uint256 _pool = balance();
        uint256 _before = IERC20(want).balanceOf(address(this));
        
        IERC20(want).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 _after = IERC20(want).balanceOf(address(this));
        _amount = _after - _before;
        
        require(_amount > 0, "No tokens received");

        uint256 shares = 0;
        if (totalSupply() == 0) {
            require(_amount > MIN_SHARES, "Deposit too small");
            // Permanently locked shares block first-depositor share inflation.
            _mint(DEAD, MIN_SHARES);
            shares = _amount - MIN_SHARES;
        } else {
            shares = (_amount * totalSupply()) / _pool;
        }
        require(shares > 0, "Zero shares");
        
        _earn();
        _mint(msg.sender, shares);
        
        emit Deposit(balance());
    }

    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    function withdraw(uint256 _shares) public nonReentrant {
        require(_shares > 0, "Cannot withdraw 0");
        require(_shares <= balanceOf(msg.sender), "Insufficient shares");

        if (!harvestOnDepositDisabled && !paused()) {
            _harvest(msg.sender);
        }

        uint256 r = (balance() * _shares) / totalSupply();
        _burn(msg.sender, _shares);

        uint256 b = IERC20(want).balanceOf(address(this));
        if (b < r) {
            uint256 _withdraw = r - b;
            _withdrawFromGauge(_withdraw);
            uint256 _after = IERC20(want).balanceOf(address(this));
            uint256 _diff = _after - b;
            if (_diff < _withdraw) {
                r = b + _diff;
            }
        }

        if (msg.sender != owner() && !paused() && withdrawalFee > 0) {
            uint256 withdrawalFeeAmount = r * withdrawalFee / WITHDRAWAL_MAX;
            r = r - withdrawalFeeAmount;
        }

        IERC20(want).safeTransfer(msg.sender, r);
        emit Withdraw(balance());
    }

    function _earn() internal {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        if (wantBal > 0 && gaugeAlive()) {
            IVelodromeGauge(gauge).deposit(wantBal, address(this));
        }
    }

    /// @dev Harvest-path variant: a killed gauge must not block harvest-before-withdraw.
    function _tryEarn() internal {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        if (wantBal > 0) {
            try IVelodromeGauge(gauge).deposit(wantBal, address(this)) {} catch {
                emit EarnFailed(wantBal);
            }
        }
    }

    function _withdrawFromGauge(uint256 _amount) internal {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        if (wantBal < _amount) {
            IVelodromeGauge(gauge).withdraw(_amount - wantBal);
        }
    }

    function harvest() external nonReentrant whenNotPaused {
        _harvest(msg.sender);
    }

    /// @notice Use this from Multicall3/batchers so the call fee goes to `callFeeRecipient`, not the batcher.
    function harvest(address callFeeRecipient) external nonReentrant whenNotPaused {
        require(callFeeRecipient != address(0), "Invalid fee recipient");
        _harvest(callFeeRecipient);
    }

    /// @dev Never reverts on external failures, because deposit() and withdraw() call it.
    function _harvest(address callFeeRecipient) internal {
        bool alive = gaugeAlive();
        if (alive) {
            try IVelodromeGauge(gauge).getReward(address(this)) {} catch {
                emit GetRewardFailed();
            }
        } else {
            // Killed gauge pays no emissions and keeps the swap fees; hold LP unstaked and earn the fees instead.
            uint256 staked = balanceOfPool();
            if (staked > 0) {
                try IVelodromeGauge(gauge).withdraw(staked) {} catch {}
            }
            try ISolidlyPair(want).claimFees() {} catch {}
        }

        if (IERC20(output).balanceOf(address(this)) > 0) {
            _chargeFees(callFeeRecipient);
        }
        uint256 wantBefore = IERC20(want).balanceOf(address(this));
        // Runs even without new rewards so idle pair tokens from earlier harvests get deployed.
        _addLiquidity();

        uint256 wantHarvested = IERC20(want).balanceOf(address(this)) - wantBefore;
        if (alive) _tryEarn();
        if (wantHarvested > 0) {
            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balance());
        }
    }

    /// @notice False once Velodrome kills the gauge; the vault then holds its LP unstaked.
    function gaugeAlive() public view returns (bool) {
        try IVelodromeGauge(gauge).voter() returns (address voter) {
            try IVoter(voter).isAlive(gauge) returns (bool alive) {
                return alive;
            } catch {}
        } catch {}
        return true;
    }

    function _chargeFees(address callFeeRecipient) internal {
        if (!feeCategory.active || feeCategory.total == 0) return;

        uint256 toNative = IERC20(output).balanceOf(address(this)) * feeCategory.total / DIVISOR;

        if (toNative > 0) {
            uint256 before = IERC20(native).balanceOf(address(this));

            uint256 expectedOut;
            try ISolidlyRouter(unirouter).getAmountsOut(toNative, outputToNativeRoute) returns (uint256[] memory amounts) {
                expectedOut = amounts[amounts.length - 1];
            } catch {
                return;
            }

            uint256 minOut = expectedOut * (SLIPPAGE_DIVISOR - slippageTolerance) / SLIPPAGE_DIVISOR;

            try ISolidlyRouter(unirouter).swapExactTokensForTokens(
                toNative, minOut, outputToNativeRoute, address(this), block.timestamp + swapDeadline
            ) {
                uint256 nativeBal = IERC20(native).balanceOf(address(this)) - before;
                uint256 totalFeeShares = feeCategory.call + feeCategory.infinite + feeCategory.burn;

                if (nativeBal > 0 && totalFeeShares > 0) {
                    uint256 callFeeAmount = nativeBal * feeCategory.call / totalFeeShares;
                    uint256 infiniteFeeAmount = nativeBal * feeCategory.infinite / totalFeeShares;
                    uint256 burnFeeAmount = nativeBal * feeCategory.burn / totalFeeShares;

                    if (callFeeAmount > 0) {
                        IERC20(native).safeTransfer(callFeeRecipient, callFeeAmount);
                    }
                    if (infiniteFeeAmount > 0) {
                        IERC20(native).safeTransfer(infiniteFeeRecipient, infiniteFeeAmount);
                    }
                    if (burnFeeAmount > 0) {
                        try IITP(native).burn(burnFeeAmount) {
                            // Burn successful
                        } catch {
                            // If burn fails, send to infiniteFeeRecipient as fallback
                            IERC20(native).safeTransfer(infiniteFeeRecipient, burnFeeAmount);
                        }
                    }

                    emit ChargedFees(callFeeAmount, infiniteFeeAmount, burnFeeAmount);
                }
            } catch {
                emit SwapFailed(output, toNative);
                return;
            }
        }
    }

    function _addLiquidity() internal {
        if (!_isPoolPriceSane()) {
            emit LiquidityDeferred();
            return;
        }

        uint256 outputBal = IERC20(output).balanceOf(address(this));
        if (outputBal > 0) {
            uint256 lp0Amt = _rewardSplit0(outputBal);
            if (lpToken0 != output && lp0Amt > 0) _swap(lp0Amt, outputToLp0Route);
            if (lpToken1 != output && outputBal > lp0Amt) _swap(outputBal - lp0Amt, outputToLp1Route);
        }

        _addBalancedLiquidity();
        if (block.timestamp >= lastHarvest + ZAP_COOLDOWN && _zapExcess()) {
            _addBalancedLiquidity();
        }
    }

    /// @dev Reward amount to route to lpToken0 so that, together with idle balances, both sides land on the pool ratio.
    function _rewardSplit0(uint256 outputBal) internal view returns (uint256) {
        uint256 q0 = lpToken0 == output ? outputBal : _getAmountOut(outputBal, outputToLp0Route);
        uint256 q1 = lpToken1 == output ? outputBal : _getAmountOut(outputBal, outputToLp1Route);
        // A dead route: send everything to the side that works; _zapExcess converts it via the pair.
        if (q0 == 0 && q1 == 0) return outputBal / 2;
        if (q1 == 0) return outputBal;
        if (q0 == 0) return 0;

        uint256 idle0 = IERC20(lpToken0).balanceOf(address(this)) - (lpToken0 == output ? outputBal : 0);
        uint256 idle1 = IERC20(lpToken1).balanceOf(address(this)) - (lpToken1 == output ? outputBal : 0);
        (uint256 reserve0, uint256 reserve1,) = ISolidlyPair(want).getReserves();

        // f = (R0*(idle1+q1) - R1*idle0) / (R1*q0 + R0*q1), clamped to [0, 1]
        uint256 plus = reserve0 * (idle1 + q1);
        uint256 minus = reserve1 * idle0;
        if (plus <= minus) return 0;
        uint256 den = reserve1 * q0 + reserve0 * q1;
        if (plus - minus >= den) return outputBal;
        return Math.mulDiv(outputBal, plus - minus, den);
    }

    /// @dev Deposits the largest pool-ratio-matched amounts; min amounts derive from the quote, not raw balances.
    function _addBalancedLiquidity() internal {
        uint256 bal0 = IERC20(lpToken0).balanceOf(address(this));
        uint256 bal1 = IERC20(lpToken1).balanceOf(address(this));
        if (bal0 == 0 || bal1 == 0) return;

        (uint256 amt0, uint256 amt1) = _quoteAddLiquidity(bal0, bal1);
        if (amt0 == 0 || amt1 == 0) return;

        try ISolidlyRouter(unirouter).addLiquidity(
            lpToken0,
            lpToken1,
            stable,
            amt0,
            amt1,
            _applySlippage(amt0),
            _applySlippage(amt1),
            address(this),
            block.timestamp + swapDeadline
        ) {} catch {
            emit AddLiquidityFailed(amt0, amt1);
        }
    }

    /// @dev Swaps part of the one-sided leftover through the pair itself so it can be deposited.
    function _zapExcess() internal returns (bool) {
        uint256 bal0 = IERC20(lpToken0).balanceOf(address(this));
        uint256 bal1 = IERC20(lpToken1).balanceOf(address(this));
        if (bal0 == 0 && bal1 == 0) return false;

        uint256 used0;
        uint256 used1;
        if (bal0 > 0 && bal1 > 0) {
            (used0, used1) = _quoteAddLiquidity(bal0, bal1);
            if (used0 == 0 && used1 == 0) return false;
        }

        bool zeroForOne = bal0 > used0;
        uint256 excess = zeroForOne ? bal0 - used0 : bal1 - used1;
        if (excess == 0) return false;

        (uint256 reserve0, uint256 reserve1,) = ISolidlyPair(want).getReserves();
        uint256 reserveIn = zeroForOne ? reserve0 : reserve1;
        uint256 amountIn = Math.min(_zapSwapAmount(excess, reserveIn), reserveIn * MAX_ZAP_BPS / SLIPPAGE_DIVISOR);
        if (amountIn == 0) return false;

        ISolidlyRouter.Route[] memory route = new ISolidlyRouter.Route[](1);
        route[0] = ISolidlyRouter.Route({
            from: zeroForOne ? lpToken0 : lpToken1,
            to: zeroForOne ? lpToken1 : lpToken0,
            stable: stable,
            factory: factory
        });
        return _swap(amountIn, route);
    }

    /// @dev Optimal single-sided zap for x*y=k: s = (sqrt(r(r(2-f)^2 + 4(1-f)E)) - r(2-f)) / (2(1-f)).
    function _zapSwapAmount(uint256 excess, uint256 reserveIn) internal view returns (uint256) {
        if (stable || reserveIn == 0) return excess / 2;

        uint256 fee = _poolFee();
        uint256 a = 20_000 - fee;
        uint256 b = 10_000 - fee;
        return (Math.sqrt(reserveIn * (reserveIn * a * a + 40_000 * b * excess)) - reserveIn * a) / (2 * b);
    }

    function _poolFee() internal view returns (uint256) {
        try IPoolFactory(factory).getFee(want, stable) returns (uint256 f) {
            if (f < 1000) return f;
        } catch {}
        return 30;
    }

    function _quoteAddLiquidity(uint256 bal0, uint256 bal1) internal view returns (uint256, uint256) {
        try ISolidlyRouter(unirouter).quoteAddLiquidity(lpToken0, lpToken1, stable, factory, bal0, bal1) returns (
            uint256 amt0, uint256 amt1, uint256
        ) {
            return (amt0, amt1);
        } catch {
            return (0, 0);
        }
    }

    function _swap(uint256 amountIn, ISolidlyRouter.Route[] memory route) internal returns (bool) {
        uint256 expectedOut = _getAmountOut(amountIn, route);
        if (expectedOut == 0) return false;

        try ISolidlyRouter(unirouter).swapExactTokensForTokens(
            amountIn, _applySlippage(expectedOut), route, address(this), block.timestamp + swapDeadline
        ) {
            return true;
        } catch {
            emit SwapFailed(route[0].from, amountIn);
            return false;
        }
    }

    function _applySlippage(uint256 amount) internal view returns (uint256) {
        return amount * (SLIPPAGE_DIVISOR - slippageTolerance) / SLIPPAGE_DIVISOR;
    }

    /// @dev harvest() is permissionless, so refuse to trade/deposit while the pair's spot price is off its TWAP.
    function _isPoolPriceSane() internal view returns (bool) {
        (uint256 reserve0,,) = ISolidlyPair(want).getReserves();
        uint256 amountIn = reserve0 / 1000;
        if (amountIn == 0) return false;

        uint256 spot;
        try ISolidlyPair(want).getAmountOut(amountIn, lpToken0) returns (uint256 out) {
            spot = out;
        } catch {
            return false;
        }

        try ISolidlyPair(want).quote(lpToken0, amountIn, TWAP_GRANULARITY) returns (uint256 twap) {
            // quote() excludes the swap fee that getAmountOut() charges.
            twap = twap * (SLIPPAGE_DIVISOR - _poolFee()) / SLIPPAGE_DIVISOR;
            if (twap == 0) return false;
            uint256 diff = spot > twap ? spot - twap : twap - spot;
            return diff * SLIPPAGE_DIVISOR <= twap * MAX_TWAP_DEVIATION;
        } catch {
            return false;
        }
    }

    function _getAmountOut(uint256 amountIn, ISolidlyRouter.Route[] memory route) internal view returns (uint256) {
        if (route.length == 0 || amountIn == 0) return 0;

        try ISolidlyRouter(unirouter).getAmountsOut(amountIn, route) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    function balanceOfPool() public view returns (uint256) {
        return IVelodromeGauge(gauge).balanceOf(address(this));
    }

    function rewardsAvailable() public view returns (uint256) {
        return IVelodromeGauge(gauge).earned(address(this));
    }

    function callReward() public view returns (uint256) {
        uint256 outputBal = rewardsAvailable();
        if (outputBal == 0 || !feeCategory.active) return 0;
        
        uint256 nativeOut;
        try ISolidlyRouter(unirouter).getAmountsOut(outputBal, outputToNativeRoute) returns (uint256[] memory amounts) {
            nativeOut = amounts[amounts.length - 1];
        } catch {
            return 0;
        }
        
        uint256 totalFeesInNative = nativeOut * feeCategory.total / DIVISOR;
        uint256 totalFeeShares = feeCategory.call + feeCategory.infinite + feeCategory.burn;
        
        if (totalFeeShares == 0) return 0;
        
        return totalFeesInNative * feeCategory.call / totalFeeShares;
    }

    function harvestOnDeposit() external view returns (bool) {
        return !harvestOnDepositDisabled;
    }

    /// @notice Also controls the harvest that runs before withdraw().
    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyOwner {
        harvestOnDepositDisabled = !_harvestOnDeposit;
    }

    function setWithdrawalFee(uint256 _withdrawalFee) external onlyOwner {
        require(_withdrawalFee <= MAX_WITHDRAWAL_FEE, "Withdrawal fee too high");
        uint256 oldFee = withdrawalFee;
        withdrawalFee = _withdrawalFee;
        emit WithdrawalFeeChanged(oldFee, _withdrawalFee);
    }

    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high");
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _slippageTolerance;
        emit SlippageToleranceChanged(oldTolerance, _slippageTolerance);
    }

    function setSwapDeadline(uint256 _swapDeadline) external onlyOwner {
        require(_swapDeadline >= 60 && _swapDeadline <= 3600, "Bad deadline");
        swapDeadline = _swapDeadline;
    }

    function setFeeCategory(
        uint256 _total,
        uint256 _infinite,
        uint256 _call,
        uint256 _burn,
        string memory _label
    ) external onlyOwner {
        require(_total <= MAX_FEE, "Total fee too high");
        require(_infinite + _call + _burn == DIVISOR, "Fee splits must sum to 100%");

        feeCategory = FeeCategory(_total, _infinite, _call, _burn, _label, true);
        emit FeeCategoryChanged(_total, _infinite, _call, _burn);
    }

    function setInfiniteFeeRecipient(address _infiniteFeeRecipient) external onlyOwner {
        require(_infiniteFeeRecipient != address(0), "Invalid fee recipient");
        address oldRecipient = infiniteFeeRecipient;
        infiniteFeeRecipient = _infiniteFeeRecipient;
        emit FeeRecipientChanged(oldRecipient, _infiniteFeeRecipient);
    }


    function panic() public onlyOwner {
        pause();
        IVelodromeGauge(gauge).withdraw(balanceOfPool());
    }

    function pause() public onlyOwner {
        _pause();
        _removeAllowances();
    }

    function unpause() external onlyOwner {
        _unpause();
        _giveAllowances();
        _tryEarn();
    }

    function inCaseTokensGetStuck(address _token) external onlyOwner {
        require(_token != want, "Cannot withdraw want token");
        require(_token != address(this), "Cannot withdraw vault token");
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount > 0) {
            IERC20(_token).safeTransfer(msg.sender, amount);
        }
    }

    function _giveAllowances() internal {
        IERC20(want).forceApprove(gauge, type(uint256).max);
        IERC20(output).forceApprove(unirouter, type(uint256).max);
        IERC20(lpToken0).forceApprove(unirouter, type(uint256).max);
        IERC20(lpToken1).forceApprove(unirouter, type(uint256).max);
    }

    function _removeAllowances() internal {
        IERC20(want).forceApprove(gauge, 0);
        IERC20(output).forceApprove(unirouter, 0);
        IERC20(lpToken0).forceApprove(unirouter, 0);
        IERC20(lpToken1).forceApprove(unirouter, 0);
    }
}