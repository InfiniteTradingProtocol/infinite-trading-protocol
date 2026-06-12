// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Initializable }    from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  UniV4AutoCompounder
//  Infinite Trading DAO  ·  https://infinitetrading.io
//
//  Collects LP fees from a Uniswap V4 position, rebalances them to the correct
//  token ratio for the position's tick range, then re-adds them as liquidity.
//
//  Key differences from UniV3AutoCompounder:
//   • Pool identified by PoolKey (currency0, currency1, fee, tickSpacing, hooks)
//   • Liquidity managed via PositionManager.modifyLiquidities() with encoded actions
//   • Fee collection via DECREASE_LIQUIDITY(0) + TAKE_PAIR instead of collect()
//   • Swaps via UniversalRouter with Permit2 token approvals
//   • Price reading via StateView.getSlot0() – spot price (no TWAP in V4 core)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// @dev Mirrors v4-core PoolKey. Currency and IHooks are both address-typed,
///      so ABI encoding is identical to the canonical PoolKey struct.
struct PoolKey {
    address currency0;    // Currency (type Currency is address)
    address currency1;    // Currency
    uint24  fee;
    int24   tickSpacing;
    address hooks;        // IHooks (interface, underlying type = address)
}

/// @dev Mirrors IV4Router.ExactInputSingleParams (includes minHopPriceX36 field).
struct ExactInputSingleParams {
    PoolKey poolKey;
    bool    zeroForOne;
    uint128 amountIn;
    uint128 amountOutMinimum;
    uint256 minHopPriceX36;   // 0 = no per-hop price limit
    bytes   hookData;
}

interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);
    function nextTokenId() external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @dev StateView exposes poolManager state via extsload.
///      getSlot0 takes a PoolId (bytes32 = keccak256(abi.encode(PoolKey))).
interface IStateView {
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @dev IAllowanceTransfer.approve from Permit2.
interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

// ─── Inline TickMath (MIT – Uniswap Labs) ────────────────────────────────────

library TickMath {
    int24  internal constant MIN_TICK = -887272;
    int24  internal constant MAX_TICK =  887272;
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(MAX_TICK)), "T");

        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2  != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4  != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8  != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
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
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
}

// ─── FullMath (overflow-safe 512-bit multiplication) ─────────────────────────

library FullMath {
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

// ─── V4 Actions constants (from @uniswap/v4-periphery/src/libraries/Actions.sol) ──

uint8 constant ACT_INCREASE_LIQUIDITY = 0x00;
uint8 constant ACT_DECREASE_LIQUIDITY = 0x01;
uint8 constant ACT_MINT_POSITION      = 0x02;
uint8 constant ACT_SWAP_EXACT_IN_SINGLE = 0x06;
uint8 constant ACT_SETTLE_ALL        = 0x0c;
uint8 constant ACT_SETTLE_PAIR       = 0x0d;
uint8 constant ACT_TAKE_ALL          = 0x0f;
uint8 constant ACT_TAKE_PAIR         = 0x11;

// ─── Universal Router command (Commands.V4_SWAP = 0x10) ─────────────────────
uint8 constant CMD_V4_SWAP = 0x10;

// ─── Main contract ────────────────────────────────────────────────────────────

contract UniV4AutoCompounder is Initializable, UUPSUpgradeable {

    // ── Base mainnet V4 contract addresses ───────────────────────────────────
    address public constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address public constant UNIVERSAL_ROUTER = 0x6fF5693b99212Da76ad316178A184AB56D299b43;
    address public constant STATE_VIEW       = 0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71;
    address public constant PERMIT2          = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // ── Fee configuration ─────────────────────────────────────────────────────
    /// @dev 1.5% to DAO, 0.5% to executor, 98% re-added as liquidity (total 2%)
    uint16 public constant DAO_FEE_BPS      = 150;
    uint16 public constant EXECUTOR_FEE_BPS = 50;
    uint16 public constant TOTAL_FEE_BPS    = 200;
    uint16 public constant ZAP_FEE_BPS      = 30;  // 0.3% on single-token entry/exit

    // ── Pool configuration (set once in initialize) ───────────────────────────
    address public token0;
    address public token1;
    uint24  public poolFee;
    int24   public poolTickSpacing;
    address public poolHooks;
    bytes32 public poolId;   // keccak256(abi.encode(PoolKey)) used for StateView lookups

    // ── Mutable state ─────────────────────────────────────────────────────────
    uint256 public tokenId;
    address public owner;
    address public dao;
    mapping(address => bool) public isKeeper;

    // ── Slippage ──────────────────────────────────────────────────────────────
    uint16 public maxSlippageBps;  // default 300 (3%) – covers price impact only

    // ── Share accounting ──────────────────────────────────────────────────────
    uint256 public totalShares;
    mapping(address => uint256) public userShares;

    // ── Compound carryover ────────────────────────────────────────────────────
    uint256 public pendingReinvest0;
    uint256 public pendingReinvest1;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 tokenId, uint256 liquidity, uint256 shares);
    event Withdrawn(address indexed user, uint256 liquidity, uint256 amount0, uint256 amount1);
    event Compounded(uint256 fee0, uint256 fee1, uint128 liquidityAdded);
    event FeesDistributed(address indexed executor, uint256 daoFee0, uint256 daoFee1, uint256 executorFee0, uint256 executorFee1);
    event ZappedIn(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 zapFee, uint128 liquidityAdded, uint256 shares);
    event ZappedOut(address indexed user, address indexed tokenOut, uint256 shares, uint256 amountOut, uint256 zapFee);
    event SwapSkipped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint16 slippageBps);
    event PositionReceived(uint256 tokenId);
    event DaoUpdated(address newDao);
    event KeeperAdded(address indexed keeper);
    event KeeperRemoved(address indexed keeper);
    event MaxSlippageUpdated(uint16 newBps);

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
    //  Constructor (disabled) + Initializer
    // ─────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice One-time initializer called via the proxy.
    /// @param _token0        Token0 of the pool (must be the lower address)
    /// @param _token1        Token1 of the pool
    /// @param _poolFee       Pool fee tier (e.g. 500, 3000, 10000)
    /// @param _tickSpacing   Pool tick spacing (must match fee tier)
    /// @param _hooks         Hook contract address (address(0) for no hooks)
    /// @param _initialKeeper First keeper whitelisted at deploy
    /// @param _dao           ITP DAO address – receives 1.5% fee and ownership
    /// @param _secondKeeper  Optional second keeper (pass address(0) to skip)
    function initialize(
        address _token0,
        address _token1,
        uint24  _poolFee,
        int24   _tickSpacing,
        address _hooks,
        address _initialKeeper,
        address _dao,
        address _secondKeeper
    ) external initializer {
        require(_token0 < _token1,              "token0 must be < token1");
        require(_dao != address(0),             "Zero DAO address");
        require(_initialKeeper != address(0),   "Zero keeper address");

        token0         = _token0;
        token1         = _token1;
        poolFee        = _poolFee;
        poolTickSpacing = _tickSpacing;
        poolHooks      = _hooks;
        poolId         = keccak256(abi.encode(PoolKey({
            currency0:   _token0,
            currency1:   _token1,
            fee:         _poolFee,
            tickSpacing: _tickSpacing,
            hooks:       _hooks
        })));

        dao            = _dao;
        owner          = _dao;
        maxSlippageBps = 300;

        isKeeper[_initialKeeper] = true;
        emit KeeperAdded(_initialKeeper);
        if (_secondKeeper != address(0)) {
            isKeeper[_secondKeeper] = true;
            emit KeeperAdded(_secondKeeper);
        }

        // ── Token approvals ──────────────────────────────────────────────────
        // Give Permit2 infinite ERC-20 allowances (once, never expires).
        require(IERC20(_token0).approve(PERMIT2, type(uint256).max), "approve t0 permit2");
        require(IERC20(_token1).approve(PERMIT2, type(uint256).max), "approve t1 permit2");

        // Give PositionManager and UniversalRouter infinite Permit2 allowances.
        // type(uint160).max with type(uint48).max expiration = permanent, non-decrementing.
        IPermit2(PERMIT2).approve(_token0, POSITION_MANAGER, type(uint160).max, type(uint48).max);
        IPermit2(PERMIT2).approve(_token1, POSITION_MANAGER, type(uint160).max, type(uint48).max);
        IPermit2(PERMIT2).approve(_token0, UNIVERSAL_ROUTER,  type(uint160).max, type(uint48).max);
        IPermit2(PERMIT2).approve(_token1, UNIVERSAL_ROUTER,  type(uint160).max, type(uint48).max);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ─────────────────────────────────────────────────────────────────────────
    //  Deposit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit token0 and token1.  On first deposit a V4 position is
    ///         minted; subsequent deposits increase the existing position.
    /// @param amount0Desired  Amount of token0 to deposit
    /// @param amount1Desired  Amount of token1 to deposit
    /// @param tickLower       Lower tick (only used on first deposit)
    /// @param tickUpper       Upper tick (only used on first deposit)
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        int24   tickLower,
        int24   tickUpper
    ) external {
        require(amount0Desired > 0 || amount1Desired > 0, "Zero amounts");

        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        require(IERC20(token0).transferFrom(msg.sender, address(this), amount0Desired), "transferFrom t0");
        require(IERC20(token1).transferFrom(msg.sender, address(this), amount1Desired), "transferFrom t1");

        uint256 liquidityBefore = (tokenId == 0) ? 0 : _getTotalLiquidity();

        // Derive tick range: on first deposit use params, thereafter read from existing position
        int24 tL;
        int24 tU;
        if (tokenId == 0) {
            tL = tickLower;
            tU = tickUpper;
        } else {
            (tL, tU) = _getPositionTicks();
        }

        // Compute how much liquidity these amounts represent at the current price
        (uint160 sqrtPriceX96,,, ) = IStateView(STATE_VIEW).getSlot0(poolId);
        uint160 sqrtPL = TickMath.getSqrtRatioAtTick(tL);
        uint160 sqrtPU = TickMath.getSqrtRatioAtTick(tU);
        uint256 liquidity = _getLiquidityForAmounts(sqrtPriceX96, sqrtPL, sqrtPU, amount0Desired, amount1Desired);
        require(liquidity > 0, "Zero liquidity");

        uint128 liquidityAdded;

        if (tokenId == 0) {
            // First deposit – MINT_POSITION
            uint256 nextId = IPositionManager(POSITION_MANAGER).nextTokenId();
            bytes memory actions = abi.encodePacked(ACT_MINT_POSITION, ACT_SETTLE_PAIR);
            bytes[] memory params = new bytes[](2);
            params[0] = abi.encode(
                _poolKey(), tL, tU,
                liquidity,
                uint128(amount0Desired), uint128(amount1Desired),
                address(this),
                bytes("")
            );
            params[1] = abi.encode(token0, token1);
            IPositionManager(POSITION_MANAGER).modifyLiquidities(
                abi.encode(actions, params), block.timestamp + 600
            );
            tokenId = nextId;
            liquidityAdded = uint128(liquidity);
            emit PositionReceived(nextId);
        } else {
            // Subsequent deposit – INCREASE_LIQUIDITY
            bytes memory actions = abi.encodePacked(ACT_INCREASE_LIQUIDITY, ACT_SETTLE_PAIR);
            bytes[] memory params = new bytes[](2);
            params[0] = abi.encode(
                tokenId,
                liquidity,
                uint128(amount0Desired), uint128(amount1Desired),
                bytes("")
            );
            params[1] = abi.encode(token0, token1);
            IPositionManager(POSITION_MANAGER).modifyLiquidities(
                abi.encode(actions, params), block.timestamp + 600
            );
            liquidityAdded = uint128(liquidity);
        }

        // Share accounting
        uint256 shares;
        if (totalShares == 0) {
            shares = uint256(liquidityAdded);
        } else {
            require(liquidityBefore > 0, "Invariant: shares exist but no liquidity");
            shares = (uint256(liquidityAdded) * totalShares) / liquidityBefore;
        }
        totalShares            += shares;
        userShares[msg.sender] += shares;

        // Return only this deposit's unused dust (pre-existing carryover stays)
        uint256 post0 = IERC20(token0).balanceOf(address(this));
        uint256 post1 = IERC20(token1).balanceOf(address(this));
        if (post0 > pre0) require(IERC20(token0).transfer(msg.sender, post0 - pre0), "dust0 return");
        if (post1 > pre1) require(IERC20(token1).transfer(msg.sender, post1 - pre1), "dust1 return");

        emit Deposited(msg.sender, tokenId, liquidityAdded, shares);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Withdraw
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Burn shares and receive the underlying tokens.
    ///         In V4, DECREASE_LIQUIDITY returns principal + proportional fees,
    ///         both of which are forwarded to the caller.
    function withdraw(uint256 shareAmount) external {
        require(userShares[msg.sender] >= shareAmount, "Insufficient shares");

        uint256 totalLiq = _getTotalLiquidity();
        uint128 liquidityToRemove = uint128((shareAmount * totalLiq) / totalShares);
        require(liquidityToRemove > 0, "Share amount too small");

        // Effects before interactions (CEI)
        totalShares            -= shareAmount;
        userShares[msg.sender] -= shareAmount;

        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        bytes memory actions = abi.encodePacked(ACT_DECREASE_LIQUIDITY, ACT_TAKE_PAIR);
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(tokenId, uint256(liquidityToRemove), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(token0, token1, address(this));
        IPositionManager(POSITION_MANAGER).modifyLiquidities(
            abi.encode(actions, params), block.timestamp + 600
        );

        // Forward everything received (principal + proportional fees)
        uint256 amount0 = IERC20(token0).balanceOf(address(this)) - pre0;
        uint256 amount1 = IERC20(token1).balanceOf(address(this)) - pre1;
        if (amount0 > 0) require(IERC20(token0).transfer(msg.sender, amount0), "transfer t0");
        if (amount1 > 0) require(IERC20(token1).transfer(msg.sender, amount1), "transfer t1");

        emit Withdrawn(msg.sender, liquidityToRemove, amount0, amount1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Zap Out – single-token exit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Burn shares, receive everything as a single output token.
    function zapOut(
        uint256 shareAmount,
        address tokenOut,
        uint16  slippageBps
    ) external returns (uint256 amountOut) {
        require(userShares[msg.sender] >= shareAmount, "Insufficient shares");
        require(tokenOut == token0 || tokenOut == token1, "Unsupported token");

        uint16 slip = slippageBps == 0 ? maxSlippageBps : slippageBps;
        require(slip <= 500, "Slippage too high");

        uint256 totalLiq = _getTotalLiquidity();
        uint128 liquidityToRemove = uint128((shareAmount * totalLiq) / totalShares);
        require(liquidityToRemove > 0, "Share amount too small");

        totalShares            -= shareAmount;
        userShares[msg.sender] -= shareAmount;

        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        // Remove liquidity to vault
        bytes memory actions = abi.encodePacked(ACT_DECREASE_LIQUIDITY, ACT_TAKE_PAIR);
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(tokenId, uint256(liquidityToRemove), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(token0, token1, address(this));
        IPositionManager(POSITION_MANAGER).modifyLiquidities(
            abi.encode(actions, params), block.timestamp + 600
        );

        uint256 amount0 = IERC20(token0).balanceOf(address(this)) - pre0;
        uint256 amount1 = IERC20(token1).balanceOf(address(this)) - pre1;

        // Swap the unwanted token into tokenOut
        if (tokenOut == token1) {
            if (amount0 > 0) amount1 += _executeSwap(token0, token1, amount0, slip);
            amountOut = amount1;
        } else {
            if (amount1 > 0) amount0 += _executeSwap(token1, token0, amount1, slip);
            amountOut = amount0;
        }

        // 0.3% DAO zap fee
        uint256 zapFee = amountOut * ZAP_FEE_BPS / 10_000;
        if (zapFee > 0) require(IERC20(tokenOut).transfer(dao, zapFee), "zap fee");
        amountOut -= zapFee;
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "transfer out");

        emit ZappedOut(msg.sender, tokenOut, shareAmount, amountOut, zapFee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Zap In – single-token entry
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Single-token entry.  Deducts a 0.3% DAO fee, swaps to the
    ///         correct position ratio, then adds both tokens as liquidity.
    function zap(
        address tokenIn,
        uint256 amountIn,
        uint16  slippageBps,
        int24   tickLower,
        int24   tickUpper
    ) external returns (uint256 shares) {
        require(amountIn > 0,                           "Zero amount");
        require(tokenIn == token0 || tokenIn == token1, "Unsupported token");

        uint16 slip = slippageBps == 0 ? maxSlippageBps : slippageBps;
        require(slip <= 500, "Slippage too high");

        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom");

        // Deduct DAO zap fee upfront in tokenIn
        uint256 zapFee = amountIn * ZAP_FEE_BPS / 10_000;
        if (zapFee > 0) require(IERC20(tokenIn).transfer(dao, zapFee), "zap fee");
        uint256 remaining = amountIn - zapFee;

        // Read current pool price
        (uint160 sqrtPriceX96, int24 currentTick,,) = IStateView(STATE_VIEW).getSlot0(poolId);

        // Determine effective tick range
        int24 tL = (tokenId == 0) ? tickLower : _getTickLower();
        int24 tU = (tokenId == 0) ? tickUpper : _getTickUpper();

        uint256 amt0;
        uint256 amt1;

        if (currentTick <= tL) {
            // Position is 100% token0
            amt0 = (tokenIn == token1) ? _executeSwap(token1, token0, remaining, slip) : remaining;
            amt1 = 0;
        } else if (currentTick >= tU) {
            // Position is 100% token1
            amt1 = (tokenIn == token0) ? _executeSwap(token0, token1, remaining, slip) : remaining;
            amt0 = 0;
        } else {
            // Price inside range – compute optimal split
            uint256 Q96   = 2 ** 96;
            uint256 sqrtP = sqrtPriceX96;
            uint256 sqrtPL = TickMath.getSqrtRatioAtTick(tL);
            uint256 sqrtPU = TickMath.getSqrtRatioAtTick(tU);

            uint256 w1 = FullMath.mulDiv(sqrtP - sqrtPL, sqrtPU, Q96);
            uint256 w0 = FullMath.mulDiv(sqrtPU - sqrtP, sqrtP,  Q96);
            uint256 wTotal = w1 + w0;

            if (tokenIn == token0) {
                uint256 swapAmt = FullMath.mulDiv(remaining, w1, wTotal);
                if (swapAmt > 0) amt1 = _executeSwap(token0, token1, swapAmt, slip);
                amt0 = remaining - swapAmt;
            } else {
                uint256 swapAmt = FullMath.mulDiv(remaining, w0, wTotal);
                if (swapAmt > 0) amt0 = _executeSwap(token1, token0, swapAmt, slip);
                amt1 = remaining - swapAmt;
            }
        }

        uint256 liquidityBefore = (tokenId == 0) ? 0 : _getTotalLiquidity();

        uint160 sqrtPL2 = TickMath.getSqrtRatioAtTick(tL);
        uint160 sqrtPU2 = TickMath.getSqrtRatioAtTick(tU);
        (uint160 sqrtP2,,,) = IStateView(STATE_VIEW).getSlot0(poolId);
        uint256 liquidity = _getLiquidityForAmounts(sqrtP2, sqrtPL2, sqrtPU2, amt0, amt1);
        require(liquidity > 0, "Zero liquidity from zap");

        uint128 liquidityAdded;

        if (tokenId == 0) {
            uint256 nextId = IPositionManager(POSITION_MANAGER).nextTokenId();
            bytes memory actions = abi.encodePacked(ACT_MINT_POSITION, ACT_SETTLE_PAIR);
            bytes[] memory params = new bytes[](2);
            params[0] = abi.encode(_poolKey(), tL, tU, liquidity, uint128(amt0), uint128(amt1), address(this), bytes(""));
            params[1] = abi.encode(token0, token1);
            IPositionManager(POSITION_MANAGER).modifyLiquidities(abi.encode(actions, params), block.timestamp + 600);
            tokenId = nextId;
            liquidityAdded = uint128(liquidity);
            emit PositionReceived(nextId);
        } else {
            bytes memory actions = abi.encodePacked(ACT_INCREASE_LIQUIDITY, ACT_SETTLE_PAIR);
            bytes[] memory params = new bytes[](2);
            params[0] = abi.encode(tokenId, liquidity, uint128(amt0), uint128(amt1), bytes(""));
            params[1] = abi.encode(token0, token1);
            IPositionManager(POSITION_MANAGER).modifyLiquidities(abi.encode(actions, params), block.timestamp + 600);
            liquidityAdded = uint128(liquidity);
        }

        // Share accounting
        if (totalShares == 0) {
            shares = uint256(liquidityAdded);
        } else {
            require(liquidityBefore > 0, "Invariant");
            shares = (uint256(liquidityAdded) * totalShares) / liquidityBefore;
        }
        totalShares            += shares;
        userShares[msg.sender] += shares;

        // Return unused dust from this zap
        uint256 post0 = IERC20(token0).balanceOf(address(this));
        uint256 post1 = IERC20(token1).balanceOf(address(this));
        if (post0 > pre0) require(IERC20(token0).transfer(msg.sender, post0 - pre0), "dust0");
        if (post1 > pre1) require(IERC20(token1).transfer(msg.sender, post1 - pre1), "dust1");

        emit ZappedIn(msg.sender, tokenIn, amountIn, zapFee, liquidityAdded, shares);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Compound
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Collect accrued LP fees (via DECREASE_LIQUIDITY with 0 liquidity),
    ///         deduct protocol fees, swap to the correct ratio, and re-add as liquidity.
    ///         Only callable by whitelisted keepers.
    function compound() external onlyKeeper {
        require(tokenId != 0, "No position");

        // 1. Snapshot and reset fee-free carryover from a previous partial compound
        uint256 carryover0 = pendingReinvest0;
        uint256 carryover1 = pendingReinvest1;
        pendingReinvest0 = 0;
        pendingReinvest1 = 0;

        // 2. Collect fees via DECREASE_LIQUIDITY(0) + TAKE_PAIR to this vault.
        //    In V4, a zero-liquidity decrease flushes accumulated fees without
        //    removing any principal from the position.
        uint256 pre0 = IERC20(token0).balanceOf(address(this));
        uint256 pre1 = IERC20(token1).balanceOf(address(this));

        bytes memory collectActions = abi.encodePacked(ACT_DECREASE_LIQUIDITY, ACT_TAKE_PAIR);
        bytes[] memory collectParams = new bytes[](2);
        collectParams[0] = abi.encode(tokenId, uint256(0), uint128(0), uint128(0), bytes(""));
        collectParams[1] = abi.encode(token0, token1, address(this));
        IPositionManager(POSITION_MANAGER).modifyLiquidities(
            abi.encode(collectActions, collectParams), block.timestamp + 600
        );

        // Fresh fees collected this call (exclude pre-existing carryover)
        uint256 freshFee0 = IERC20(token0).balanceOf(address(this)) - pre0 - carryover0;
        uint256 freshFee1 = IERC20(token1).balanceOf(address(this)) - pre1 - carryover1;

        if (freshFee0 == 0 && freshFee1 == 0 && carryover0 == 0 && carryover1 == 0) return;

        // 3. Protocol fees on FRESH fees only (not on carryover – already stripped)
        address executor = msg.sender;
        uint256 daoFee0      = freshFee0 * DAO_FEE_BPS      / 10_000;
        uint256 daoFee1      = freshFee1 * DAO_FEE_BPS      / 10_000;
        uint256 executorFee0 = freshFee0 * EXECUTOR_FEE_BPS / 10_000;
        uint256 executorFee1 = freshFee1 * EXECUTOR_FEE_BPS / 10_000;

        uint256 compound0 = (freshFee0 - daoFee0 - executorFee0) + carryover0;
        uint256 compound1 = (freshFee1 - daoFee1 - executorFee1) + carryover1;

        // 4. Read position tick range and current price for rebalance
        (int24 tL, int24 tU) = _getPositionTicks();
        (uint160 sqrtPriceX96, int24 currentTick,,) = IStateView(STATE_VIEW).getSlot0(poolId);

        // 5. Swap to the position's required ratio
        (uint256 final0, uint256 final1) = _rebalance(
            compound0, compound1,
            sqrtPriceX96, currentTick,
            tL, tU,
            maxSlippageBps
        );

        if (final0 == 0 && final1 == 0) {
            pendingReinvest0 = IERC20(token0).balanceOf(address(this));
            pendingReinvest1 = IERC20(token1).balanceOf(address(this));
            return;
        }

        bool positionInRange = currentTick > tL && currentTick < tU;
        if (positionInRange && (final0 == 0 || final1 == 0)) {
            pendingReinvest0 = IERC20(token0).balanceOf(address(this));
            pendingReinvest1 = IERC20(token1).balanceOf(address(this));
            return;
        }

        // 6. Compute liquidity from reinvest amounts
        uint160 sqrtPL = TickMath.getSqrtRatioAtTick(tL);
        uint160 sqrtPU = TickMath.getSqrtRatioAtTick(tU);
        uint256 liqToAdd = _getLiquidityForAmounts(sqrtPriceX96, sqrtPL, sqrtPU, final0, final1);

        if (liqToAdd == 0) {
            pendingReinvest0 = IERC20(token0).balanceOf(address(this));
            pendingReinvest1 = IERC20(token1).balanceOf(address(this));
            return;
        }

        // 7. Re-add as liquidity
        bytes memory addActions = abi.encodePacked(ACT_INCREASE_LIQUIDITY, ACT_SETTLE_PAIR);
        bytes[] memory addParams = new bytes[](2);
        addParams[0] = abi.encode(tokenId, liqToAdd, uint128(final0), uint128(final1), bytes(""));
        addParams[1] = abi.encode(token0, token1);

        uint128 liquidityAdded;
        try IPositionManager(POSITION_MANAGER).modifyLiquidities(
            abi.encode(addActions, addParams), block.timestamp + 600
        ) {
            liquidityAdded = uint128(liqToAdd);
        } catch {
            pendingReinvest0 = IERC20(token0).balanceOf(address(this));
            pendingReinvest1 = IERC20(token1).balanceOf(address(this));
            return;
        }

        // 8. Pay DAO and executor after successful liquidity addition
        if (daoFee0 > 0) require(IERC20(token0).transfer(dao,      daoFee0),      "dao fee0");
        if (daoFee1 > 0) require(IERC20(token1).transfer(dao,      daoFee1),      "dao fee1");
        if (executorFee0 > 0) require(IERC20(token0).transfer(executor, executorFee0), "exec fee0");
        if (executorFee1 > 0) require(IERC20(token1).transfer(executor, executorFee1), "exec fee1");

        emit FeesDistributed(executor, daoFee0, daoFee1, executorFee0, executorFee1);

        // Remaining tokens are fee-free carryover for the next compound
        pendingReinvest0 = IERC20(token0).balanceOf(address(this));
        pendingReinvest1 = IERC20(token1).balanceOf(address(this));

        emit Compounded(freshFee0, freshFee1, liquidityAdded);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Rebalance fee tokens to the ratio the position requires.
    ///      Identical logic to V3 compounder – only the swap call differs.
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

        // Out-of-range edge cases
        if (currentTick <= tickLower) {
            if (fee1 > 0) {
                try this._swapWithSlippage(token1, token0, fee1, slippageBps) returns (uint256 out) {
                    return (fee0 + out, 0);
                } catch {
                    emit SwapSkipped(token1, token0, fee1, slippageBps);
                }
            }
            return (fee0, 0);
        }
        if (currentTick >= tickUpper) {
            if (fee0 > 0) {
                try this._swapWithSlippage(token0, token1, fee0, slippageBps) returns (uint256 out) {
                    return (0, fee1 + out);
                } catch {
                    emit SwapSkipped(token0, token1, fee0, slippageBps);
                }
            }
            return (0, fee1);
        }

        // Price inside range – compute 50/50 value split
        uint256 Q96 = 2 ** 96;
        uint256 sqrtPUminusP = uint256(sqrtPU) - uint256(sqrtP);
        uint256 sqrtPminusPL = uint256(sqrtP)  - uint256(sqrtPL);

        uint256 numeratorR   = FullMath.mulDiv(sqrtPminusPL, FullMath.mulDiv(uint256(sqrtP), uint256(sqrtPU), Q96), Q96);
        uint256 denominatorR = sqrtPUminusP;

        if (numeratorR == 0) return (fee0, fee1);

        uint256 fee1InToken0 = FullMath.mulDiv(fee1, denominatorR, numeratorR);
        uint256 totalVal0    = fee0 + fee1InToken0;
        uint256 want0        = totalVal0 / 2;

        if (want0 <= fee0) {
            uint256 effectiveWant0 = (want0 == 0 && fee0 > 0) ? 1 : want0;
            uint256 swapAmt = fee0 - effectiveWant0;
            if (swapAmt > 0) {
                try this._swapWithSlippage(token0, token1, swapAmt, slippageBps) returns (uint256 out) {
                    return (fee0 - swapAmt, fee1 + out);
                } catch {
                    emit SwapSkipped(token0, token1, swapAmt, slippageBps);
                }
            }
        } else {
            uint256 want1         = FullMath.mulDiv(totalVal0 / 2, numeratorR, denominatorR);
            uint256 effectiveWant1 = (want1 == 0 && fee1 > 0) ? 1 : want1;
            uint256 swapAmt = fee1 > effectiveWant1 ? fee1 - effectiveWant1 : 0;
            if (swapAmt > 0) {
                try this._swapWithSlippage(token1, token0, swapAmt, slippageBps) returns (uint256 out) {
                    return (fee0 + out, fee1 - swapAmt);
                } catch {
                    emit SwapSkipped(token1, token0, swapAmt, slippageBps);
                }
            }
        }

        return (fee0, fee1);
    }

    /// @dev Execute a V4 exact-input single-pool swap via the Universal Router.
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint16  slippageBps
    ) private returns (uint256 amountOut) {
        uint256 amountOutMin = _calcAmountOutMin(tokenIn, amountIn, slippageBps);
        uint256 pre = IERC20(tokenOut).balanceOf(address(this));

        // Encode V4_SWAP command
        bytes memory commands = abi.encodePacked(CMD_V4_SWAP);
        bytes[] memory inputs = new bytes[](1);

        bytes memory swapActions = abi.encodePacked(ACT_SWAP_EXACT_IN_SINGLE, ACT_SETTLE_ALL, ACT_TAKE_ALL);
        bytes[] memory swapParams = new bytes[](3);
        swapParams[0] = abi.encode(ExactInputSingleParams({
            poolKey:          _poolKey(),
            zeroForOne:       tokenIn == token0,
            // forge-lint: disable-next-line(unsafe-typecast)
            amountIn:         uint128(amountIn),         // safe: token amounts bounded by total supply
            // forge-lint: disable-next-line(unsafe-typecast)
            amountOutMinimum: uint128(amountOutMin),     // safe: derived from spot price * (1 - slippage)
            minHopPriceX36:   0,
            hookData:         bytes("")
        }));
        swapParams[1] = abi.encode(tokenIn,  amountIn);
        swapParams[2] = abi.encode(tokenOut, amountOutMin);
        inputs[0] = abi.encode(swapActions, swapParams);

        IUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs, block.timestamp + 600);

        amountOut = IERC20(tokenOut).balanceOf(address(this)) - pre;
        require(amountOut >= amountOutMin, "Insufficient output");
    }

    /// @dev External wrapper so _rebalance can use try/catch.  Internal-only.
    function _swapWithSlippage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint16  slippageBps
    ) public returns (uint256) {
        require(msg.sender == address(this), "internal only");
        return _executeSwap(tokenIn, tokenOut, amountIn, slippageBps);
    }

    /// @dev Minimum acceptable output for a swap using the spot price from StateView.
    ///      Note: V4 core does not have a built-in TWAP oracle; spot price is used.
    function _calcAmountOutMin(
        address tokenIn,
        uint256 amountIn,
        uint16  slippageBps
    ) internal view returns (uint256) {
        (uint160 sqrtPriceX96,,,) = IStateView(STATE_VIEW).getSlot0(poolId);
        uint256 sqrtP   = sqrtPriceX96;
        uint256 Q96     = 2 ** 96;
        uint256 price96 = FullMath.mulDiv(sqrtP, sqrtP, Q96);  // token1/token0 in Q96
        require(price96 > 0, "Price zero");

        uint256 rawOut;
        if (tokenIn == token0) {
            rawOut = FullMath.mulDiv(amountIn, price96, Q96);
        } else {
            rawOut = FullMath.mulDiv(amountIn, Q96, price96);
        }

        // Deduct pool fee (same unit as V3: 1_000_000 base)
        uint256 afterPoolFee = rawOut * (1_000_000 - uint256(poolFee)) / 1_000_000;
        return afterPoolFee * (10_000 - slippageBps) / 10_000;
    }

    /// @dev Total liquidity held in the vault's V4 position.
    function _getTotalLiquidity() internal view returns (uint256) {
        return uint256(IPositionManager(POSITION_MANAGER).getPositionLiquidity(tokenId));
    }

    /// @dev Reconstruct the PoolKey from stored fields.
    function _poolKey() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0:   token0,
            currency1:   token1,
            fee:         poolFee,
            tickSpacing: poolTickSpacing,
            hooks:       poolHooks
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PositionInfo decoding
    //  PositionInfo is a packed uint256 with layout (LSB → MSB):
    //    bits   7..0 : hasSubscriber flag
    //    bits  31..8 : tickLower  (24 bits, TICK_LOWER_OFFSET = 8)
    //    bits 55..32 : tickUpper  (24 bits, TICK_UPPER_OFFSET = 32)
    //    bits 255..56: truncated poolId
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Decode tickLower from a packed PositionInfo uint256.
    function _tickLower(uint256 info) internal pure returns (int24 tL) {
        assembly { tL := signextend(2, shr(8, info)) }
    }

    /// @dev Decode tickUpper from a packed PositionInfo uint256.
    function _tickUpper(uint256 info) internal pure returns (int24 tU) {
        assembly { tU := signextend(2, shr(32, info)) }
    }

    /// @dev Read the packed PositionInfo for the vault's tokenId from
    ///      the PositionManager's public positionInfo mapping.
    function _getPositionInfo() internal view returns (uint256) {
        // positionInfo(uint256) is a public mapping exposed as a view function
        // Selector: bytes4(keccak256("positionInfo(uint256)"))
        (bool ok, bytes memory data) = POSITION_MANAGER.staticcall(
            abi.encodeWithSignature("positionInfo(uint256)", tokenId)
        );
        require(ok, "positionInfo call failed");
        return abi.decode(data, (uint256));
    }

    function _getPositionTicks() internal view returns (int24 tL, int24 tU) {
        uint256 info = _getPositionInfo();
        tL = _tickLower(info);
        tU = _tickUpper(info);
    }

    function _getTickLower() internal view returns (int24) {
        return _tickLower(_getPositionInfo());
    }

    function _getTickUpper() internal view returns (int24) {
        return _tickUpper(_getPositionInfo());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LiquidityAmounts (inline – identical to v3-core LiquidityAmounts)
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Compute the maximum liquidity receivable for given token amounts.
    function _getLiquidityForAmounts(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceLower,
        uint160 sqrtPriceUpper,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint256 liquidity) {
        if (sqrtPriceX96 <= sqrtPriceLower) {
            liquidity = _getLiquidityForAmount0(sqrtPriceLower, sqrtPriceUpper, amount0);
        } else if (sqrtPriceX96 >= sqrtPriceUpper) {
            liquidity = _getLiquidityForAmount1(sqrtPriceLower, sqrtPriceUpper, amount1);
        } else {
            uint256 l0 = _getLiquidityForAmount0(sqrtPriceX96, sqrtPriceUpper, amount0);
            uint256 l1 = _getLiquidityForAmount1(sqrtPriceLower, sqrtPriceX96, amount1);
            liquidity = l0 < l1 ? l0 : l1;
        }
    }

    /// @dev L = amount0 × sqrtPL × sqrtPU / (sqrtPU − sqrtPL) / Q96
    function _getLiquidityForAmount0(
        uint160 sqrtPL,
        uint160 sqrtPU,
        uint256 amount0
    ) internal pure returns (uint256) {
        uint256 Q96 = 2 ** 96;
        uint256 intermediate = FullMath.mulDiv(uint256(sqrtPL), uint256(sqrtPU), Q96);
        return FullMath.mulDiv(amount0, intermediate, uint256(sqrtPU) - uint256(sqrtPL));
    }

    /// @dev L = amount1 × Q96 / (sqrtPU − sqrtPL)
    function _getLiquidityForAmount1(
        uint160 sqrtPL,
        uint160 sqrtPU,
        uint256 amount1
    ) internal pure returns (uint256) {
        return FullMath.mulDiv(amount1, 2 ** 96, uint256(sqrtPU) - uint256(sqrtPL));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setDao(address _dao) external onlyOwner {
        require(_dao != address(0), "Zero address");
        dao = _dao;
        emit DaoUpdated(_dao);
    }

    function addKeeper(address _keeper) external onlyOwner {
        require(_keeper != address(0), "Zero address");
        isKeeper[_keeper] = true;
        emit KeeperAdded(_keeper);
    }

    function removeKeeper(address _keeper) external onlyOwner {
        isKeeper[_keeper] = false;
        emit KeeperRemoved(_keeper);
    }

    function setMaxSlippage(uint16 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 1000, "Slippage too high");
        maxSlippageBps = _maxSlippageBps;
        emit MaxSlippageUpdated(_maxSlippageBps);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "rescue failed");
    }

    /// @notice Accept an existing V4 position NFT transferred directly to this vault.
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

    /// @notice Total liquidity in the vault's V4 position.
    function totalLiquidity() external view returns (uint128) {
        if (tokenId == 0) return 0;
        return IPositionManager(POSITION_MANAGER).getPositionLiquidity(tokenId);
    }

    /// @notice Liquidity attributable to a specific user.
    function userLiquidity(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (userShares[user] * _getTotalLiquidity()) / totalShares;
    }
}
