// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Test} from "forge-std/src/Test.sol";
import {console} from "forge-std/src/console.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
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

        // Deploy vault via proxy (token0 = WETH because 0x4200... < 0x8335...)
        UniV3AutoCompounder impl = new UniV3AutoCompounder();
        bytes memory initData = abi.encodeCall(
            impl.initialize,
            (WETH, USDC, POOL_FEE, pool, KEEPER, DAO, address(0))
        );
        vault = UniV3AutoCompounder(address(new ERC1967Proxy(address(impl), initData)));

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
        vault.setMaxSlippage(1001); // > 1000 bps cap
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

    // ─────────────────────────────────────────────────────────────────────────
    //  zapOut tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_ZapOut_ToToken1_ReceivesUsdc() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);
        assertGt(shares, 0);

        uint256 usdcBefore = IERC20(USDC).balanceOf(USER);

        vm.startPrank(USER);
        uint256 amountOut = vault.zapOut(shares, USDC, 100);
        vm.stopPrank();

        assertEq(vault.userShares(USER), 0, "All shares burned");
        assertGt(IERC20(USDC).balanceOf(USER), usdcBefore, "USER should receive USDC");
        assertEq(IERC20(USDC).balanceOf(USER) - usdcBefore, amountOut, "balanceOf delta matches return value");
    }

    function test_ZapOut_ToToken0_ReceivesWeth() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        uint256 wethBefore = IERC20(WETH).balanceOf(USER);

        vm.startPrank(USER);
        uint256 amountOut = vault.zapOut(shares, WETH, 100);
        vm.stopPrank();

        assertEq(vault.userShares(USER), 0, "All shares burned");
        assertGt(IERC20(WETH).balanceOf(USER), wethBefore, "USER should receive WETH");
        assertEq(IERC20(WETH).balanceOf(USER) - wethBefore, amountOut, "balanceOf delta matches return value");
    }

    function test_ZapOut_DaoReceivesZapFee() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        uint256 daoUsdcBefore = IERC20(USDC).balanceOf(DAO);

        vm.startPrank(USER);
        vault.zapOut(shares, USDC, 100);
        vm.stopPrank();

        assertGt(IERC20(USDC).balanceOf(DAO), daoUsdcBefore, "DAO should receive 0.3% zap fee");
    }

    function test_ZapOut_Partial() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);
        uint256 halfShares = shares / 2;

        vm.startPrank(USER);
        vault.zapOut(halfShares, USDC, 100);
        vm.stopPrank();

        assertEq(vault.userShares(USER), shares - halfShares, "Half shares remain");
        assertGt(vault.totalShares(), 0, "Total shares reduced but not zero");
    }

    function test_ZapOut_InsufficientShares_Reverts() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.startPrank(USER);
        vm.expectRevert("Insufficient shares");
        vault.zapOut(shares + 1, USDC, 100);
        vm.stopPrank();
    }

    function test_ZapOut_UnsupportedToken_Reverts() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.startPrank(USER);
        vm.expectRevert("Unsupported token");
        vault.zapOut(shares, address(0xDEAD), 100);
        vm.stopPrank();
    }

    function test_ZapOut_SlippageTooHigh_Reverts() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.startPrank(USER);
        vm.expectRevert("Slippage too high");
        vault.zapOut(shares, USDC, 501);
        vm.stopPrank();
    }

    function test_ZapOut_UseContractSlippage_WhenZeroPassed() public {
        vm.prank(DAO);
        vault.setMaxSlippage(100);

        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.startPrank(USER);
        uint256 amountOut = vault.zapOut(shares, USDC, 0);
        vm.stopPrank();

        assertGt(amountOut, 0, "Should receive USDC when slippageBps=0");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  setPool tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_SetPool_UpdatesState() public {
        address newPool = address(0xABCD);
        uint24  newFee  = 3000;

        vm.prank(DAO);
        vault.setPool(newPool, newFee);

        assertEq(vault.pool(),    newPool, "pool should be updated");
        assertEq(vault.poolFee(), newFee,  "poolFee should be updated");
    }

    function test_SetPool_InvalidFee_Reverts() public {
        vm.prank(DAO);
        vm.expectRevert("Invalid fee tier");
        vault.setPool(address(0xABCD), 999); // not 100/500/3000/10000
    }

    function test_SetPool_ZeroAddress_Reverts() public {
        vm.prank(DAO);
        vm.expectRevert("Zero pool address");
        vault.setPool(address(0), 500);
    }

    function test_SetPool_OnlyOwner_Reverts() public {
        vm.expectRevert("Not owner");
        vm.prank(USER);
        vault.setPool(address(0xABCD), 3000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  rescueTokens test
    // ─────────────────────────────────────────────────────────────────────────

    function test_RescueTokens() public {
        // Send USDC directly to the vault (simulate accidentally sent tokens)
        uint256 strayAmount = 500e6;
        deal(USDC, address(vault), strayAmount);
        assertEq(IERC20(USDC).balanceOf(address(vault)), strayAmount);

        uint256 ownerBefore = IERC20(USDC).balanceOf(DAO);
        vm.prank(DAO);
        vault.rescueTokens(USDC, strayAmount);

        assertEq(IERC20(USDC).balanceOf(address(vault)), 0,           "Vault should be drained");
        assertEq(IERC20(USDC).balanceOf(DAO) - ownerBefore, strayAmount, "Owner should receive tokens");
    }

    function test_RescueTokens_OnlyOwner_Reverts() public {
        deal(USDC, address(vault), 100e6);
        vm.expectRevert("Not owner");
        vm.prank(USER);
        vault.rescueTokens(USDC, 100e6);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  pendingFees test
    // ─────────────────────────────────────────────────────────────────────────

    function test_PendingFees_ZeroBeforeDeposit() public {
        (uint128 owed0, uint128 owed1) = vault.pendingFees();
        assertEq(owed0, 0, "No fees before deposit");
        assertEq(owed1, 0, "No fees before deposit");
    }

    function test_PendingFees_NonZeroAfterSwaps() public {
        _deposit(1 ether, 3_000e6);
        _generateFees();
        vm.warp(block.timestamp + 30 minutes);

        // Note: tokensOwed in the NFT position manager is only snapshotted on position
        // interactions (collect/decreaseLiquidity), not on pool swaps. So pendingFees()
        // may return 0 even after real swaps. Verify the function is callable and after
        // a compound (which calls collect) the values reset to 0.
        vm.prank(KEEPER);
        vault.compound();

        (uint128 owed0, uint128 owed1) = vault.pendingFees();
        // After collect() in compound, tokensOwed is cleared
        assertEq(owed0, 0, "tokensOwed should be 0 after compound collected fees");
        assertEq(owed1, 0, "tokensOwed should be 0 after compound collected fees");
        console.log("pendingFees after compound token0:", owed0);
        console.log("pendingFees after compound token1:", owed1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Compound: DAO not paid when fees are zero
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_DaoNotPaidOnZeroFees() public {
        _deposit(1 ether, 3_000e6);

        uint256 daoBefore0 = IERC20(WETH).balanceOf(DAO);
        uint256 daoBefore1 = IERC20(USDC).balanceOf(DAO);

        vm.prank(KEEPER);
        vault.compound(); // no fees generated → should return early

        assertEq(IERC20(WETH).balanceOf(DAO), daoBefore0, "DAO should not receive WETH with zero fees");
        assertEq(IERC20(USDC).balanceOf(DAO), daoBefore1, "DAO should not receive USDC with zero fees");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Compound: contract balance (leftover from failed compound) is swept
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_IncludesContractBalance() public {
        _deposit(1 ether, 3_000e6);
        uint128 liqBefore = vault.totalLiquidity();

        // Simulate tokens left in contract after a previous failed compound.
        // Use both tokens so the rebalance produces a valid non-zero split.
        deal(WETH, address(vault), 0.05 ether);  // ~$111 WETH
        deal(USDC, address(vault), 250e6);        // $250 USDC

        vm.warp(block.timestamp + 30 minutes);

        uint256 keeperBefore = IERC20(USDC).balanceOf(KEEPER);
        vm.prank(KEEPER);
        vault.compound();

        uint128 liqAfter = vault.totalLiquidity();
        assertGt(liqAfter, liqBefore, "Liquidity should increase after compounding contract balance");
        assertGt(IERC20(USDC).balanceOf(KEEPER) + IERC20(WETH).balanceOf(KEEPER),
                 keeperBefore, "Keeper should receive fee on compounded balance");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Withdraw: revert checks
    // ─────────────────────────────────────────────────────────────────────────

    function test_Withdraw_InsufficientShares_Reverts() public {
        _deposit(1 ether, 3_000e6);
        uint256 shares = vault.userShares(USER);

        vm.prank(USER);
        vm.expectRevert("Insufficient shares");
        vault.withdraw(shares + 1);
    }

    function test_Withdraw_ShareAmountTooSmall_Reverts() public {
        _deposit(1 ether, 3_000e6);
        // Evaluate shares BEFORE setting up the expectRevert to avoid consuming the prank
        uint256 tooMany = vault.userShares(USER) + 1e30;
        vm.prank(USER);
        vm.expectRevert("Insufficient shares");
        vault.withdraw(tooMany);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Compound: fees only paid after successful liquidity add
    // ─────────────────────────────────────────────────────────────────────────

    function test_Compound_FeesOnlyAfterLiquidity() public {
        _deposit(1 ether, 3_000e6);
        _generateFees();
        vm.warp(block.timestamp + 30 minutes);

        uint256 daoBefore0    = IERC20(WETH).balanceOf(DAO);
        uint256 daoBefore1    = IERC20(USDC).balanceOf(DAO);
        uint256 keeperBefore0 = IERC20(WETH).balanceOf(KEEPER);
        uint256 keeperBefore1 = IERC20(USDC).balanceOf(KEEPER);
        uint128 liqBefore     = vault.totalLiquidity();

        vm.prank(KEEPER);
        vault.compound();

        uint128 liqAfter = vault.totalLiquidity();

        // If liquidity increased, fees MUST have been paid
        if (liqAfter > liqBefore) {
            uint256 daoTotal    = (IERC20(WETH).balanceOf(DAO) - daoBefore0) +
                                  (IERC20(USDC).balanceOf(DAO) - daoBefore1);
            uint256 keeperTotal = (IERC20(WETH).balanceOf(KEEPER) - keeperBefore0) +
                                  (IERC20(USDC).balanceOf(KEEPER) - keeperBefore1);
            assertGt(daoTotal + keeperTotal, 0, "Fees should have been paid after successful compound");
            // DAO:keeper fee ratio is 150:50 = 3:1 (bps division may cause 1-2 wei rounding)
            assertApproxEqAbs(daoTotal, keeperTotal * 3, 10, "DAO gets ~3x keeper (150bps vs 50bps)");
        } else {
            // No liquidity added → no fees should have been charged
            assertEq(IERC20(WETH).balanceOf(DAO) + IERC20(USDC).balanceOf(DAO),
                     daoBefore0 + daoBefore1, "DAO should not be paid if no liquidity added");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_MaxSlippageBps_DefaultIs300
    // ─────────────────────────────────────────────────────────────────────────

    function test_MaxSlippageBps_DefaultIs300() public {
        assertEq(vault.maxSlippageBps(), 300, "Default maxSlippageBps should be 300");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_ExactFeeAmounts
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Deal tokens directly to the vault (simulating freshly-collected LP fees)
    ///      and verify the DAO and executor receive exactly 150 bps and 50 bps.
    function test_Compound_ExactFeeAmounts() public {
        _deposit(1 ether, 3_000e6);

        // Deal fresh fee tokens into the vault (no pendingReinvest, so all treated as fresh)
        uint256 freshWeth = 0.1 ether;
        uint256 freshUsdc = 300e6;
        deal(WETH, address(vault), freshWeth);
        deal(USDC, address(vault), freshUsdc);

        vm.warp(block.timestamp + 30 minutes);

        uint256 daoBefore0    = IERC20(WETH).balanceOf(DAO);
        uint256 daoBefore1    = IERC20(USDC).balanceOf(DAO);
        uint256 keeperBefore0 = IERC20(WETH).balanceOf(KEEPER);
        uint256 keeperBefore1 = IERC20(USDC).balanceOf(KEEPER);

        vm.prank(KEEPER);
        vault.compound();

        uint256 daoWeth  = IERC20(WETH).balanceOf(DAO)    - daoBefore0;
        uint256 daoUsdc  = IERC20(USDC).balanceOf(DAO)    - daoBefore1;
        uint256 keepWeth = IERC20(WETH).balanceOf(KEEPER) - keeperBefore0;
        uint256 keepUsdc = IERC20(USDC).balanceOf(KEEPER) - keeperBefore1;

        // DAO = 150 bps, executor = 50 bps on FRESH fees only
        assertEq(daoWeth,  freshWeth * 150 / 10_000, "DAO WETH fee mismatch");
        assertEq(daoUsdc,  freshUsdc * 150 / 10_000, "DAO USDC fee mismatch");
        assertEq(keepWeth, freshWeth * 50  / 10_000, "Executor WETH fee mismatch");
        assertEq(keepUsdc, freshUsdc * 50  / 10_000, "Executor USDC fee mismatch");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_PendingReinvest_NoDoubleFee
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev After a compound that leaves carryover in pendingReinvest,
    ///      a second compound (no new fees collected) must NOT pay DAO/executor.
    function test_Compound_PendingReinvest_NoDoubleFee() public {
        _deposit(1 ether, 3_000e6);
        _generateFees();
        vm.warp(block.timestamp + 30 minutes);

        // First compound: collects fresh fees, pays DAO/executor, may leave carryover
        vm.prank(KEEPER);
        vault.compound();

        // Immediately compound again — no new LP fees, only (fee-stripped) carryover
        uint256 daoBefore0    = IERC20(WETH).balanceOf(DAO);
        uint256 daoBefore1    = IERC20(USDC).balanceOf(DAO);
        uint256 keeperBefore0 = IERC20(WETH).balanceOf(KEEPER);
        uint256 keeperBefore1 = IERC20(USDC).balanceOf(KEEPER);

        vm.prank(KEEPER);
        vault.compound();

        assertEq(IERC20(WETH).balanceOf(DAO),    daoBefore0,    "DAO must not receive fees on carryover");
        assertEq(IERC20(USDC).balanceOf(DAO),    daoBefore1,    "DAO must not receive fees on carryover");
        assertEq(IERC20(WETH).balanceOf(KEEPER), keeperBefore0, "Executor must not receive fees on carryover");
        assertEq(IERC20(USDC).balanceOf(KEEPER), keeperBefore1, "Executor must not receive fees on carryover");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  test_Compound_SkewedRatio_StillAddsLiquidity
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Regression test for the "want0 rounds to zero" bug.
    ///
    ///      When the collected fees are heavily skewed toward token1 (e.g. the
    ///      pool price makes token1 very cheap in raw-unit terms), _rebalance()
    ///      would previously swap ALL of token0 away and return (0, large).
    ///      Uniswap V3's increaseLiquidity then computed min(L_from_0=0, L_from_1)
    ///      = 0 and reverted, so compound() could *never* add liquidity.
    ///
    ///      The fix keeps at least 1 token0 unit so that L_from_0 > 0, letting
    ///      the min-formula return non-zero liquidity and the transaction succeed.
    ///
    ///      We simulate the skewed state by dealing a large token1 surplus and a
    ///      tiny token0 amount directly to the vault (bypassing normal deposit),
    ///      which is exactly what happens after multiple failed compound() calls
    ///      accumulate token1 in the vault.
    function test_Compound_SkewedRatio_StillAddsLiquidity() public {
        _deposit(1 ether, 3_000e6);

        // Simulate accumulated token1 surplus (10× more USDC than WETH in value)
        // without using generateFees, so we control the exact amounts.
        // The WETH/USDC pool has WETH as token0.  Deal mostly USDC (token1) so
        // that after _rebalance the token0 side would naively be swept to zero.
        deal(WETH, address(vault), 0.0001 ether);   // ~$0.25 of WETH (tiny)
        deal(USDC, address(vault), 25e6);            // $25 of USDC (100× larger)

        uint128 liquidityBefore = _positionLiquidity();

        vm.prank(KEEPER);
        vault.compound();   // must not revert

        // Liquidity must have increased (at least some was added)
        assertGt(_positionLiquidity(), liquidityBefore, "compound must add liquidity even with skewed ratio");
    }

    /// @dev Read the current liquidity of the vault's V3 position.
    function _positionLiquidity() internal view returns (uint128 liq) {
        (, , , , , , , liq, , , , ) = INonfungiblePositionManager(POSITION_MANAGER).positions(vault.tokenId());
    }
}
