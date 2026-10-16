pragma solidity ^0.8.26;

import {Test} from "forge-std/src/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UniV4AutoCompounder, PoolKey} from "../src/UniV4AutoCompounder.sol";
import {AutoCompoundVault, IRouter} from "../src/autocompounder.sol";

contract AccountingToken is ERC20 {
    constructor() ERC20("Accounting token", "ACT") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract AccountingPositionManager {
    uint256 public nextTokenId = 1;
    mapping(uint256 => uint128) public getPositionLiquidity;
    mapping(uint256 => uint256) public positionInfo;

    function donateLiquidity(uint256 positionId, uint128 amount) external {
        getPositionLiquidity[positionId] += amount;
    }

    function modifyLiquidities(bytes calldata unlockData, uint256) external payable {
        (bytes memory actions, bytes[] memory params) = abi.decode(unlockData, (bytes, bytes[]));
        uint256 positionId;
        uint256 liquidity;
        uint128 amount0;
        uint128 amount1;
        address token0 = UniV4AutoCompounder(msg.sender).token0();
        address token1 = UniV4AutoCompounder(msg.sender).token1();
        if (uint8(actions[0]) == 0x02) {
            PoolKey memory key;
            int24 tickLower;
            int24 tickUpper;
            address recipient;
            bytes memory hookData;
            (key, tickLower, tickUpper, liquidity, amount0, amount1, recipient, hookData) =
                abi.decode(params[0], (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes));
            positionId = nextTokenId++;
            positionInfo[positionId] = (uint256(uint24(tickLower)) << 8) | (uint256(uint24(tickUpper)) << 32);
        } else {
            bytes memory hookData;
            (positionId, liquidity, amount0, amount1, hookData) =
                abi.decode(params[0], (uint256, uint256, uint128, uint128, bytes));
        }
        if (uint8(actions[0]) == 0x01) {
            getPositionLiquidity[positionId] -= uint128(liquidity);
        } else {
            IERC20(token0).transferFrom(msg.sender, address(this), amount0);
            IERC20(token1).transferFrom(msg.sender, address(this), amount1);
            getPositionLiquidity[positionId] += uint128(liquidity);
        }
    }
}

contract UniV4ShareAccountingTest is Test {
    UniV4AutoCompounder vault;
    AccountingPositionManager manager;
    AccountingToken token0;
    AccountingToken token1;
    address constant FIRST = address(0xA11CE);
    address constant SECOND = address(0xB0B);

    function setUp() public {
        AccountingToken firstToken = new AccountingToken();
        AccountingToken secondToken = new AccountingToken();
        (token0, token1) = address(firstToken) < address(secondToken)
            ? (firstToken, secondToken) : (secondToken, firstToken);
        UniV4AutoCompounder implementation = new UniV4AutoCompounder();
        AccountingPositionManager managerImplementation = new AccountingPositionManager();
        AccountingPositionManager routerImplementation = new AccountingPositionManager();
        AccountingPositionManager stateViewImplementation = new AccountingPositionManager();
        AccountingPositionManager permit2Implementation = new AccountingPositionManager();
        address positionManager = address(managerImplementation);
        address universalRouter = address(routerImplementation);
        address stateView = address(stateViewImplementation);
        address permit2 = address(permit2Implementation);
        manager = managerImplementation;
        vm.store(address(manager), bytes32(0), bytes32(uint256(1)));
        vm.mockCall(permit2, abi.encodeWithSignature("approve(address,address,uint160,uint48)"), bytes(""));
        vm.mockCall(stateView, abi.encodeWithSignature("getSlot0(bytes32)"),
            abi.encode(uint160(2 ** 96), int24(0), uint24(0), uint24(500)));
        vault = UniV4AutoCompounder(address(new ERC1967Proxy(address(implementation), abi.encodeCall(
            UniV4AutoCompounder.initialize,
            (address(token0), address(token1), uint24(500), int24(60), address(0), address(this), address(this), address(0),
                positionManager, universalRouter, stateView, permit2)
        ))));
        token0.mint(FIRST, 1e24);
        token0.mint(SECOND, 1e24);
        vm.prank(address(vault));
        token0.approve(address(manager), type(uint256).max);
        vm.prank(address(vault));
        token1.approve(address(manager), type(uint256).max);
        vm.prank(FIRST);
        token0.approve(address(vault), type(uint256).max);
        vm.prank(SECOND);
        token0.approve(address(vault), type(uint256).max);
    }

    function _enter(address user, uint256 amount, bool zapEntry) internal {
        vm.prank(user);
        if (zapEntry) vault.zap(address(token0), amount, 0, 60, 120);
        else vault.deposit(amount, 0, 60, 120);
    }

    function testFuzz_FirstEntryLocksShares(bool zapEntry) public {
        _enter(FIRST, 1e6, zapEntry);
        assertEq(vault.totalShares(), manager.getPositionLiquidity(vault.tokenId()));
        assertEq(vault.totalShares() - vault.userShares(FIRST), vault.MINIMUM_LIQUIDITY());
        assertEq(vault.userShares(address(0)), 0);
        uint256 shares = vault.userShares(FIRST);
        vm.prank(FIRST);
        vault.withdraw(shares);
        assertEq(vault.totalShares(), vault.MINIMUM_LIQUIDITY());
        assertEq(manager.getPositionLiquidity(vault.tokenId()), vault.MINIMUM_LIQUIDITY());
    }

    function testFuzz_TinySeedReverts(bool zapEntry) public {
        uint256 balanceBefore = token0.balanceOf(FIRST);
        vm.expectRevert("Deposit too small to seed vault");
        _enter(FIRST, 1, zapEntry);
        assertEq(vault.totalShares(), 0);
        assertEq(vault.tokenId(), 0);
        assertEq(token0.balanceOf(FIRST), balanceBefore);
    }

    function testFuzz_InflatedLiquidityCannotConsumeZeroShareEntry(bool firstZap, bool secondZap) public {
        _enter(FIRST, 4, firstZap);
        manager.donateLiquidity(vault.tokenId(), 1e24);
        uint256 balanceBefore = token0.balanceOf(SECOND);
        uint256 liquidityBefore = manager.getPositionLiquidity(vault.tokenId());
        uint256 sharesBefore = vault.totalShares();
        vm.expectRevert("Zero shares");
        _enter(SECOND, 1e6, secondZap);
        assertEq(token0.balanceOf(SECOND), balanceBefore);
        assertEq(manager.getPositionLiquidity(vault.tokenId()), liquidityBefore);
        assertEq(vault.totalShares(), sharesBefore);
        assertEq(vault.userShares(SECOND), 0);
    }

    function testFuzz_SecondEntryPricedAgainstExistingLiquidity(bool firstZap, bool secondZap) public {
        _enter(FIRST, 1e6, firstZap);
        uint256 liquidityBefore = manager.getPositionLiquidity(vault.tokenId());
        uint256 sharesBefore = vault.totalShares();
        _enter(SECOND, 1e6, secondZap);
        uint256 added = manager.getPositionLiquidity(vault.tokenId()) - liquidityBefore;
        assertEq(vault.userShares(SECOND), added * sharesBefore / liquidityBefore);
    }
}

contract AccountingGauge {
    mapping(address => uint256) public balanceOf;
    AccountingToken public lpToken;

    function configure(AccountingToken token) external { lpToken = token; }

    function deposit(uint256 amount) external {
        lpToken.transferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        lpToken.transfer(msg.sender, amount);
    }

    function donate(address recipient, uint256 amount) external {
        lpToken.mint(address(this), amount);
        balanceOf[recipient] += amount;
    }
}

contract AccountingRouter {
    AccountingToken public lpToken;

    function configure(AccountingToken token) external { lpToken = token; }

    function swapExactTokensForTokens(uint256 amount, uint256, IRouter.Route[] calldata routes, address to, uint256)
        external returns (uint256[] memory amounts)
    {
        IERC20(routes[0].from).transferFrom(msg.sender, address(this), amount);
        AccountingToken(routes[0].to).mint(to, amount);
        amounts = new uint256[](2);
        amounts[0] = amount;
        amounts[1] = amount;
    }

    function addLiquidity(address tokenA, address tokenB, bool, uint256 amountA, uint256 amountB,
        uint256, uint256, address to, uint256) external returns (uint256, uint256, uint256)
    {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        lpToken.mint(to, amountA + amountB);
        return (amountA, amountB, amountA + amountB);
    }

    function removeLiquidity(address tokenA, address tokenB, bool, uint256 liquidity, uint256, uint256,
        address to, uint256) external returns (uint256, uint256)
    {
        lpToken.transferFrom(msg.sender, address(this), liquidity);
        uint256 amountA = liquidity / 2;
        uint256 amountB = liquidity - amountA;
        AccountingToken(tokenA).mint(to, amountA);
        AccountingToken(tokenB).mint(to, amountB);
        return (amountA, amountB);
    }
}

contract AutoCompoundVaultShareAccountingTest is Test {
    AutoCompoundVault vault;
    AccountingToken usdc;
    AccountingGauge gauge;
    address constant FIRST = address(0xA11CE);
    address constant SECOND = address(0xB0B);

    function setUp() public {
        vault = new AutoCompoundVault(address(this));
        AccountingToken tokenImplementation = new AccountingToken();
        vm.etch(vault.usdcToken(), address(tokenImplementation).code);
        vm.etch(vault.itpToken(), address(tokenImplementation).code);
        vm.etch(vault.liquidityPool(), address(tokenImplementation).code);
        AccountingRouter routerImplementation = new AccountingRouter();
        vm.etch(vault.dexRouter(), address(routerImplementation).code);
        AccountingRouter(vault.dexRouter()).configure(AccountingToken(vault.liquidityPool()));
        AccountingGauge gaugeImplementation = new AccountingGauge();
        vm.etch(vault.stakingGauge(), address(gaugeImplementation).code);
        gauge = AccountingGauge(vault.stakingGauge());
        gauge.configure(AccountingToken(vault.liquidityPool()));
        usdc = AccountingToken(vault.usdcToken());
        usdc.mint(FIRST, 1_000_000e6);
        usdc.mint(SECOND, 1_000_000e6);
        vm.prank(FIRST);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(SECOND);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _deposit(address user, uint256 amount) internal {
        vm.prank(user);
        vault.deposit(amount);
    }

    function test_EqualDepositsGetEqualSharesAndWithdrawals() public {
        _deposit(FIRST, 1_000e6);
        _deposit(SECOND, 1_000e6);
        assertEq(vault.userShares(FIRST), vault.userShares(SECOND));
        assertEq(vault.totalShares(), vault.getTotalVaultValue());
        uint256 balanceBefore = usdc.balanceOf(SECOND);
        uint256 shares = vault.userShares(SECOND);
        vm.prank(SECOND);
        vault.withdraw(shares);
        assertEq(usdc.balanceOf(SECOND) - balanceBefore, 1_000e6);
        assertEq(vault.getTotalVaultValue(), 1_000e6);
    }

    function test_SmallDepositCannotClaimMajorityOrProfit() public {
        _deposit(FIRST, 100_000e6);
        _deposit(SECOND, 1_000e6);
        assertEq(vault.userShares(SECOND), 1_000e6);
        assertEq(vault.totalShares(), 101_000e6);
        assertLt(vault.userShares(SECOND) * 100 / vault.totalShares(), 1);
        uint256 balanceBefore = usdc.balanceOf(SECOND);
        uint256 shares = vault.userShares(SECOND);
        vm.prank(SECOND);
        vault.withdraw(shares);
        assertEq(usdc.balanceOf(SECOND) - balanceBefore, 1_000e6);
    }

    function test_CompoundedLiquidityBelongsToExistingShares() public {
        _deposit(FIRST, 1_000e6);
        gauge.donate(address(vault), 1_000e6);
        _deposit(SECOND, 1_000e6);
        assertEq(vault.userShares(FIRST), 1_000e6);
        assertEq(vault.userShares(SECOND), 500e6);
        uint256 balanceBefore = usdc.balanceOf(SECOND);
        uint256 shares = vault.userShares(SECOND);
        vm.prank(SECOND);
        vault.withdraw(shares);
        assertEq(usdc.balanceOf(SECOND) - balanceBefore, 1_000e6);
    }

    function test_ZeroShareDepositRevertsWithoutTakingFunds() public {
        _deposit(FIRST, 2);
        gauge.donate(address(vault), 1e24);
        uint256 balanceBefore = usdc.balanceOf(SECOND);
        uint256 liquidityBefore = vault.getTotalVaultValue();
        vm.expectRevert("Zero shares");
        _deposit(SECOND, 2);
        assertEq(usdc.balanceOf(SECOND), balanceBefore);
        assertEq(vault.getTotalVaultValue(), liquidityBefore);
        assertEq(vault.userShares(SECOND), 0);
    }
}

contract AutoCompoundVaultShareAccountingForkTest is Test {
    function test_OptimismDepositUsesPreStakeLiquidity() public {
        if (!vm.envOr("RUN_VAULT_ACCOUNTING_FORK", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(vm.envOr("OPTIMISM_RPC_URL", string("https://optimism-rpc.publicnode.com")));
        AutoCompoundVault vault = new AutoCompoundVault(address(this));
        address first = address(0xA11CE);
        address second = address(0xB0B);
        uint256 amount = 1_000e6;
        deal(vault.usdcToken(), first, amount);
        deal(vault.usdcToken(), second, amount);
        vm.startPrank(first);
        IERC20(vault.usdcToken()).approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
        uint256 liquidityBefore = vault.getTotalVaultValue();
        uint256 sharesBefore = vault.totalShares();
        vm.startPrank(second);
        IERC20(vault.usdcToken()).approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
        uint256 liquidityAdded = vault.getTotalVaultValue() - liquidityBefore;
        assertGt(liquidityAdded, 0);
        assertEq(vault.userShares(second), liquidityAdded * sharesBefore / liquidityBefore);
        assertGt(vault.userShares(second), liquidityAdded * sharesBefore / vault.getTotalVaultValue());
    }
}