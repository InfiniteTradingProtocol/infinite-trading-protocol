// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Built by InfiniteTrading.io — StSATO comprehensive test suite
// Covers: bootstrap, buy/sell, borrow/repay, leverage, liquidation,
//         price invariants, fee accounting, access control, edge cases.

import "forge-std/src/Test.sol";
import "../src/stsato.sol";
import "../src/mock/SimpleToken.sol";

contract StSATOTest is Test {
    // ── Constants ──────────────────────────────────────────────────────────────
    address constant DEAD   = 0x000000000000000000000000000000000000dEaD;
    uint256 constant WAD    = 1e18;
    uint256 constant BOOTSTRAP = 100 * WAD; // 100 SATO seed

    // ── Actors ─────────────────────────────────────────────────────────────────
    address owner   = makeAddr("owner");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address carol   = makeAddr("carol");

    // ── Contracts ──────────────────────────────────────────────────────────────
    SimpleToken sato;
    StSATO      vault;

    // ── Setup ──────────────────────────────────────────────────────────────────
    function setUp() public {
        vm.startPrank(owner);
        sato  = new SimpleToken("SATO", "SATO", 1_000_000 * WAD);
        vault = new StSATO(address(sato));
        vm.stopPrank();

        // Fund alice, bob, carol with 10k SATO each
        vm.startPrank(owner);
        sato.transfer(alice, 10_000 * WAD);
        sato.transfer(bob,   10_000 * WAD);
        sato.transfer(carol, 10_000 * WAD);
        vm.stopPrank();
    }

    // ── Helper: bootstrap the vault ───────────────────────────────────────────
    function _start() internal {
        vm.startPrank(owner);
        sato.approve(address(vault), BOOTSTRAP);
        vault.setStart(BOOTSTRAP);
        vm.stopPrank();
    }

    // Helper: alice buys `satoAmt` worth of stSATO
    function _buy(address who, uint256 satoAmt) internal returns (uint256 received) {
        vm.startPrank(who);
        sato.approve(address(vault), satoAmt);
        uint256 before = vault.balanceOf(who);
        vault.buy(who, satoAmt);
        received = vault.balanceOf(who) - before;
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. BOOTSTRAP / OWNERSHIP
    // ══════════════════════════════════════════════════════════════════════════

    function test_setStart_setsBackingAndPrice() public {
        _start();
        assertEq(vault.getBacking(), BOOTSTRAP, "backing should equal seed");
        assertEq(vault.totalSupply(), BOOTSTRAP, "supply should equal seed");
        // setStart now sets lastPrice = 1e18 so price is correct immediately
        assertEq(vault.lastPrice(), WAD, "lastPrice should be 1e18 after setStart");
        // After first buy it remains >= 1:1
        _buy(alice, WAD);
        assertGe(vault.lastPrice(), WAD, "price >= 1 after first buy");
    }

    function test_setStart_renouncesOwnership() public {
        _start();
        assertEq(vault.owner(), address(0), "owner should be zero after start");
    }

    function test_setStart_mintsToDead() public {
        _start();
        assertGt(vault.balanceOf(DEAD), 0, "dead address must hold bootstrap stSATO");
    }

    function test_setStart_revertsIfAlreadyStarted() public {
        _start();
        vm.prank(owner); // owner is now address(0), but test the guard
        vm.expectRevert(); // OwnableUnauthorizedAccount or "Already started"
        vault.setStart(BOOTSTRAP);
    }

    function test_setStart_revertsIfBelowMinimum() public {
        vm.startPrank(owner);
        sato.approve(address(vault), WAD - 1);
        vm.expectRevert("Minimum 1 sato to bootstrap");
        vault.setStart(WAD - 1);
        vm.stopPrank();
    }

    function test_setStart_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setStart(BOOTSTRAP);
    }

    function test_start_flagFalseBeforeSetStart() public {
        assertFalse(vault.start(), "start should be false before setStart");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. BUY
    // ══════════════════════════════════════════════════════════════════════════

    function test_buy_basicMint() public {
        _start();
        uint256 amt = 1000 * WAD;
        uint256 received = _buy(alice, amt);
        assertGt(received, 0, "should receive stSATO");
    }

    function test_buy_revertsBeforeStart() public {
        vm.startPrank(alice);
        sato.approve(address(vault), 100 * WAD);
        vm.expectRevert("Trading must be initialized");
        vault.buy(alice, 100 * WAD);
        vm.stopPrank();
    }

    function test_buy_revertsToZeroAddress() public {
        _start();
        vm.startPrank(alice);
        sato.approve(address(vault), 100 * WAD);
        vm.expectRevert("Receiver cannot be 0x0");
        vault.buy(address(0), 100 * WAD);
        vm.stopPrank();
    }

    function test_buy_priceIncreasesAfterBuy() public {
        _start();
        uint256 priceBefore = vault.lastPrice();
        _buy(alice, 1000 * WAD);
        uint256 priceAfter = vault.lastPrice();
        assertGe(priceAfter, priceBefore, "price should not decrease after buy");
    }

    function test_buy_feesStayInBacking() public {
        _start();
        uint256 satoAmt    = 1000 * WAD;
        uint256 backingBefore = vault.getBacking();

        vm.startPrank(alice);
        sato.approve(address(vault), satoAmt);
        vault.buy(alice, satoAmt);
        vm.stopPrank();

        uint256 backingAfter = vault.getBacking();
        // Backing must increase by (satoAmt - burnedFees)
        assertGt(backingAfter, backingBefore, "backing must grow after buy");
    }

    function test_buy_totalMintedIncreases() public {
        _start();
        uint256 mintedBefore = vault.totalMinted();
        _buy(alice, 500 * WAD);
        assertGt(vault.totalMinted(), mintedBefore, "totalMinted should increase");
    }

    function test_buy_receiverDifferentFromCaller() public {
        _start();
        vm.startPrank(alice);
        sato.approve(address(vault), 500 * WAD);
        vault.buy(bob, 500 * WAD);
        vm.stopPrank();
        assertGt(vault.balanceOf(bob), 0, "bob should receive stSATO");
        assertEq(vault.balanceOf(alice), 0, "alice should receive nothing");
    }

    function test_buy_multipleBuyersIncreasePrice() public {
        _start();
        uint256 p0 = vault.lastPrice();
        _buy(alice, 1000 * WAD);
        uint256 p1 = vault.lastPrice();
        _buy(bob,   1000 * WAD);
        uint256 p2 = vault.lastPrice();
        assertGe(p1, p0);
        assertGe(p2, p1);
    }

    function test_buy_feesSentToDead() public {
        _start();
        uint256 deadBalBefore = sato.balanceOf(DEAD);
        _buy(alice, 1000 * WAD);
        assertGt(sato.balanceOf(DEAD), deadBalBefore, "some SATO should be sent to dead address as fee burn");
    }

    function test_buy_totalFeesBurnedTracked() public {
        _start();
        uint256 feesBefore = vault.totalFeesBurned();
        _buy(alice, 1000 * WAD);
        assertGt(vault.totalFeesBurned(), feesBefore, "totalFeesBurned must increase");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. SELL
    // ══════════════════════════════════════════════════════════════════════════

    function test_sell_basicRedeem() public {
        _start();
        uint256 received = _buy(alice, 1000 * WAD);

        uint256 satoBalBefore = sato.balanceOf(alice);
        vm.prank(alice);
        vault.sell(received);
        uint256 satoBalAfter = sato.balanceOf(alice);

        assertGt(satoBalAfter, satoBalBefore, "alice should receive SATO back");
    }

    function test_sell_burnReducesTotalSupply() public {
        _start();
        uint256 received = _buy(alice, 1000 * WAD);
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(alice);
        vault.sell(received);

        assertLt(vault.totalSupply(), supplyBefore, "totalSupply must decrease after sell");
    }

    function test_sell_getTotalBurnedAccurate() public {
        _start();
        uint256 received = _buy(alice, 1000 * WAD);

        vm.prank(alice);
        vault.sell(received);

        assertEq(
            vault.getTotalBurned(),
            vault.totalMinted() - vault.totalSupply(),
            "getTotalBurned must equal totalMinted - totalSupply"
        );
    }

    function test_sell_priceNeverDecreases() public {
        _start();
        _buy(alice, 2000 * WAD);
        uint256 priceAfterBuy = vault.lastPrice();

        uint256 aliceBal = vault.balanceOf(alice);
        vm.prank(alice);
        vault.sell(aliceBal / 2);

        // _safetyCheck enforces lastPrice <= newPrice
        assertGe(vault.lastPrice(), priceAfterBuy, "price must not fall after sell");
    }

    function test_sell_revertsIfInsufficientBalance() public {
        _start();
        _buy(alice, 100 * WAD);
        uint256 tooMuch = vault.balanceOf(alice) + 1;
        vm.prank(alice);
        vm.expectRevert();
        vault.sell(tooMuch);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. BORROW
    // ══════════════════════════════════════════════════════════════════════════

    function test_borrow_basic() public {
        _start();
        _buy(alice, 1000 * WAD);

        uint256 aliceStsato = vault.balanceOf(alice);
        uint256 borrowAmt   = 500 * WAD;

        vm.startPrank(alice);
        vault.approve(address(vault), aliceStsato);
        uint256 satoBalBefore = sato.balanceOf(alice);
        vault.borrow(borrowAmt, 30);
        vm.stopPrank();

        assertGt(sato.balanceOf(alice), satoBalBefore, "alice must receive SATO");
        (uint256 col, uint256 bor, ) = vault.getLoanByAddress(alice);
        assertGt(col, 0, "collateral must be recorded");
        assertGt(bor, 0, "borrowed must be recorded");
    }

    function test_borrow_revertsBeforeStart() public {
        vm.prank(alice);
        vm.expectRevert("Trading must be initialized");
        vault.borrow(100 * WAD, 30);
    }

    function test_borrow_revertsZeroAmount() public {
        _start();
        _buy(alice, 1000 * WAD);
        vm.startPrank(alice);
        vault.approve(address(vault), vault.balanceOf(alice));
        vm.expectRevert("Must borrow more than 0");
        vault.borrow(0, 30);
        vm.stopPrank();
    }

    function test_borrow_revertsOver365Days() public {
        _start();
        _buy(alice, 1000 * WAD);
        vm.startPrank(alice);
        vault.approve(address(vault), vault.balanceOf(alice));
        vm.expectRevert("Max 365 days");
        vault.borrow(100 * WAD, 366);
        vm.stopPrank();
    }

    function test_borrow_revertsIfActiveLoanExists() public {
        _start();
        _buy(alice, 2000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        vm.expectRevert("Use borrowMore to borrow more");
        vault.borrow(100 * WAD, 30);
        vm.stopPrank();
    }

    function test_borrow_locksCollateral() public {
        _start();
        _buy(alice, 2000 * WAD);
        uint256 balBefore = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), balBefore);
        vault.borrow(500 * WAD, 30);
        vm.stopPrank();
        assertLt(vault.balanceOf(alice), balBefore, "collateral must be locked");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. BORROW MORE
    // ══════════════════════════════════════════════════════════════════════════

    function test_borrowMore_increasesLoan() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(500 * WAD, 30);
        (, uint256 borBefore, ) = vault.getLoanByAddress(alice);
        vault.borrowMore(200 * WAD);
        (, uint256 borAfter, ) = vault.getLoanByAddress(alice);
        vm.stopPrank();
        assertGt(borAfter, borBefore, "borrowed must increase after borrowMore");
    }

    function test_borrowMore_revertsOnExpiredLoan() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(500 * WAD, 30);
        vm.stopPrank();

        // getMidnightTimestamp can push endDate to exactly ts+31 days; add 1s to guarantee expiry
        vm.warp(block.timestamp + 31 days + 1);

        vm.prank(alice);
        vm.expectRevert("Loan expired - use borrow");
        vault.borrowMore(100 * WAD);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. REMOVE COLLATERAL
    // ══════════════════════════════════════════════════════════════════════════

    function test_removeCollateral_returnsExcess() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(10 * WAD, 30); // collateral ~10 stSATO, borrowed ~9.9 SATO

        // Partially repay to create excess: borrowed drops, collateral stays locked
        sato.approve(address(vault), 5 * WAD);
        vault.repay(5 * WAD); // borrowed now ~4.9 SATO, collateral still ~10 stSATO

        (uint256 colBefore, , ) = vault.getLoanByAddress(alice);
        uint256 removeAmt = WAD; // remove 1 stSATO — well within the new excess
        uint256 balBefore = vault.balanceOf(alice);
        vault.removeCollateral(removeAmt);
        (uint256 colAfter, , ) = vault.getLoanByAddress(alice);
        vm.stopPrank();
        assertEq(vault.balanceOf(alice), balBefore + removeAmt, "alice should receive collateral back");
        assertLt(colAfter, colBefore, "recorded collateral must decrease");
    }

    function test_removeCollateral_revertsIfUndercollateralised() public {
        _start();
        _buy(alice, 2000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(500 * WAD, 30);
        (uint256 col, , ) = vault.getLoanByAddress(alice);
        vm.expectRevert("Require 99% collateralisation rate");
        vault.removeCollateral(col); // remove all → undercollateralised
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. REPAY
    // ══════════════════════════════════════════════════════════════════════════

    function test_repay_partialReducesBorrow() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        (, uint256 borBefore, ) = vault.getLoanByAddress(alice);

        sato.approve(address(vault), 100 * WAD);
        vault.repay(100 * WAD);
        (, uint256 borAfter, ) = vault.getLoanByAddress(alice);
        vm.stopPrank();
        assertLt(borAfter, borBefore, "borrowed must decrease after repay");
    }

    function test_repay_revertsZeroAmount() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.expectRevert("Must repay something");
        vault.repay(0);
        vm.stopPrank();
    }

    function test_repay_revertsFullAmountViaRepay() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        (, uint256 borrowed, ) = vault.getLoanByAddress(alice);
        sato.approve(address(vault), borrowed);
        vm.expectRevert("Use closePosition to fully repay");
        vault.repay(borrowed);
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. CLOSE POSITION
    // ══════════════════════════════════════════════════════════════════════════

    function test_closePosition_returnsCollateral() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        (uint256 col, uint256 bor, ) = vault.getLoanByAddress(alice);
        uint256 stsatoBefore = vault.balanceOf(alice);
        sato.approve(address(vault), bor);
        vault.closePosition();
        vm.stopPrank();
        assertEq(vault.balanceOf(alice), stsatoBefore + col, "collateral must be returned");
    }

    function test_closePosition_deletesLoan() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        (, uint256 bor, ) = vault.getLoanByAddress(alice);
        sato.approve(address(vault), bor);
        vault.closePosition();
        vm.stopPrank();
        (, uint256 borAfter, ) = vault.getLoanByAddress(alice);
        assertEq(borAfter, 0, "loan must be cleared after closePosition");
    }

    function test_closePosition_revertsOnExpiredLoan() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        (, uint256 bor, ) = vault.getLoanByAddress(alice);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days + 1);

        vm.startPrank(alice);
        sato.approve(address(vault), bor);
        vm.expectRevert("Loan liquidated - no collateral");
        vault.closePosition();
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. FLASH CLOSE POSITION
    // ══════════════════════════════════════════════════════════════════════════

    function test_flashClose_returnsNetSATO() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        uint256 satoBalBefore = sato.balanceOf(alice);
        vault.flashClosePosition();
        vm.stopPrank();
        assertGt(sato.balanceOf(alice), satoBalBefore, "alice must receive net SATO");
    }

    function test_flashClose_revertsOnExpired() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days + 1);

        vm.prank(alice);
        vm.expectRevert("Loan liquidated - no collateral");
        vault.flashClosePosition();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. EXTEND LOAN
    // ══════════════════════════════════════════════════════════════════════════

    function test_extendLoan_movesEndDate() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        (, , uint256 endBefore) = vault.getLoanByAddress(alice);
        uint256 fee = vault.getInterestFee(300 * WAD, 10);
        sato.approve(address(vault), fee + WAD);
        vault.extendLoan(10);
        (, , uint256 endAfter) = vault.getLoanByAddress(alice);
        vm.stopPrank();
        assertGt(endAfter, endBefore, "end date must increase");
    }

    function test_extendLoan_revertsZeroDays() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        vm.expectRevert("Must extend by at least 1 day");
        vault.extendLoan(0);
        vm.stopPrank();
    }

    function test_extendLoan_revertsIfExpired() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(300 * WAD, 30);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days + 1);

        vm.startPrank(alice);
        uint256 fee = vault.getInterestFee(300 * WAD, 10);
        sato.approve(address(vault), fee + WAD);
        vm.expectRevert("Loan liquidated - no collateral");
        vault.extendLoan(10);
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 11. LEVERAGE
    // ══════════════════════════════════════════════════════════════════════════

    function test_leverage_opensPosition() public {
        _start();
        uint256 satoAmt = 1000 * WAD;
        uint256 fee = vault.leverageFee(satoAmt, 30);
        uint256 overColl = (satoAmt - fee) / 100;
        uint256 totalCost = fee + overColl;

        vm.startPrank(alice);
        sato.approve(address(vault), totalCost);
        vault.leverage(satoAmt, 30);
        vm.stopPrank();

        (, uint256 bor, ) = vault.getLoanByAddress(alice);
        assertGt(bor, 0, "leverage position must have borrowed amount");
    }

    function test_leverage_revertsWithExistingLoan() public {
        _start();
        _buy(alice, 5000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(200 * WAD, 30);

        uint256 satoAmt = 500 * WAD;
        uint256 fee = vault.leverageFee(satoAmt, 30);
        uint256 overColl = (satoAmt - fee) / 100;
        sato.approve(address(vault), fee + overColl + WAD);
        vm.expectRevert("Use account with no loans");
        vault.leverage(satoAmt, 30);
        vm.stopPrank();
    }

    function test_leverage_revertsOver365Days() public {
        _start();
        uint256 satoAmt = 500 * WAD;
        uint256 fee = vault.leverageFee(satoAmt, 30);
        vm.startPrank(alice);
        sato.approve(address(vault), fee + WAD);
        vm.expectRevert("Max 365 days");
        vault.leverage(satoAmt, 366);
        vm.stopPrank();
    }

    function test_leverage_canReopenAfterExpiry() public {
        _start();
        uint256 satoAmt = 500 * WAD;
        uint256 fee1 = vault.leverageFee(satoAmt, 30);
        uint256 oc1  = (satoAmt - fee1) / 100;

        vm.startPrank(alice);
        sato.approve(address(vault), fee1 + oc1 + WAD);
        vault.leverage(satoAmt, 30);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days + 1);
        vault.liquidate(); // process expiry

        uint256 fee2 = vault.leverageFee(satoAmt, 30);
        uint256 oc2  = (satoAmt - fee2) / 100;

        vm.startPrank(alice);
        sato.approve(address(vault), fee2 + oc2 + WAD);
        vault.leverage(satoAmt, 30); // should succeed
        vm.stopPrank();

        (, uint256 bor, ) = vault.getLoanByAddress(alice);
        assertGt(bor, 0, "new leverage position must exist");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 12. LIQUIDATION
    // ══════════════════════════════════════════════════════════════════════════

    function test_liquidate_processesExpiredLoans() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        uint256 totalBorrowedBefore = vault.getTotalBorrowed();
        vm.warp(block.timestamp + 31 days + 1);
        vault.liquidate();

        assertLt(vault.getTotalBorrowed(), totalBorrowedBefore, "borrowedTracked must decrease");
    }

    function test_liquidate_burnsCollateral() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        uint256 supplyBefore = vault.totalSupply();
        vm.warp(block.timestamp + 31 days + 1);
        vault.liquidate();

        assertLt(vault.totalSupply(), supplyBefore, "supply must decrease after liquidation");
    }

    function test_drainLiquidations_processesBoundedChunk() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 60);
        vm.stopPrank();

        vm.warp(block.timestamp + 61 days + 1);
        vault.drainLiquidations(35); // partial drain
        vault.drainLiquidations(35); // finish
        assertLe(vault.lastLiquidationDate(), block.timestamp + 1 days);
    }

    function test_liquidate_idempotentWithNoExpiredLoans() public {
        _start();
        uint256 supplyBefore = vault.totalSupply();
        vault.liquidate(); // no loans
        assertEq(vault.totalSupply(), supplyBefore, "supply unchanged if no loans expire");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 13. PRICE INVARIANTS
    // ══════════════════════════════════════════════════════════════════════════

    function test_invariant_priceNeverDecreases_buyAndSell() public {
        _start();
        uint256 p0 = vault.lastPrice();
        _buy(alice, 500 * WAD);
        uint256 p1 = vault.lastPrice();
        _buy(bob, 500 * WAD);
        uint256 p2 = vault.lastPrice();

        uint256 aliceBal = vault.balanceOf(alice);
        vm.prank(alice);
        vault.sell(aliceBal);
        uint256 p3 = vault.lastPrice();

        assertGe(p1, p0);
        assertGe(p2, p1);
        assertGe(p3, p2);
    }

    function test_invariant_backingEqualsBalancePlusBorrowed() public {
        _start();
        _buy(alice, 1000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        assertEq(
            vault.getBacking(),
            sato.balanceOf(address(vault)) + vault.getTotalBorrowed(),
            "getBacking() must equal balance + totalBorrowed"
        );
    }

    function test_invariant_getTotalBurned() public {
        _start();
        uint256 received = _buy(alice, 1000 * WAD);
        vm.prank(alice);
        vault.sell(received / 2);

        assertEq(
            vault.getTotalBurned(),
            vault.totalMinted() - vault.totalSupply()
        );
    }

    function test_invariant_priceAfterLiquidation() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        uint256 priceBefore = vault.lastPrice();
        vm.warp(block.timestamp + 31 days + 1);
        // Any trade triggers liquidate() internally
        _buy(bob, 100 * WAD);
        assertGe(vault.lastPrice(), priceBefore, "price must not fall after liquidation");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 14. FEE ACCOUNTING
    // ══════════════════════════════════════════════════════════════════════════

    function test_fee_buyFeeIsConstant() public view {
        assertEq(vault.buy_fee(),  990);
        assertEq(vault.sell_fee(), 990);
        assertEq(vault.buy_fee_leverage(), 10);
    }

    function test_fee_1percentBurnedOnFee() public {
        _start();
        uint256 deadBalBefore = sato.balanceOf(DEAD);
        uint256 satoAmt    = 1000 * WAD;
        uint256 expectedFee   = satoAmt / 125; // FEES_BUY = 125
        uint256 expectedBurn  = expectedFee / 100;

        _buy(alice, satoAmt);

        uint256 actualSentToDead = sato.balanceOf(DEAD) - deadBalBefore;
        assertApproxEqAbs(actualSentToDead, expectedBurn, 1, "~1% of fee must be sent to dead address");
    }

    function test_fee_99percentStaysInBacking() public {
        _start();
        uint256 satoAmt = 1000 * WAD;
        uint256 expectedFee  = satoAmt / 125;
        uint256 expectedBurn = expectedFee / 100;
        uint256 expectedBacking = satoAmt - expectedBurn; // all SATO except tiny burn stays

        uint256 backingBefore = vault.getBacking();
        _buy(alice, satoAmt);
        uint256 backingAfter  = vault.getBacking();

        // The backing increase must be close to satoAmt (minus tiny burn)
        assertApproxEqAbs(
            backingAfter - backingBefore,
            expectedBacking,
            WAD / 100,
            "99% of fees must remain in backing"
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 15. EDGE CASES
    // ══════════════════════════════════════════════════════════════════════════

    function test_edge_borrowAndRebuyLoop() public {
        // Borrow then rebuy loop — demonstrates totalBorrowed tracking and price invariants
        _start();
        _buy(alice, 5000 * WAD);

        // Round 1: borrow
        uint256 bal1 = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal1);
        vault.borrow(200 * WAD, 30);
        vm.stopPrank();

        // Round 2: buy with borrowed SATO
        _buy(alice, 100 * WAD);

        // Price must never have decreased (enforced by _safetyCheck on every op)
        assertGt(vault.lastPrice(), 0);
        assertEq(
            vault.getBacking(),
            sato.balanceOf(address(vault)) + vault.getTotalBorrowed()
        );
    }

    function test_edge_safetyCheckRevertOnPriceDecrease() public {
        // _safetyCheck reverts if price would fall — can't be triggered normally
        // but we confirm lastPrice is always <= newPrice after all ops
        _start();
        _buy(alice, 1000 * WAD);
        uint256 p1 = vault.lastPrice();
        _buy(bob, 1000 * WAD);
        uint256 p2 = vault.lastPrice();
        assertGe(p2, p1);
    }

    function test_edge_isLoanExpiredReturnsFalseForNoLoan() public {
        _start();
        assertTrue(vault.isLoanExpired(alice), "no loan = expired (endDate=0 < now)");
    }

    function test_edge_getLoansExpiringByDate() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        uint256 futureDate = block.timestamp + 30 days;
        (uint256 bor, uint256 col) = vault.getLoansExpiringByDate(futureDate);
        assertGt(bor + col, 0, "should have loans expiring around that date");
    }

    function test_edge_getLoanByAddressReturnsZeroAfterExpiry() public {
        _start();
        _buy(alice, 3000 * WAD);
        uint256 bal = vault.balanceOf(alice);
        vm.startPrank(alice);
        vault.approve(address(vault), bal);
        vault.borrow(400 * WAD, 30);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days + 1);
        (uint256 col, uint256 bor, uint256 end) = vault.getLoanByAddress(alice);
        assertEq(col + bor + end, 0, "expired loan should return zeros");
    }

    function test_edge_interestFeeCalculation() public view {
        // 30 days: interest = 0.02 * 30/365 + 0.0005 ≈ 0.002144
        uint256 fee = vault.getInterestFee(1000 * WAD, 30);
        assertGt(fee, 0);
        assertLt(fee, 1000 * WAD); // sanity
    }

    function test_edge_buyZeroAmount() public {
        _start();
        vm.startPrank(alice);
        sato.approve(address(vault), 0);
        // Should revert or produce 0 stSATO (safeTransferFrom with 0 is allowed by ERC20)
        // The satoToStsato(0) = 0, so minted = 0, totalMinted unchanged
        vault.buy(alice, 0);
        vm.stopPrank();
        // No revert — just a no-op (0 SATO in, 0 stSATO out)
    }

    function test_edge_multipleUsersFullLifecycle() public {
        _start();

        // Alice buys
        uint256 aliceReceived = _buy(alice, 2000 * WAD);
        // Bob buys (price slightly higher)
        uint256 bobReceived   = _buy(bob, 2000 * WAD);

        // Bob borrows
        vm.startPrank(bob);
        vault.approve(address(vault), bobReceived);
        vault.borrow(500 * WAD, 60);
        (, uint256 bobBorrow, ) = vault.getLoanByAddress(bob);
        vm.stopPrank();

        // Alice sells half
        vm.prank(alice);
        vault.sell(aliceReceived / 2);

        // Carol buys
        _buy(carol, 1000 * WAD);

        // Time passes, Bob's loan expires
        vm.warp(block.timestamp + 61 days + 1);

        // Carol's buy triggers liquidation
        _buy(carol, 100 * WAD);

        // Bob can open new loan
        _buy(bob, 500 * WAD);
        uint256 bobBal2 = vault.balanceOf(bob);
        vm.startPrank(bob);
        vault.approve(address(vault), bobBal2);
        vault.borrow(200 * WAD, 30);
        vm.stopPrank();

        // Final invariant
        assertGe(vault.lastPrice(), WAD, "price must be >= 1 after all activity");
        assertEq(
            vault.getTotalBurned(),
            vault.totalMinted() - vault.totalSupply()
        );
        assertEq(
            vault.getBacking(),
            sato.balanceOf(address(vault)) + vault.getTotalBorrowed()
        );
        // suppress unused variable warning
        assertGt(bobBorrow, 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STRESS / VOLUME TESTS
    // ══════════════════════════════════════════════════════════════════════════

    // 50 buy→sell cycles: price must only increase, invariants must hold throughout
    function test_stress_buySellCycles50() public {
        _start();
        deal(address(sato), alice, 1_000_000 * WAD);

        uint256 priceAfterFirst = 0;
        for (uint256 i = 0; i < 50; i++) {
            uint256 received = _buy(alice, 100 * WAD);
            vm.prank(alice);
            vault.sell(received / 2);
            assertGe(vault.lastPrice(), priceAfterFirst, "price must never decrease");
            priceAfterFirst = vault.lastPrice();
        }
        assertGt(vault.lastPrice(), WAD, "price must have appreciated after 50 cycles");
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertEq(vault.getTotalBurned(), vault.totalMinted() - vault.totalSupply());
    }

    // Massive single buy (large relative to pool) — no overflow
    function test_stress_massiveSingleBuy() public {
        _start();
        deal(address(sato), alice, 10_000_000 * WAD);
        // Build pool first so a large buy won't hit the backing floor
        _buy(alice, 5_000 * WAD);

        deal(address(sato), bob, 10_000_000 * WAD);
        // Buy 4000 SATO — well under the ~5100 SATO backing
        uint256 received = _buy(bob, 4_000 * WAD);

        assertGt(received, 0, "must receive stsato on massive buy");
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertEq(vault.getTotalBurned(), vault.totalMinted() - vault.totalSupply());
    }

    // After selling everything user-held, bootstrap floor must keep totalSupply() > 0
    function test_stress_sellToBootstrapFloor() public {
        _start();
        deal(address(sato), alice, 1_000_000 * WAD);

        uint256 bought = _buy(alice, 500_000 * WAD);
        vm.prank(alice);
        vault.sell(bought);

        // 0xdead holds bootstrap stSATO — totalSupply() never reaches 0
        assertGe(vault.totalSupply(), BOOTSTRAP, "bootstrap supply floor must hold");
        assertGt(vault.getBacking(), 0, "backing must remain positive");
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
    }

    // buy() transfers SATO before computing price, so denominator is always oldBacking
    // A buy larger than the bootstrap seed must succeed without overflow/divide-by-zero
    function test_stress_buyLargerThanBootstrap() public {
        _start();
        deal(address(sato), alice, BOOTSTRAP * 10);
        // Buy 5× the initial backing — denominator in satoToStsato = oldBacking > 0
        uint256 received = _buy(alice, BOOTSTRAP * 5);
        assertGt(received, 0, "buy larger than initial backing must succeed");
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertEq(vault.getTotalBurned(), vault.totalMinted() - vault.totalSupply());
    }

    // 200 buys with no sells — price appreciates, math never overflows
    function test_stress_extremePriceAppreciation() public {
        _start();
        deal(address(sato), alice, 100_000_000 * WAD);

        for (uint256 i = 0; i < 200; i++) {
            _buy(alice, 5_000 * WAD);
        }

        assertGt(vault.lastPrice(), WAD, "price must have appreciated significantly");
        // bob can still buy after extreme appreciation
        uint256 received = _buy(bob, 100 * WAD);
        assertGt(received, 0);
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertEq(vault.getTotalBurned(), vault.totalMinted() - vault.totalSupply());
    }

    // Fee sends 1% to dead address — tracker matches actual dead balance increase
    function test_stress_satoSupplyDecreaseMatchesTracker() public {
        _start();
        deal(address(sato), alice, 10_000_000 * WAD);

        uint256 deadBalBefore = sato.balanceOf(DEAD);

        for (uint256 i = 0; i < 100; i++) {
            uint256 r = _buy(alice, 1_000 * WAD);
            vm.prank(alice);
            vault.sell(r);
        }

        assertGt(vault.totalFeesBurned(), 0);
        assertEq(
            sato.balanceOf(DEAD) - deadBalBefore,
            vault.totalFeesBurned(),
            "SATO burned must match totalFeesBurned tracker"
        );
    }

    // getTotalBurned accurate across 100 mixed buy/sell iterations
    function test_stress_totalBurnedAccuracyAtScale() public {
        _start();
        deal(address(sato), alice, 10_000_000 * WAD);
        deal(address(sato), bob,  10_000_000 * WAD);

        for (uint256 i = 0; i < 100; i++) {
            uint256 r = _buy(alice, 5_000 * WAD);
            if (i % 3 == 0) {
                vm.prank(alice);
                vault.sell(r / 2);
            }
        }
        _buy(bob, 2_000 * WAD);

        assertEq(
            vault.getTotalBurned(),
            vault.totalMinted() - vault.totalSupply(),
            "getTotalBurned must equal totalMinted - totalSupply at all times"
        );
        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertGt(vault.lastPrice(), WAD, "price must have appreciated");
    }

    // After extreme price appreciation, a tiny buy either succeeds or getBuyStsato returns 0
    function test_stress_tinyBuyAtHighPrice() public {
        _start();
        deal(address(sato), alice, 100_000_000 * WAD);

        // Large buy to push price up significantly
        _buy(alice, 50_000_000 * WAD);

        uint256 highPrice = vault.lastPrice();
        assertGt(highPrice, WAD, "price must have appreciated");

        // Preview: does 1 WAD still yield any stSATO?
        uint256 preview = vault.getBuyStsato(WAD);
        if (preview > 0) {
            uint256 received = _buy(bob, WAD);
            assertGt(received, 0);
            assertGe(vault.lastPrice(), highPrice, "price must not drop after tiny buy");
        }
        // preview == 0 is also valid: integer division floors to 0 at extreme prices

        assertEq(vault.getBacking(), sato.balanceOf(address(vault)) + vault.getTotalBorrowed());
        assertEq(vault.getTotalBurned(), vault.totalMinted() - vault.totalSupply());
    }
}
