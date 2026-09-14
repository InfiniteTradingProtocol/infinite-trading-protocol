// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/src/Test.sol";
import { TraderRouter } from "../src/TraderRouter.sol";
import { IPoolLogic, IPoolManagerLogic } from "../src/interfaces/IdHEDGE.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  Mocks reproducing dHEDGE V2 authorisation semantics verbatim.
//  Auth checks are transcribed from dhedge/V2-Public PoolLogicLib.execTransaction
//  and PoolManagerLogic, so a passing test means the router satisfies the real
//  `msg.sender == trader` gate.
// ─────────────────────────────────────────────────────────────────────────────

contract MockPoolManagerLogic {
    address public manager;
    address public trader;
    address public poolLogic;
    bool public traderAssetChangeDisabled;
    bool public traderPrivacyChangeEnabled;

    uint256 public maxSupplyCap;
    bool public privatePool;
    uint256 public changeAssetsCalls;

    constructor(address _manager, address _poolLogic) {
        manager = _manager;
        poolLogic = _poolLogic;
    }

    function setTrader(address _trader) external {
        require(msg.sender == manager, "dh4");
        trader = _trader;
    }

    function setTraderAssetChangeDisabled(bool _disabled) external {
        require(msg.sender == manager, "dh4");
        traderAssetChangeDisabled = _disabled;
    }

    function setTraderPrivacyChangeEnabled(bool _enabled) external {
        require(msg.sender == manager, "dh4");
        traderPrivacyChangeEnabled = _enabled;
    }

    function changeAssets(IPoolManagerLogic.Asset[] calldata, address[] calldata) external {
        require(
            (msg.sender == trader && !traderAssetChangeDisabled) || msg.sender == manager,
            "only manager, owner or trader enabled"
        );
        changeAssetsCalls++;
    }

    function setPoolPrivate(bool _privatePool) external {
        require(
            (msg.sender == trader && traderPrivacyChangeEnabled) || msg.sender == manager,
            "only manager or trader enabled"
        );
        privatePool = _privatePool;
    }

    function setMaxSupplyCap(uint256 _cap) external {
        require(msg.sender == trader || msg.sender == manager, "only manager or trader");
        maxSupplyCap = _cap;
    }
}

contract MockPoolLogic {
    address public poolManagerLogic;
    uint256 public mintManagerFeeCalls;

    function setPoolManagerLogic(address _pml) external {
        poolManagerLogic = _pml;
    }

    /// @dev Mirrors PoolLogicLib.execTransaction's authorisation branch.
    function execTransaction(address to, bytes calldata data) external returns (bool) {
        MockPoolManagerLogic pml = MockPoolManagerLogic(poolManagerLogic);
        require(msg.sender == pml.manager() || msg.sender == pml.trader(), "dh24");
        require(to != address(0), "dh18");
        (bool ok,) = to.call(data);
        require(ok, "target call failed");
        return true;
    }

    function execTransactions(IPoolLogic.TxToExecute[] calldata txs) external {
        MockPoolManagerLogic pml = MockPoolManagerLogic(poolManagerLogic);
        require(msg.sender == pml.manager() || msg.sender == pml.trader(), "dh24");
        for (uint256 i; i < txs.length; ++i) {
            (bool ok,) = txs[i].to.call(txs[i].data);
            require(ok, "target call failed");
        }
    }

    function mintManagerFee() external {
        mintManagerFeeCalls++;
    }
}

/// @dev Stand-in for a DEX / protocol the vault trades against.
contract MockTarget {
    uint256 public counter;
    bool public shouldRevert;

    function bump() external {
        require(!shouldRevert, "MockTarget: boom");
        counter++;
    }

    function setShouldRevert(bool v) external {
        shouldRevert = v;
    }
}

contract TraderRouterTest is Test {
    TraderRouter internal router;

    MockPoolLogic internal vaultA;
    MockPoolLogic internal vaultB;
    MockPoolManagerLogic internal pmlA;
    MockPoolManagerLogic internal pmlB;
    MockTarget internal target;

    address internal dao = address(0xDA0);
    address internal guardian = address(0x6DA);
    address internal manager = address(0x11A);
    address internal operator = address(0x09E);
    address internal attacker = address(0xBAD);

    function setUp() public {
        target = new MockTarget();

        vaultA = new MockPoolLogic();
        pmlA = new MockPoolManagerLogic(manager, address(vaultA));
        vaultA.setPoolManagerLogic(address(pmlA));

        vaultB = new MockPoolLogic();
        pmlB = new MockPoolManagerLogic(manager, address(vaultB));
        vaultB.setPoolManagerLogic(address(pmlB));

        address[] memory ops = new address[](1);
        ops[0] = operator;
        router = new TraderRouter(dao, guardian, ops);

        // The one-time multisig migration.
        vm.startPrank(manager);
        pmlA.setTrader(address(router));
        pmlB.setTrader(address(router));
        vm.stopPrank();
    }

    // ─── Core forwarding ─────────────────────────────────────────────────────

    function test_OperatorCanExecTransaction() public {
        vm.prank(operator);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));
        assertEq(target.counter(), 1);
    }

    function test_NonOperatorCannotExecTransaction() public {
        vm.prank(attacker);
        vm.expectRevert(TraderRouter.NotOperator.selector);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));
    }

    /// @dev The whole point: an EOA that used to be the trader is now powerless.
    function test_DirectVaultCallByOldTraderReverts() public {
        vm.prank(operator);
        vm.expectRevert(bytes("dh24"));
        vaultA.execTransaction(address(target), abi.encodeCall(MockTarget.bump, ()));
    }

    function test_ExecTransactionsBatchesWithinVault() public {
        IPoolLogic.TxToExecute[] memory txs = new IPoolLogic.TxToExecute[](2);
        txs[0] = IPoolLogic.TxToExecute(address(target), abi.encodeCall(MockTarget.bump, ()));
        txs[1] = IPoolLogic.TxToExecute(address(target), abi.encodeCall(MockTarget.bump, ()));

        vm.prank(operator);
        router.execTransactions(address(vaultA), txs);
        assertEq(target.counter(), 2);
    }

    function test_ExecTransactionsMultiSpansVaults() public {
        address[] memory vaults = new address[](2);
        vaults[0] = address(vaultA);
        vaults[1] = address(vaultB);

        address[] memory tos = new address[](2);
        tos[0] = address(target);
        tos[1] = address(target);

        bytes[] memory datas = new bytes[](2);
        datas[0] = abi.encodeCall(MockTarget.bump, ());
        datas[1] = abi.encodeCall(MockTarget.bump, ());

        vm.prank(operator);
        router.execTransactionsMulti(vaults, tos, datas);
        assertEq(target.counter(), 2);
    }

    function test_ExecTransactionsMultiRejectsLengthMismatch() public {
        address[] memory vaults = new address[](2);
        address[] memory tos = new address[](1);
        bytes[] memory datas = new bytes[](1);

        vm.prank(operator);
        vm.expectRevert(TraderRouter.LengthMismatch.selector);
        router.execTransactionsMulti(vaults, tos, datas);
    }

    /// @dev A failing leg must roll back the whole batch, matching vault semantics.
    function test_FailedLegRevertsWholeBatch() public {
        target.setShouldRevert(true);

        IPoolLogic.TxToExecute[] memory txs = new IPoolLogic.TxToExecute[](1);
        txs[0] = IPoolLogic.TxToExecute(address(target), abi.encodeCall(MockTarget.bump, ()));

        vm.prank(operator);
        vm.expectRevert();
        router.execTransactions(address(vaultA), txs);
        assertEq(target.counter(), 0);
    }

    // ─── PoolManagerLogic surface ────────────────────────────────────────────

    function test_ChangeAssets() public {
        IPoolManagerLogic.Asset[] memory add = new IPoolManagerLogic.Asset[](1);
        add[0] = IPoolManagerLogic.Asset(address(target), true);

        vm.prank(operator);
        router.changeAssets(address(vaultA), add, new address[](0));
        assertEq(pmlA.changeAssetsCalls(), 1);
    }

    function test_ChangeAssetsRespectsManagerDisableFlag() public {
        vm.prank(manager);
        pmlA.setTraderAssetChangeDisabled(true);

        IPoolManagerLogic.Asset[] memory add = new IPoolManagerLogic.Asset[](1);
        add[0] = IPoolManagerLogic.Asset(address(target), true);

        vm.prank(operator);
        vm.expectRevert(bytes("only manager, owner or trader enabled"));
        router.changeAssets(address(vaultA), add, new address[](0));
    }

    function test_SetPoolPrivateRequiresManagerOptIn() public {
        vm.prank(operator);
        vm.expectRevert(bytes("only manager or trader enabled"));
        router.setPoolPrivate(address(vaultA), true);

        vm.prank(manager);
        pmlA.setTraderPrivacyChangeEnabled(true);

        vm.prank(operator);
        router.setPoolPrivate(address(vaultA), true);
        assertTrue(pmlA.privatePool());
    }

    function test_SetMaxSupplyCap() public {
        vm.prank(operator);
        router.setMaxSupplyCap(address(vaultA), 123e18);
        assertEq(pmlA.maxSupplyCap(), 123e18);
    }

    function test_MintManagerFeeBatch() public {
        address[] memory vaults = new address[](2);
        vaults[0] = address(vaultA);
        vaults[1] = address(vaultB);

        vm.prank(operator);
        router.mintManagerFeeBatch(vaults);
        assertEq(vaultA.mintManagerFeeCalls(), 1);
        assertEq(vaultB.mintManagerFeeCalls(), 1);
    }

    // ─── forward() escape hatch ──────────────────────────────────────────────

    function test_ForwardToVaultAndManagerLogic() public {
        vm.prank(operator);
        router.forward(
            address(vaultA),
            address(vaultA),
            abi.encodeCall(IPoolLogic.execTransaction, (address(target), abi.encodeCall(MockTarget.bump, ())))
        );
        assertEq(target.counter(), 1);

        vm.prank(operator);
        router.forward(address(vaultA), address(pmlA), abi.encodeCall(IPoolManagerLogic.setMaxSupplyCap, (7e18)));
        assertEq(pmlA.maxSupplyCap(), 7e18);
    }

    /// @dev forward() must never be usable as a generic arbitrary-call primitive.
    function test_ForwardRejectsUnrelatedTarget() public {
        vm.prank(operator);
        vm.expectRevert(TraderRouter.UntrustedTarget.selector);
        router.forward(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));
    }

    /// @dev A hostile "vault" may not borrow another vault's PoolManagerLogic.
    function test_ForwardRejectsMismatchedPairing() public {
        MockPoolLogic rogue = new MockPoolLogic();
        rogue.setPoolManagerLogic(address(pmlA)); // points at a PML it does not own

        vm.prank(operator);
        vm.expectRevert(TraderRouter.UntrustedTarget.selector);
        router.forward(address(rogue), address(rogue), "");
    }

    function test_ForwardBubblesUpRevert() public {
        target.setShouldRevert(true);
        vm.prank(operator);
        vm.expectRevert();
        router.forward(
            address(vaultA),
            address(vaultA),
            abi.encodeCall(IPoolLogic.execTransaction, (address(target), abi.encodeCall(MockTarget.bump, ())))
        );
    }

    // ─── Operator lifecycle ──────────────────────────────────────────────────

    /// @dev The headline scenario: one DAO tx disables a leaked key everywhere.
    function test_RevokeKillsOperatorAcrossAllVaults() public {
        vm.prank(dao);
        router.revokeOperator(operator);

        vm.prank(operator);
        vm.expectRevert(TraderRouter.NotOperator.selector);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));

        vm.prank(operator);
        vm.expectRevert(TraderRouter.NotOperator.selector);
        router.execTransaction(address(vaultB), address(target), abi.encodeCall(MockTarget.bump, ()));
    }

    function test_ExpiredOperatorCannotTrade() public {
        address temp = address(0x7E37);
        vm.prank(dao);
        router.setOperator(temp, uint64(block.timestamp + 1 days));

        assertTrue(router.isActiveOperator(temp));

        vm.warp(block.timestamp + 2 days);
        assertFalse(router.isActiveOperator(temp));

        vm.prank(temp);
        vm.expectRevert(TraderRouter.OperatorExpired.selector);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));
    }

    function test_RevokeAllOperators() public {
        address[] memory ops = new address[](2);
        ops[0] = address(0xA1);
        ops[1] = address(0xA2);
        vm.prank(dao);
        router.setOperators(ops, type(uint64).max);
        assertEq(router.operators().length, 3);

        vm.prank(dao);
        router.revokeAllOperators();
        assertEq(router.operators().length, 0);
        assertEq(router.activeOperators().length, 0);
    }

    function test_OperatorListHasNoDuplicates() public {
        vm.startPrank(dao);
        router.setOperator(operator, type(uint64).max);
        router.setOperator(operator, uint64(block.timestamp + 1 days));
        vm.stopPrank();
        assertEq(router.operators().length, 1);
    }

    function test_OnlyOwnerManagesOperators() public {
        vm.prank(attacker);
        vm.expectRevert(TraderRouter.NotOwner.selector);
        router.setOperator(attacker, type(uint64).max);
    }

    // ─── Pause / guardian ────────────────────────────────────────────────────

    function test_GuardianCanPauseButNotUnpause() public {
        vm.prank(guardian);
        router.pause();

        vm.prank(operator);
        vm.expectRevert(TraderRouter.IsPaused.selector);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));

        vm.prank(guardian);
        vm.expectRevert(TraderRouter.NotOwner.selector);
        router.unpause();

        vm.prank(dao);
        router.unpause();

        vm.prank(operator);
        router.execTransaction(address(vaultA), address(target), abi.encodeCall(MockTarget.bump, ()));
        assertEq(target.counter(), 1);
    }

    function test_StrangerCannotPause() public {
        vm.prank(attacker);
        vm.expectRevert(TraderRouter.NotOwnerOrGuardian.selector);
        router.pause();
    }

    // ─── Ownership ───────────────────────────────────────────────────────────

    function test_TwoStepOwnershipTransfer() public {
        address newDao = address(0xD40);

        vm.prank(dao);
        router.transferOwnership(newDao);
        assertEq(router.owner(), dao);

        vm.prank(attacker);
        vm.expectRevert(TraderRouter.NotPendingOwner.selector);
        router.acceptOwnership();

        vm.prank(newDao);
        router.acceptOwnership();
        assertEq(router.owner(), newDao);
        assertEq(router.pendingOwner(), address(0));
    }

    // ─── Migration views ─────────────────────────────────────────────────────

    function test_IsTraderForAndUnmigratedVaults() public {
        MockPoolLogic vaultC = new MockPoolLogic();
        MockPoolManagerLogic pmlC = new MockPoolManagerLogic(manager, address(vaultC));
        vaultC.setPoolManagerLogic(address(pmlC));

        assertTrue(router.isTraderFor(address(vaultA)));
        assertFalse(router.isTraderFor(address(vaultC)));

        address[] memory vaults = new address[](3);
        vaults[0] = address(vaultA);
        vaults[1] = address(vaultB);
        vaults[2] = address(vaultC);

        address[] memory missing = router.unmigratedVaults(vaults);
        assertEq(missing.length, 1);
        assertEq(missing[0], address(vaultC));
    }

    function test_IsActiveOperatorFalseWhenPaused() public {
        assertTrue(router.isActiveOperator(operator));
        vm.prank(guardian);
        router.pause();
        assertFalse(router.isActiveOperator(operator));
    }
}
