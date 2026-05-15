// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ─────────────────────────────────────────────────────────────────────────────
//  UniV3AutoCompounder
//  Infinite Trading DAO  ·  https://infinitetrading.io
//
//  Collects LP fees from a Uniswap V3 position, rebalances them to the correct
//  token ratio for the position's tick range, then re-adds them as liquidity.
// ─────────────────────────────────────────────────────────────────────────────

// ─── External interfaces ─────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// @notice Minimal interface for Uniswap V3 NonfungiblePositionManager
interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external
        payable
        returns (uint128 liquidity, uint256 amount0, uint256 amount1);

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice Minimal interface for Uniswap V3 SwapRouter02
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @notice Minimal interface to read current price from a Uniswap V3 pool
interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    /// @notice Returns tick cumulatives and liquidity cumulatives at specified past timestamps
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (
            int56[]  memory tickCumulatives,
            uint160[] memory secondsPerLiquidityCumulativeX128s
        );
}

// ─── Inline TickMath (MIT – Uniswap Labs) ────────────────────────────────────
// Computes sqrt(1.0001^tick) * 2^96 for a given tick, used to derive the price
// boundaries of a V3 position without needing to import @uniswap/v3-core.

library TickMath {
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = 887272;
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    /// @notice Returns the sqrt ratio as a Q64.96 fixed-point for the given tick.
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(MAX_TICK)), "T");

        uint256 ratio = absTick & 0x1 != 0
            ? 0xfffcb933bd6fad37aa2d162d1a594001
            : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;

        if (tick > 0) ratio = type(uint256).max / ratio;

        // back to Q96
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
}

// ─── FullMath (overflow-safe 512-bit multiplication) ─────────────────────────

library FullMath {
    /// @notice Calculates floor(a×b÷denominator) with full precision. Reverts on overflow.
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0 = a * b;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) return prod0 / denominator;
            require(denominator > prod1, "FullMath: overflow");
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * denominator) ^ 2;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            result = prod0 * inv;
        }
    }
}

// ─── Main contract ────────────────────────────────────────────────────────────

contract UniV3AutoCompounder {

    // ── Constants – Base mainnet ──────────────────────────────────────────────
    address public constant POSITION_MANAGER = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1;
    address public constant SWAP_ROUTER      = 0x2626664c2603336E57B271c5C0b26F421741e481;

    // ── Immutables set at deployment ──────────────────────────────────────────
    address public immutable token0;   // lower-address token of the pair
    address public immutable token1;   // higher-address token of the pair
    uint24  public poolFee;  // Uniswap pool fee tier (e.g. 500, 3000, 10000) – updatable by owner
    address public pool;     // Uniswap V3 pool address – updatable by owner

    // ── Fee configuration ─────────────────────────────────────────────────────
    /// @dev 1.5% to DAO, 0.5% to executor, 98% re-added as liquidity (total 2%)
    uint16 public constant DAO_FEE_BPS      = 150;  // 1.5 %
    uint16 public constant EXECUTOR_FEE_BPS = 50;   // 0.5 %
    uint16 public constant TOTAL_FEE_BPS    = 200;  // 2.0 %
    uint16 public constant ZAP_FEE_BPS      = 30;   // 0.3 % – charged on zap entry

    // ── Mutable state ─────────────────────────────────────────────────────────
    uint256 public tokenId;            // NFT position held by this contract
    address public owner;              // Contract owner (can update params, withdraw dust)
    address public dao;                // ITP DAO – receives 1.5 % of compounded fees
    mapping(address => bool) public isKeeper; // addresses authorised to call compound()

    // ── TWAP oracle parameters ────────────────────────────────────────────────
    uint32 public twapPeriod    = 60;   // lookback window for TWAP oracle (seconds); 60s suits low-activity pools
    uint16 public maxSlippageBps = 200; // maximum swap slippage (200 bps = 2%); covers 1% pool fee + price impact

    // ── Share accounting ──────────────────────────────────────────────────────
    uint256 public totalShares;
    mapping(address => uint256) public userShares;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 tokenId, uint256 liquidity, uint256 shares);
    event Withdrawn(address indexed user, uint256 liquidity, uint256 amount0, uint256 amount1);
    event Compounded(uint256 fee0, uint256 fee1, uint128 liquidityAdded);
    event FeesDistributed(address indexed executor, uint256 daoFee0, uint256 daoFee1, uint256 executorFee0, uint256 executorFee1);
    event DaoUpdated(address newDao);
    event KeeperAdded(address indexed keeper);
    event KeeperRemoved(address indexed keeper);
    event PositionReceived(uint256 tokenId);
    event TwapPeriodUpdated(uint32 newPeriod);
    event MaxSlippageUpdated(uint16 newBps);
    event PoolUpdated(address newPool, uint24 newPoolFee);
    event ZappedIn(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 zapFee, uint128 liquidityAdded, uint256 shares);
    event ZappedOut(address indexed user, address indexed tokenOut, uint256 shares, uint256 amountOut, uint256 zapFee);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyKeeper() {
        require(isKeeper[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// @param _token0          Token0 of the Uniswap V3 pool (must be the lower address)
    /// @param _token1          Token1 of the Uniswap V3 pool
    /// @param _poolFee         Pool fee tier (500, 3000, or 10000)
    /// @param _pool            Address of the Uniswap V3 pool
    /// @param _initialKeeper   First keeper whitelisted at deploy; DAO can add more later
    /// @param _dao             ITP DAO address – receives 1.5% fee and contract ownership
    constructor(
        address _token0,
        address _token1,
        uint24  _poolFee,
        address _pool,
        address _initialKeeper,
        address _dao
    ) {
        require(_token0 < _token1, "token0 must be < token1");
        require(_dao != address(0), "Zero DAO address");
        require(_initialKeeper != address(0), "Zero keeper address");
        token0   = _token0;
        token1   = _token1;
        poolFee  = _poolFee;
        pool     = _pool;
        dao      = _dao;
        owner    = _dao;  // ownership transferred to DAO at launch
        isKeeper[_initialKeeper] = true;
        emit KeeperAdded(_initialKeeper);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Deposit – mint a new position or add to an existing one
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit token0 and token1 into the vault.
    ///         On first deposit a new V3 position is minted; subsequent deposits
    ///         call increaseLiquidity on the existing position.
    /// @param amount0Desired  Amount of token0 to deposit
    /// @param amount1Desired  Amount of token1 to deposit
    /// @param tickLower       Lower tick of the position (only used on first deposit)
    /// @param tickUpper       Upper tick of the position (only used on first deposit)
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        int24   tickLower,
        int24   tickUpper
    ) external {
        require(amount0Desired > 0 || amount1Desired > 0, "Zero amounts");

        // Snapshot pre-deposit balances so we only return THIS deposit's dust,
        // not any compound leftovers sitting in the contract.
        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        require(IERC20(token0).transferFrom(msg.sender, address(this), amount0Desired), "transferFrom token0 failed");
        require(IERC20(token1).transferFrom(msg.sender, address(this), amount1Desired), "transferFrom token1 failed");

        IERC20(token0).approve(POSITION_MANAGER, amount0Desired);
        IERC20(token1).approve(POSITION_MANAGER, amount1Desired);

        // Read total liquidity BEFORE adding more, so share maths uses the
        // pre-deposit denominator and new depositors are not diluted.
        uint256 liquidityBefore = (tokenId == 0) ? 0 : _getTotalLiquidity();

        uint128 liquidityAdded;

        if (tokenId == 0) {
            // First deposit – mint a brand-new position
            (uint256 _tokenId, uint128 liq, , ) = INonfungiblePositionManager(POSITION_MANAGER).mint(
                INonfungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: poolFee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: address(this),
                    deadline: block.timestamp + 600
                })
            );
            tokenId = _tokenId;
            liquidityAdded = liq;
            emit PositionReceived(_tokenId);
        } else {
            // Subsequent deposit – increase liquidity of existing position
            (uint128 liq, , ) = INonfungiblePositionManager(POSITION_MANAGER).increaseLiquidity(
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId: tokenId,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp + 600
                })
            );
            liquidityAdded = liq;
        }

        // Share accounting: shares are proportional to liquidity contributed.
        // Uses liquidityBefore (pre-deposit) as denominator to prevent dilution.
        uint256 shares;
        if (totalShares == 0) {
            shares = uint256(liquidityAdded);
        } else {
            shares = (uint256(liquidityAdded) * totalShares) / liquidityBefore;
        }
        totalShares += shares;
        userShares[msg.sender] += shares;

        // Return only the unused portion of THIS deposit (dust from mint/increase).
        // Any pre-existing compound leftovers remain in the contract.
        uint256 post0 = IERC20(token0).balanceOf(address(this));
        uint256 post1 = IERC20(token1).balanceOf(address(this));
        if (post0 > pre0) require(IERC20(token0).transfer(msg.sender, post0 - pre0), "dust0 return failed");
        if (post1 > pre1) require(IERC20(token1).transfer(msg.sender, post1 - pre1), "dust1 return failed");

        emit Deposited(msg.sender, tokenId, liquidityAdded, shares);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Withdraw – remove a proportional share of liquidity
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Burn `shareAmount` shares and receive the underlying tokens.
    function withdraw(uint256 shareAmount) external {
        require(userShares[msg.sender] >= shareAmount, "Insufficient shares");

        uint256 totalLiquidity = _getTotalLiquidity();
        uint128 liquidityToRemove = uint128((shareAmount * totalLiquidity) / totalShares);

        // Effects before interactions (CEI pattern)
        totalShares -= shareAmount;
        userShares[msg.sender] -= shareAmount;

        // Decrease liquidity – returns exact amounts released
        (uint256 amount0, uint256 amount1) = INonfungiblePositionManager(POSITION_MANAGER).decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 600
            })
        );

        // Collect exactly the amounts released by decreaseLiquidity, not the
        // full position owed balance (which would include uncompounded fees
        // belonging to all shareholders).
        INonfungiblePositionManager(POSITION_MANAGER).collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: uint128(amount0),
                amount1Max: uint128(amount1)
            })
        );

        emit Withdrawn(msg.sender, liquidityToRemove, amount0, amount1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Zap Out – single-token exit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Burn `shareAmount` shares, receive everything as a single token.
    ///         Both underlying tokens are collected, the unwanted one is swapped
    ///         to `tokenOut`, a 0.3% DAO fee is deducted from the final output,
    ///         and the remainder is sent to the caller.
    ///
    /// @param shareAmount  Number of shares to redeem.
    /// @param tokenOut     Either token0 or token1 – the token you want back.
    /// @param slippageBps  Swap slippage in bps. Pass 0 to use maxSlippageBps.
    function zapOut(
        uint256 shareAmount,
        address tokenOut,
        uint16  slippageBps
    ) external returns (uint256 amountOut) {
        require(userShares[msg.sender] >= shareAmount, "Insufficient shares");
        require(tokenOut == token0 || tokenOut == token1, "Unsupported token");

        uint16 slip = slippageBps == 0 ? maxSlippageBps : slippageBps;
        require(slip <= 500, "Slippage too high");

        uint256 totalLiquidity = _getTotalLiquidity();
        uint128 liquidityToRemove = uint128((shareAmount * totalLiquidity) / totalShares);

        // Effects before interactions (CEI)
        totalShares -= shareAmount;
        userShares[msg.sender] -= shareAmount;

        // Remove the proportional liquidity to this contract
        (uint256 amount0, uint256 amount1) = INonfungiblePositionManager(POSITION_MANAGER).decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId:    tokenId,
                liquidity:  liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline:   block.timestamp + 600
            })
        );

        INonfungiblePositionManager(POSITION_MANAGER).collect(
            INonfungiblePositionManager.CollectParams({
                tokenId:    tokenId,
                recipient:  address(this),
                amount0Max: uint128(amount0),
                amount1Max: uint128(amount1)
            })
        );

        // Swap the unwanted token into tokenOut
        if (tokenOut == token1) {
            // Want token1 – swap all token0 proceeds to token1
            if (amount0 > 0) {
                amount1 += _swapWithSlippage(token0, token1, amount0, slip);
            }
            amountOut = amount1;
        } else {
            // Want token0 – swap all token1 proceeds to token0
            if (amount1 > 0) {
                amount0 += _swapWithSlippage(token1, token0, amount1, slip);
            }
            amountOut = amount0;
        }

        // 0.3% DAO zap fee taken from the output
        uint256 zapFee = amountOut * ZAP_FEE_BPS / 10_000;
        if (zapFee > 0) require(IERC20(tokenOut).transfer(dao, zapFee), "zap fee failed");
        amountOut -= zapFee;

        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "transfer failed");

        emit ZappedOut(msg.sender, tokenOut, shareAmount, amountOut, zapFee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Zap In – single-token entry
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Single-token entry into the vault.
    ///         Accepts either token0 or token1, deducts a 0.3% DAO fee, swaps
    ///         to the optimal ratio for the position, then adds both as liquidity.
    ///
    /// @param tokenIn     Either token0 or token1.
    /// @param amountIn    Amount of tokenIn to zap in.
    /// @param slippageBps Swap slippage tolerance in bps (e.g. 50 = 0.5%).
    ///                    Pass 0 to use the contract's current maxSlippageBps.
    /// @param tickLower   Lower tick (only used on the first deposit).
    /// @param tickUpper   Upper tick (only used on the first deposit).
    function zap(
        address tokenIn,
        uint256 amountIn,
        uint16  slippageBps,
        int24   tickLower,
        int24   tickUpper
    ) external returns (uint256 shares) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == token0 || tokenIn == token1, "Unsupported token");

        uint16 slip = slippageBps == 0 ? maxSlippageBps : slippageBps;
        require(slip <= 500, "Slippage too high");

        // Snapshot contract balances so we only return this zap's unused dust.
        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom failed");

        // 0.3% DAO zap fee, taken upfront in tokenIn
        uint256 zapFee = amountIn * ZAP_FEE_BPS / 10_000;
        if (zapFee > 0) require(IERC20(tokenIn).transfer(dao, zapFee), "zap fee failed");

        uint256 remaining = amountIn - zapFee;

        // Read current pool price and tick to compute the optimal split.
        (uint160 sqrtPriceX96, int24 currentTick, , , , , ) = IUniswapV3Pool(pool).slot0();

        uint256 amt0;
        uint256 amt1;

        if (currentTick <= tickLower) {
            // Position is 100% token0 – convert everything to token0.
            if (tokenIn == token1) {
                amt0 = _swapWithSlippage(token1, token0, remaining, slip);
            } else {
                amt0 = remaining;
            }
            amt1 = 0;
        } else if (currentTick >= tickUpper) {
            // Position is 100% token1 – convert everything to token1.
            if (tokenIn == token0) {
                amt1 = _swapWithSlippage(token0, token1, remaining, slip);
            } else {
                amt1 = remaining;
            }
            amt0 = 0;
        } else {
            // Price is inside the tick range.
            // Compute optimal swap fraction using Q96-scaled weight components:
            //
            //   w1 = (sqrtP - sqrtPL) * sqrtPU / Q96   [token1 weight – how much of value should be token1]
            //   w0 = (sqrtPU - sqrtP) * sqrtP  / Q96   [token0 weight – how much of value should be token0]
            //
            // For a symmetric range w1 ≈ w0 → 50% split.
            // Near upper tick: w1 >> w0 → almost all token1 needed, very little to swap.
            // Near lower tick: w0 >> w1 → almost all token0 needed.
            uint256 Q96   = 2**96;
            uint256 sqrtP = sqrtPriceX96;
            uint256 sqrtPL = TickMath.getSqrtRatioAtTick(tickLower);
            uint256 sqrtPU = TickMath.getSqrtRatioAtTick(tickUpper);

            uint256 w1     = FullMath.mulDiv(sqrtP  - sqrtPL, sqrtPU, Q96);
            uint256 w0     = FullMath.mulDiv(sqrtPU - sqrtP,  sqrtP,  Q96);
            uint256 wTotal = w1 + w0;

            if (tokenIn == token0) {
                // Swap the token1-weight fraction of token0 → token1
                uint256 swapAmt = FullMath.mulDiv(remaining, w1, wTotal);
                if (swapAmt > 0) {
                    amt1 = _swapWithSlippage(token0, token1, swapAmt, slip);
                }
                amt0 = remaining - swapAmt;
            } else {
                // Swap the token0-weight fraction of token1 → token0
                uint256 swapAmt = FullMath.mulDiv(remaining, w0, wTotal);
                if (swapAmt > 0) {
                    amt0 = _swapWithSlippage(token1, token0, swapAmt, slip);
                }
                amt1 = remaining - swapAmt;
            }
        }

        // Approve position manager
        IERC20(token0).approve(POSITION_MANAGER, amt0);
        IERC20(token1).approve(POSITION_MANAGER, amt1);

        // Read total liquidity BEFORE adding more (prevents share dilution)
        uint256 liquidityBefore = (tokenId == 0) ? 0 : _getTotalLiquidity();

        uint128 liquidityAdded;

        if (tokenId == 0) {
            (uint256 _tokenId, uint128 liq, , ) = INonfungiblePositionManager(POSITION_MANAGER).mint(
                INonfungiblePositionManager.MintParams({
                    token0:         token0,
                    token1:         token1,
                    fee:            poolFee,
                    tickLower:      tickLower,
                    tickUpper:      tickUpper,
                    amount0Desired: amt0,
                    amount1Desired: amt1,
                    amount0Min:     0,
                    amount1Min:     0,
                    recipient:      address(this),
                    deadline:       block.timestamp + 600
                })
            );
            tokenId = _tokenId;
            liquidityAdded = liq;
            emit PositionReceived(_tokenId);
        } else {
            (uint128 liq, , ) = INonfungiblePositionManager(POSITION_MANAGER).increaseLiquidity(
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId:        tokenId,
                    amount0Desired: amt0,
                    amount1Desired: amt1,
                    amount0Min:     0,
                    amount1Min:     0,
                    deadline:       block.timestamp + 600
                })
            );
            liquidityAdded = liq;
        }

        // Share accounting (same formula as deposit())
        if (totalShares == 0) {
            shares = uint256(liquidityAdded);
        } else {
            shares = (uint256(liquidityAdded) * totalShares) / liquidityBefore;
        }
        totalShares            += shares;
        userShares[msg.sender] += shares;

        // Return only the unused portion of this zap's tokens as dust
        uint256 post0 = IERC20(token0).balanceOf(address(this));
        uint256 post1 = IERC20(token1).balanceOf(address(this));
        if (post0 > pre0) require(IERC20(token0).transfer(msg.sender, post0 - pre0), "dust0 return failed");
        if (post1 > pre1) require(IERC20(token1).transfer(msg.sender, post1 - pre1), "dust1 return failed");

        emit ZappedIn(msg.sender, tokenIn, amountIn, zapFee, liquidityAdded, shares);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Compound – collect fees, balance them, re-add as liquidity
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Collect accrued LP fees, swap to the correct ratio for the
    ///         current tick range, and call increaseLiquidity.
    ///         Can only be called by an address whitelisted as a keeper by the DAO.
    function compound() external onlyKeeper {
        require(tokenId != 0, "No position");

        // 1. Collect all accrued fees to this contract
        (uint256 fee0, uint256 fee1) = INonfungiblePositionManager(POSITION_MANAGER).collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        if (fee0 == 0 && fee1 == 0) return;

        // 2. Deduct protocol fees before re-compounding
        //    DAO:      1.5 %  (150 bps)
        //    Executor: 0.5 %  (50 bps)
        //    LP:      98.0 %  (remainder)
        address executor = msg.sender;

        uint256 daoFee0      = fee0 * DAO_FEE_BPS      / 10_000;
        uint256 daoFee1      = fee1 * DAO_FEE_BPS      / 10_000;
        uint256 executorFee0 = fee0 * EXECUTOR_FEE_BPS / 10_000;
        uint256 executorFee1 = fee1 * EXECUTOR_FEE_BPS / 10_000;

        if (daoFee0 > 0) require(IERC20(token0).transfer(dao, daoFee0), "dao fee0 failed");
        if (daoFee1 > 0) require(IERC20(token1).transfer(dao, daoFee1), "dao fee1 failed");
        if (executorFee0 > 0) require(IERC20(token0).transfer(executor, executorFee0), "exec fee0 failed");
        if (executorFee1 > 0) require(IERC20(token1).transfer(executor, executorFee1), "exec fee1 failed");

        emit FeesDistributed(executor, daoFee0, daoFee1, executorFee0, executorFee1);

        uint256 compound0 = fee0 - daoFee0 - executorFee0;
        uint256 compound1 = fee1 - daoFee1 - executorFee1;

        // 3. Read current position tick range and pool price
        (, , , , , int24 tickLower, int24 tickUpper, , , , , ) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);

        (uint160 sqrtPriceX96, int24 currentTick, , , , , ) = IUniswapV3Pool(pool).slot0();

        // 4. Swap to the ratio that the position requires
        (uint256 final0, uint256 final1) = _rebalance(
            compound0, compound1,
            sqrtPriceX96, currentTick,
            tickLower, tickUpper,
            maxSlippageBps
        );

        if (final0 == 0 && final1 == 0) return;

        // 5. Approve position manager and re-add as liquidity
        IERC20(token0).approve(POSITION_MANAGER, final0);
        IERC20(token1).approve(POSITION_MANAGER, final1);

        (uint128 liquidityAdded, , ) = INonfungiblePositionManager(POSITION_MANAGER).increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: final0,
                amount1Desired: final1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 600
            })
        );

        // No share change – every existing share is now worth slightly more liquidity

        emit Compounded(fee0, fee1, liquidityAdded);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Compute how much of each collected fee token to swap so that the
    ///      resulting amounts match the current V3 position ratio.
    ///
    ///      Ratio derivation (Q96 fixed-point):
    ///        sqrtPL = getSqrtRatioAtTick(tickLower)
    ///        sqrtPU = getSqrtRatioAtTick(tickUpper)
    ///        sqrtP  = current sqrtPriceX96
    ///
    ///      Per-liquidity amounts (token0, token1):
    ///        a0 = (sqrtPU - sqrtP)  * Q96 / (sqrtP * sqrtPU)    [token0]
    ///        a1 = (sqrtP  - sqrtPL)                               [token1, Q96]
    ///
    ///      Desired token1 / token0 ratio  R = a1 * sqrtP * sqrtPU / ((sqrtPU - sqrtP) * Q96)
    ///
    ///      Amount of token0 to swap → token1:
    ///        x = (R * fee0 - fee1) / (R + price)       where price = sqrtP^2 / Q96^2
    ///      If x < 0, swap |x| token1 → token0 instead.
    function _rebalance(
        uint256 fee0,
        uint256 fee1,
        uint160 sqrtPriceX96,
        int24   currentTick,
        int24   tickLower,
        int24   tickUpper,
        uint16  slippageBps
    ) internal returns (uint256 amount0, uint256 amount1) {

        uint160 sqrtPL = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtPU = TickMath.getSqrtRatioAtTick(tickUpper);
        uint160 sqrtP  = sqrtPriceX96;

        // ── Edge cases: price outside the range ──────────────────────────────
        if (currentTick <= tickLower) {
            // Position is 100% token0 – swap all token1 to token0
            if (fee1 > 0) {
                uint256 out = _swapWithSlippage(token1, token0, fee1, slippageBps);
                return (fee0 + out, 0);
            }
            return (fee0, 0);
        }
        if (currentTick >= tickUpper) {
            // Position is 100% token1 – swap all token0 to token1
            if (fee0 > 0) {
                uint256 out = _swapWithSlippage(token0, token1, fee0, slippageBps);
                return (0, fee1 + out);
            }
            return (0, fee1);
        }

        // ── Price is inside the range ────────────────────────────────────────
        // Compute the ratio R = amount1 per unit of liquidity / amount0 per unit
        // All intermediate values are Q96.
        //
        //   amount0PerL_Q96 = (sqrtPU - sqrtP) * Q96 / (sqrtP * sqrtPU / Q96)
        //                   = (sqrtPU - sqrtP) * Q96^2 / (sqrtP * sqrtPU)
        //   amount1PerL_Q96 = sqrtP - sqrtPL
        //
        //   R (in token1/token0, Q96) = amount1PerL_Q96 * sqrtP * sqrtPU
        //                              / ((sqrtPU - sqrtP) * Q96)

        uint256 Q96 = 2**96;

        uint256 sqrtPUminusP = uint256(sqrtPU) - uint256(sqrtP);  // > 0 inside range
        uint256 sqrtPminusPL = uint256(sqrtP)  - uint256(sqrtPL); // > 0 inside range

        // R in Q96 units (token1 / token0)
        // R = sqrtPminusPL * sqrtP * sqrtPU / (sqrtPUminusP * Q96)
        // Use FullMath to avoid overflow
        uint256 numeratorR   = FullMath.mulDiv(sqrtPminusPL, FullMath.mulDiv(uint256(sqrtP), uint256(sqrtPU), Q96), Q96);
        uint256 denominatorR = sqrtPUminusP; // already in Q96 space relative to numeratorR

        // Desired split: keep ratio such that fee0_new / fee1_new = 1 / R
        // Total value in token0 units:
        //   totalVal0 = fee0 + fee1 * denominatorR / numeratorR
        // Amount of token0 we want:
        //   want0 = totalVal0 * denominatorR / (denominatorR + numeratorR)
        // Amount to swap x = fee0 - want0
        //   if x > 0: swap x token0 → token1
        //   if x < 0: swap |x| token1 → token0

        // Compute total value in token0 (Q0 units, same decimals as fee0)
        // fee1_in_token0 = fee1 * denominatorR / numeratorR
        //
        // Protect against numeratorR == 0
        if (numeratorR == 0) {
            // Degenerate case – return unchanged
            return (fee0, fee1);
        }

        uint256 fee1InToken0 = FullMath.mulDiv(fee1, denominatorR, numeratorR);
        uint256 totalVal0    = fee0 + fee1InToken0;

        // want0 = totalVal0 * denominatorR / (denominatorR + numeratorR)
        uint256 want0 = FullMath.mulDiv(totalVal0, denominatorR, denominatorR + numeratorR);

        if (want0 <= fee0) {
            // We have more token0 than needed – swap the excess to token1
            uint256 swapAmt = fee0 - want0;
            if (swapAmt > 0) {
                uint256 out = _swapWithSlippage(token0, token1, swapAmt, slippageBps);
                return (fee0 - swapAmt, fee1 + out);
            }
        } else {
            // We need more token0 – swap some token1 to token0
            uint256 want1   = FullMath.mulDiv(totalVal0, numeratorR, denominatorR + numeratorR);
            uint256 swapAmt = fee1 > want1 ? fee1 - want1 : 0;
            if (swapAmt > 0) {
                uint256 out = _swapWithSlippage(token1, token0, swapAmt, slippageBps);
                return (fee0 + out, fee1 - swapAmt);
            }
        }

        return (fee0, fee1);
    }

    /// @dev Execute a single-hop exact-input swap, using the contract's maxSlippageBps.
    function _swap(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint256 amountOut) {
        return _swapWithSlippage(tokenIn, tokenOut, amountIn, maxSlippageBps);
    }

    /// @dev Execute a single-hop exact-input swap with an explicit slippage tolerance.
    function _swapWithSlippage(address tokenIn, address tokenOut, uint256 amountIn, uint16 slippageBps) internal returns (uint256 amountOut) {
        uint256 amountOutMin = _calcAmountOutMin(tokenIn, amountIn, slippageBps);
        IERC20(tokenIn).approve(SWAP_ROUTER, amountIn);
        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               poolFee,
                recipient:         address(this),
                amountIn:          amountIn,
                amountOutMinimum:  amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );
    }

    /// @dev Derive the time-weighted average tick over `twapPeriod` seconds.
    ///      Falls back to the current spot tick if the pool's observation buffer
    ///      doesn't cover the full twapPeriod yet (reverts with "OLD").
    function _getTwapTick() internal view returns (int24 twapTick) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapPeriod;
        secondsAgos[1] = 0;

        // Try the full TWAP window; fall back to spot tick if the pool is too new.
        try IUniswapV3Pool(pool).observe(secondsAgos) returns (
            int56[] memory tickCumulatives,
            uint160[] memory
        ) {
            int56 tickDelta = tickCumulatives[1] - tickCumulatives[0];
            int56 period    = int56(uint56(twapPeriod));
            twapTick = int24(tickDelta / period);
            // Solidity truncates toward zero; apply floor division for negative deltas
            if (tickDelta < 0 && tickDelta % period != 0) twapTick--;
        } catch {
            // Pool observation history too short – use spot tick from slot0.
            (, twapTick, , , , , ) = IUniswapV3Pool(pool).slot0();
        }
    }

    /// @dev Compute the minimum acceptable output for a swap using the TWAP price
    ///      and the configured slippage tolerance.
    ///
    ///      TWAP price in Q96:  price96 = sqrtTwap^2 / Q96   (token1 per token0)
    ///      token0 → token1:    rawOut = amountIn * price96 / Q96
    ///      token1 → token0:    rawOut = amountIn * Q96 / price96
    function _calcAmountOutMin(address tokenIn, uint256 amountIn, uint16 slippageBps) internal view returns (uint256) {
        int24  twapTick  = _getTwapTick();
        uint256 sqrtTwap = uint256(TickMath.getSqrtRatioAtTick(twapTick));
        uint256 Q96      = 2**96;

        // price96 = sqrtTwap^2 / Q96  (token1 per token0, scaled by Q96)
        uint256 price96  = FullMath.mulDiv(sqrtTwap, sqrtTwap, Q96);
        require(price96 > 0, "TWAP price zero");

        uint256 rawOut;
        if (tokenIn == token0) {
            // swapping token0 → token1: multiply by price
            rawOut = FullMath.mulDiv(amountIn, price96, Q96);
        } else {
            // swapping token1 → token0: divide by price
            rawOut = FullMath.mulDiv(amountIn, Q96, price96);
        }

        // Apply slippage tolerance AND deduct the pool's own fee so the floor
        // reflects what actually arrives after the 1% pool fee is taken.
        // poolFee is in units of 1/1_000_000 (e.g. 10000 = 1%).
        uint256 afterPoolFee = rawOut * (1_000_000 - uint256(poolFee)) / 1_000_000;
        return afterPoolFee * (10_000 - slippageBps) / 10_000;
    }

    // _returnDust removed – deposit() now uses snapshot-based dust return.

    /// @dev Total liquidity currently held in the NFT position.
    function _getTotalLiquidity() internal view returns (uint256) {
        (, , , , , , , uint128 liquidity, , , , ) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);
        return uint256(liquidity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Update the DAO fee recipient address.
    function setDao(address _dao) external onlyOwner {
        require(_dao != address(0), "Zero DAO address");
        dao = _dao;
        emit DaoUpdated(_dao);
    }

    /// @notice Whitelist an address as a keeper.
    function addKeeper(address _keeper) external onlyOwner {
        require(_keeper != address(0), "Zero address");
        isKeeper[_keeper] = true;
        emit KeeperAdded(_keeper);
    }

    /// @notice Remove a keeper from the whitelist.
    function removeKeeper(address _keeper) external onlyOwner {
        isKeeper[_keeper] = false;
        emit KeeperRemoved(_keeper);
    }

    /// @notice Update the TWAP lookback window. Minimum 60 seconds.
    function setTwapPeriod(uint32 _twapPeriod) external onlyOwner {
        require(_twapPeriod >= 60, "TWAP too short");
        twapPeriod = _twapPeriod;
        emit TwapPeriodUpdated(_twapPeriod);
    }

    /// @notice Point the vault at a different Uniswap V3 pool for the same token pair.
    ///         Use this when liquidity migrates to a new fee tier.
    ///         The new pool must contain token0 and token1.
    function setPool(address _pool, uint24 _poolFee) external onlyOwner {
        require(_pool != address(0), "Zero pool address");
        require(_poolFee == 100 || _poolFee == 500 || _poolFee == 3000 || _poolFee == 10000, "Invalid fee tier");
        pool    = _pool;
        poolFee = _poolFee;
        emit PoolUpdated(_pool, _poolFee);
    }

    /// @notice Update the maximum swap slippage tolerance. Maximum 500 bps (5%).
    function setMaxSlippage(uint16 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Slippage too high");
        maxSlippageBps = _maxSlippageBps;
        emit MaxSlippageUpdated(_maxSlippageBps);
    }

    /// @notice Transfer ownership of the contract
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /// @notice Rescue any ERC-20 token accidentally sent to this contract
    ///         (cannot be called to drain an active position – use withdraw instead).
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "rescue transfer failed");
    }

    /// @notice Allow the owner to receive an NFT position transferred directly
    ///         to the contract (e.g. migrating an existing position).
    function onERC721Received(address, address, uint256 _tokenId, bytes calldata)
        external
        returns (bytes4)
    {
        require(msg.sender == POSITION_MANAGER, "Not position manager");
        require(tokenId == 0, "Position already set");
        tokenId = _tokenId;
        emit PositionReceived(_tokenId);
        return this.onERC721Received.selector;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Total liquidity currently held in the vault's V3 position.
    function totalLiquidity() external view returns (uint128) {
        if (tokenId == 0) return 0;
        (, , , , , , , uint128 liq, , , , ) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);
        return liq;
    }

    /// @notice Liquidity owned by a specific user.
    function userLiquidity(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        uint256 liq = _getTotalLiquidity();
        return (userShares[user] * liq) / totalShares;
    }

    /// @notice Returns the fee amounts snapshotted as owed to the position.
    ///         Keepers can use this to decide when calling compound() is worthwhile.
    ///         Note: real accrued fees may be slightly higher than these values
    ///         until a pool interaction (swap/mint/burn) triggers a snapshot update.
    function pendingFees() external view returns (uint128 amount0, uint128 amount1) {
        if (tokenId == 0) return (0, 0);
        (, , , , , , , , , , uint128 owed0, uint128 owed1) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);
        return (owed0, owed1);
    }
}
