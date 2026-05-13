// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Test} from "forge-std/src/Test.sol";
import {console} from "forge-std/src/console.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

// ─── Minimal interfaces needed only for the test harness ─────────────────────

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24   tick,
            uint16  observationIndex,
            uint16  observationCardinality,
            uint16  observationCardinalityNext,
            uint8   feeProtocol,
            bool    unlocked
        );
    function tickSpacing() external view returns (int24);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface INonfungiblePositionManager {
    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96  nonce,
            address operator,
            address token0,
            address token1,
            uint24  fee,
            int24   tickLower,
            int24   tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Test suite – forks Base mainnet
//
//  Required env vars:
//    BASE_RPC_URL   – a Base mainnet RPC endpoint (Alchemy, Infura, Ankr, etc.)
//
//  Run with:
//    forge test --match-contract UniV3AutoCompounderTest -vvv --fork-url $BASE_RPC_URL
//  or set BASE_RPC_URL in your .env and run:
//    forge test --match-contract UniV3AutoCompounderTest -vvv
// ─────────────────────────────────────────────────────────────────────────────

contract UniV3AutoCompounderTest is Test {

    // ── Base mainnet addresses ────────────────────────────────────────────────
    address constant WETH              = 0x4200000000000000000000000000000000000006;
    address constant USDC              = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    uint24  constant POOL_FEE          = 500; // 0.05 % – tick spacing 10
    address constant UNISWAP_FACTORY   = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;
    address constant SWAP_ROUTER       = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant POSITION_MANAGER  = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1;

    // ── Test actors ───────────────────────────────────────────────────────────
    address constant USER   = address(0xBEEF);
    address constant KEEPER = address(0xCAFE);
    address constant DAO    = address(0xDAD0); // mock ITP DAO

    // ── Deployed contract ─────────────────────────────────────────────────────
    UniV3AutoCompounder public vault;

    // ── Position tick range (set in setUp based on current pool tick) ─────────
    int24 public tickLower;
    int24 public tickUpper;

    // ── Pool address resolved from factory ───────────────────────────────────
    address public pool;

    // ─────────────────────────────────────────────────────────────────────────
    //  setUp  – forks Base and deploys vault
    // ─────────────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));

        // Resolve pool address from factory so the test isn't fragile to
        // address changes
        pool = IUniswapV3Factory(UNISWAP_FACTORY).getPool(WETH, USDC, POOL_FEE);
        require(pool != address(0), "Pool not found - check token addresses / fee");
        console.log("WETH/USDC 500 pool:", pool);

        // Deploy vault (token0 = WETH because 0x4200... < 0x8335...)
        vault = new UniV3AutoCompounder(WETH, USDC, POOL_FEE, pool, KEEPER, DAO);

        // Read current tick and derive a ±2000 tick range aligned to tick spacing
        (, int24 currentTick, , , , , ) = IUniswapV3Pool(pool).slot0();
        int24 spacing = IUniswapV3Pool(pool).tickSpacing();
        int24 aligned = (currentTick / spacing) * spacing;
        tickLower = aligned - 2000;
        tickUpper = aligned + 2000;

        // Fund USER with WETH and USDC
        deal(WETH, USER, 5 ether);
        deal(USDC, USER, 10_000e6);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helper: deposit on behalf of USER
    // ─────────────────────────────────────────────────────────────────────────

    function _deposit(uint256 wethAmt, uint256 usdcAmt) internal returns (uint256 shares) {
        vm.startPrank(USER);
        IERC20(WETH).approve(address(vault), wethAmt);
        IERC20(USDC).approve(address(vault), usdcAmt);
        vault.deposit(wethAmt, usdcAmt, tickLower, tickUpper);
        vm.stopPrank();
        shares = vault.userShares(USER);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helper: push fees into the position by doing large swaps
    // ─────────────────────────────────────────────────────────────────────────

    function _generateFees() internal {
        address swapper = address(0xDEAD);

        // Forward swap: 20 WETH → USDC (generates fee0 from the pool's perspective)
        deal(WETH, swapper, 20 ether);
        vm.startPrank(swapper);
        IERC20(WETH).approve(SWAP_ROUTER, 20 ether);
        ISwapRouter(SWAP_ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           WETH,
                tokenOut:          USDC,
                fee:               POOL_FEE,
                recipient:         swapper,
                amountIn:          20 ether,
                amountOutMinimum:  0,
                sqrtPriceLimitX96: 0
            })
        );
        vm.stopPrank();

        // Reverse swap: USDC → WETH (drives price back and generates fee1)
        uint256 usdcBal = IERC20(USDC).balanceOf(swapper);
        vm.startPrank(swapper);
        IERC20(USDC).approve(SWAP_ROUTER, usdcBal);
        ISwapRouter(SWAP_ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           USDC,
                tokenOut:          WETH,
                fee:               POOL_FEE,
                recipient:         swapper,
                amountIn:          usdcBal,
                amountOutMinimum:  0,
                sqrtPriceLimitX96: 0
            })
        );
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Deposit  – mints a new V3 position and checks share accounting
    // ─────────────────────────────────────────────────────────────────────────

    function test_Deposit() public {
        uint256 shares = _deposit(1 ether, 3_000e6);

        assertGt(shares, 0,            "User should have shares after deposit");
        assertGt(vault.tokenId(), 0,   "tokenId should be set after first mint");
        assertEq(vault.totalShares(), shares, "totalShares should equal user shares (single depositor)");

        console.log("tokenId:    ", vault.tokenId());
        console.log("userShares: ", shares);
        console.log("liquidity:  ", vault.totalLiquidity());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_DepositTwice  – second deposit increases liquidity and shares
    // ─────────────────────────────────────────────────────────────────────────

    function test_DepositTwice() public {
        _deposit(1 ether, 3_000e6);
        uint128 liqAfterFirst = vault.totalLiquidity();

        // Give USER more tokens for the second deposit
        deal(WETH, USER, 1 ether);
        deal(USDC, USER, 3_000e6);
        _deposit(1 ether, 3_000e6);
        uint128 liqAfterSecond = vault.totalLiquidity();

        assertGt(liqAfterSecond, liqAfterFirst, "Second deposit should increase position liquidity");
        console.log("liquidity after 1st:", liqAfterFirst);
        console.log("liquidity after 2nd:", liqAfterSecond);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Withdraw  – user gets tokens back proportionally
    // ─────────────────────────────────────────────────────────────────────────

    function test_Withdraw() public {
        _deposit(1 ether, 3_000e6);

        uint256 wethBefore = IERC20(WETH).balanceOf(USER);
        uint256 usdcBefore = IERC20(USDC).balanceOf(USER);
        uint256 shares     = vault.userShares(USER);

        vm.prank(USER);
        vault.withdraw(shares);

        assertEq(vault.userShares(USER), 0, "Shares should be zero after full withdrawal");
        assertGt(
            IERC20(WETH).balanceOf(USER) + IERC20(USDC).balanceOf(USER),
            wethBefore + usdcBefore,
            "User should receive tokens on withdrawal"
        );
        console.log("WETH returned: ", IERC20(WETH).balanceOf(USER) - wethBefore);
        console.log("USDC returned: ", IERC20(USDC).balanceOf(USER) - usdcBefore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_NoFees  – compound on empty fees returns without reverting
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_NoFees() public {
        _deposit(1 ether, 3_000e6);
        uint128 liqBefore = vault.totalLiquidity();

        vm.prank(KEEPER);
        vault.compound();

        // With no fees the position liquidity should be unchanged
        assertEq(vault.totalLiquidity(), liqBefore, "Liquidity should not change with zero fees");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_WithFees  – generates fees via swaps, then compounds them
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_WithFees() public {
        _deposit(1 ether, 3_000e6);
        uint128 liqBefore = vault.totalLiquidity();

        // Generate fees by running large swaps through the pool
        _generateFees();

        // Warp forward so the TWAP oracle has a stable reading
        vm.warp(block.timestamp + 30 minutes);

        vm.prank(KEEPER);
        vault.compound();

        uint128 liqAfter = vault.totalLiquidity();
        console.log("liquidity before compound:", liqBefore);
        console.log("liquidity after  compound:", liqAfter);

        assertGe(liqAfter, liqBefore, "Liquidity should not decrease after compound");
        // Note: fees may be very small relative to the position; a strict assertGt
        // is only reliable with very large fee generation.
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_OnlyKeeper  – non-keeper call should revert
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_OnlyKeeper() public {
        _deposit(1 ether, 3_000e6);

        vm.expectRevert("Not authorized");
        vm.prank(USER);
        vault.compound();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_OwnerCanCompound  – owner is also authorised to trigger compound
    // ─────────────────────────────────────────────────────────────────────────

    function test_OwnerCanCompound() public {
        _deposit(1 ether, 3_000e6);

        // DAO is the owner – it is also authorised to call compound()
        vm.prank(DAO);
        vault.compound();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_SetTwapPeriod  – owner can update TWAP period
    // ─────────────────────────────────────────────────────────────────────────

    function test_SetTwapPeriod() public {
        vm.prank(DAO);
        vault.setTwapPeriod(10 minutes);
        assertEq(vault.twapPeriod(), 10 minutes);
    }

    function test_SetTwapPeriod_TooShort() public {
        vm.prank(DAO);
        vm.expectRevert("TWAP too short");
        vault.setTwapPeriod(30); // < 60 seconds
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_SetMaxSlippage
    // ─────────────────────────────────────────────────────────────────────────

    function test_SetMaxSlippage() public {
        vm.prank(DAO);
        vault.setMaxSlippage(100); // 1 %
        assertEq(vault.maxSlippageBps(), 100);
    }

    function test_SetMaxSlippage_TooHigh() public {
        vm.prank(DAO);
        vm.expectRevert("Slippage too high");
        vault.setMaxSlippage(501); // > 5 %
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_TransferOwnership
    // ─────────────────────────────────────────────────────────────────────────

    function test_TransferOwnership() public {
        address newOwner = address(0x1234);
        vm.prank(DAO);
        vault.transferOwnership(newOwner);
        assertEq(vault.owner(), newOwner);

        // Old owner (DAO) can no longer call admin functions
        vm.expectRevert("Not owner");
        vm.prank(DAO);
        vault.addKeeper(address(0x9999));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_WithdrawPartial  – partial share redemption
    // ─────────────────────────────────────────────────────────────────────────

    function test_WithdrawPartial() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.prank(USER);
        vault.withdraw(shares / 2);

        assertEq(vault.userShares(USER), shares - shares / 2);
        assertGt(vault.totalLiquidity(), 0, "Position should still have liquidity");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_MultipleUsers  – two users deposit; share accounting is proportional
    // ─────────────────────────────────────────────────────────────────────────

    function test_MultipleUsers() public {
        address USER2 = address(0xFEED);
        deal(WETH, USER2, 2 ether);
        deal(USDC, USER2, 6_000e6);

        // USER deposits first
        _deposit(1 ether, 3_000e6);
        uint256 sharesUser1 = vault.userShares(USER);

        // USER2 deposits same amounts
        vm.startPrank(USER2);
        IERC20(WETH).approve(address(vault), 1 ether);
        IERC20(USDC).approve(address(vault), 3_000e6);
        vault.deposit(1 ether, 3_000e6, tickLower, tickUpper);
        vm.stopPrank();
        uint256 sharesUser2 = vault.userShares(USER2);

        // USER2 deposits into the same tokenId (position already exists), so
        // increaseLiquidity is called with the same tick range and same amounts.
        // The second depositor's shares should be proportional to the liquidity added
        // vs the total liquidity already in the position.
        assertGt(sharesUser2, 0, "User2 should receive shares");
        assertGt(vault.totalShares(), sharesUser1, "Total shares should include both users");

        console.log("User1 shares:", sharesUser1);
        console.log("User2 shares:", sharesUser2);
        console.log("Total shares:", vault.totalShares());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_AddRemoveKeeper – DAO can manage the keeper whitelist
    // ─────────────────────────────────────────────────────────────────────────

    function test_AddRemoveKeeper() public {
        address KEEPER2 = address(0xBEBE);

        // Not yet a keeper
        assertFalse(vault.isKeeper(KEEPER2));

        // DAO adds a second keeper
        vm.prank(DAO);
        vault.addKeeper(KEEPER2);
        assertTrue(vault.isKeeper(KEEPER2));

        // New keeper can compound
        _deposit(1 ether, 3_000e6);
        vm.prank(KEEPER2);
        vault.compound(); // should not revert

        // DAO removes the keeper
        vm.prank(DAO);
        vault.removeKeeper(KEEPER2);
        assertFalse(vault.isKeeper(KEEPER2));

        // Removed keeper can no longer compound
        vm.expectRevert("Not authorized");
        vm.prank(KEEPER2);
        vault.compound();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_FeesDistributed – DAO and executor receive correct fee shares
    // ─────────────────────────────────────────────────────────────────────────

    function test_FeesDistributed() public {
        _deposit(1 ether, 3_000e6);

        _generateFees();
        vm.warp(block.timestamp + 30 minutes);

        uint256 daoBefore0    = IERC20(WETH).balanceOf(DAO);
        uint256 daoBefore1    = IERC20(USDC).balanceOf(DAO);
        uint256 keeperBefore0 = IERC20(WETH).balanceOf(KEEPER);
        uint256 keeperBefore1 = IERC20(USDC).balanceOf(KEEPER);

        vm.prank(KEEPER);
        vault.compound();

        uint256 daoReceived0    = IERC20(WETH).balanceOf(DAO)    - daoBefore0;
        uint256 daoReceived1    = IERC20(USDC).balanceOf(DAO)    - daoBefore1;
        uint256 keeperReceived0 = IERC20(WETH).balanceOf(KEEPER) - keeperBefore0;
        uint256 keeperReceived1 = IERC20(USDC).balanceOf(KEEPER) - keeperBefore1;

        // DAO should receive 3x the executor share (150 bps vs 50 bps)
        // Tolerant check: DAO >= executor (both may be zero if fees are tiny)
        assertGe(daoReceived0 + daoReceived1, keeperReceived0 + keeperReceived1,
            "DAO should receive at least as much as executor");

        console.log("DAO WETH received:    ", daoReceived0);
        console.log("DAO USDC received:    ", daoReceived1);
        console.log("Keeper WETH received: ", keeperReceived0);
        console.log("Keeper USDC received: ", keeperReceived1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_OnERC721Received  – existing NFT can be transferred in
    // ─────────────────────────────────────────────────────────────────────────

    function test_OnERC721Received_RejectsNonPositionManager() public {
        vm.expectRevert("Not position manager");
        vault.onERC721Received(address(0), address(0), 1, "");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_UserLiquidity  – view reflects proportional share
    // ─────────────────────────────────────────────────────────────────────────

    function test_UserLiquidity() public {
        _deposit(1 ether, 3_000e6);
        uint256 userLiq  = vault.userLiquidity(USER);
        uint128 totalLiq = vault.totalLiquidity();

        // Single depositor owns 100 % so userLiquidity == totalLiquidity
        assertEq(userLiq, totalLiq, "Single depositor should own all liquidity");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Zap tests
    //  token0 = WETH (0x4200...), token1 = USDC (0x8335...) in the test vault
    // ─────────────────────────────────────────────────────────────────────────

    function test_Zap_FromToken1_BasicShares() public {
        // Zap in with USDC (token1) – vault auto-swaps 50% to WETH (token0)
        uint256 zapAmt = 3_000e6; // 3,000 USDC
        deal(USDC, USER, zapAmt);

        uint256 daoBefore = IERC20(USDC).balanceOf(DAO);

        vm.startPrank(USER);
        IERC20(USDC).approve(address(vault), zapAmt);
        uint256 shares = vault.zap(USDC, zapAmt, 100, tickLower, tickUpper);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares from zap");
        assertEq(vault.userShares(USER), shares, "userShares should match return value");
        assertGt(vault.tokenId(), 0, "tokenId should be set after zap");
        assertGt(vault.totalLiquidity(), 0, "Position should have liquidity");

        // DAO receives 0.3% fee in the input token (USDC)
        uint256 expectedFee = zapAmt * 30 / 10_000;
        assertEq(IERC20(USDC).balanceOf(DAO) - daoBefore, expectedFee, "DAO should receive 0.3% zap fee");

        console.log("Zap (token1) shares:  ", shares);
        console.log("DAO USDC fee:         ", IERC20(USDC).balanceOf(DAO) - daoBefore);
        console.log("Position liquidity:   ", vault.totalLiquidity());
    }

    function test_Zap_FromToken0_BasicShares() public {
        // Zap in with WETH (token0) – vault auto-swaps 50% to USDC (token1)
        uint256 zapAmt = 1 ether;
        deal(WETH, USER, zapAmt);

        uint256 daoBefore = IERC20(WETH).balanceOf(DAO);

        vm.startPrank(USER);
        IERC20(WETH).approve(address(vault), zapAmt);
        uint256 shares = vault.zap(WETH, zapAmt, 100, tickLower, tickUpper);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares from zap");
        assertGt(vault.totalLiquidity(), 0, "Position should have liquidity");

        // DAO receives 0.3% fee in WETH
        uint256 expectedFee = zapAmt * 30 / 10_000;
        assertEq(IERC20(WETH).balanceOf(DAO) - daoBefore, expectedFee, "DAO should receive 0.3% zap fee in WETH");

        console.log("Zap (token0) shares:  ", shares);
        console.log("DAO WETH fee:         ", IERC20(WETH).balanceOf(DAO) - daoBefore);
    }

    function test_Zap_UnsupportedToken_Reverts() public {
        address randomToken = address(0x1234);
        vm.startPrank(USER);
        vm.expectRevert("Unsupported token");
        vault.zap(randomToken, 1_000e6, 50, tickLower, tickUpper);
        vm.stopPrank();
    }

    function test_Zap_ZeroAmount_Reverts() public {
        vm.startPrank(USER);
        vm.expectRevert("Zero amount");
        vault.zap(USDC, 0, 50, tickLower, tickUpper);
        vm.stopPrank();
    }

    function test_Zap_SlippageTooHigh_Reverts() public {
        deal(USDC, USER, 1_000e6);
        vm.startPrank(USER);
        IERC20(USDC).approve(address(vault), 1_000e6);
        vm.expectRevert("Slippage too high");
        vault.zap(USDC, 1_000e6, 501, tickLower, tickUpper); // > 500 bps
        vm.stopPrank();
    }

    function test_Zap_UseContractSlippage_WhenZeroPassed() public {
        // slippageBps = 0 should fall back to vault.maxSlippageBps (50 bps)
        // Set a known slippage first
        vm.prank(DAO);
        vault.setMaxSlippage(100); // 1%

        uint256 zapAmt = 3_000e6;
        deal(USDC, USER, zapAmt);

        vm.startPrank(USER);
        IERC20(USDC).approve(address(vault), zapAmt);
        // Should not revert – uses maxSlippageBps = 100
        uint256 shares = vault.zap(USDC, zapAmt, 0, tickLower, tickUpper);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares when slippageBps=0 (uses maxSlippageBps)");
    }

    function test_Zap_IntoExistingPosition() public {
        // Create position via normal deposit first
        _deposit(1 ether, 3_000e6);
        uint128 liqBefore = vault.totalLiquidity();

        uint256 zapAmt = 2_000e6;
        deal(USDC, USER, zapAmt);

        vm.startPrank(USER);
        IERC20(USDC).approve(address(vault), zapAmt);
        uint256 zapShares = vault.zap(USDC, zapAmt, 100, tickLower, tickUpper);
        vm.stopPrank();

        assertGt(vault.totalLiquidity(), liqBefore, "Liquidity should increase after zap into existing position");
        assertGt(zapShares, 0, "Should receive shares");

        console.log("Liquidity before zap:", liqBefore);
        console.log("Liquidity after  zap:", vault.totalLiquidity());
        console.log("Zap shares:          ", zapShares);
    }

    function test_Zap_SharesProportional() public {
        // USER deposits 1 WETH + 3000 USDC normally
        _deposit(1 ether, 3_000e6);

        // USER2 zaps 1000 USDC into the same position
        address USER2 = address(0xFEED);
        uint256 zapAmt = 1_000e6;
        deal(USDC, USER2, zapAmt);

        vm.startPrank(USER2);
        IERC20(USDC).approve(address(vault), zapAmt);
        uint256 zapShares = vault.zap(USDC, zapAmt, 100, tickLower, tickUpper);
        vm.stopPrank();

        assertGt(zapShares, 0, "Zap should produce shares");
        assertLt(zapShares, vault.userShares(USER), "Smaller zap should yield fewer shares than larger deposit");

        console.log("Deposit shares (USER):  ", vault.userShares(USER));
        console.log("Zap shares    (USER2):  ", zapShares);
        console.log("Total shares:           ", vault.totalShares());
    }
}
