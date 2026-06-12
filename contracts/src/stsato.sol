// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Built by infinitetrading.io

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

address constant DEAD = 0x000000000000000000000000000000000000dEaD;

/// @title  StSATO
/// @author infinitetrading.io
/// @notice buy sato → receive stsato at the current backing price.
///         fees accumulate in the backing, appreciating stsato for all holders.
///         borrow sato against stsato collateral.
///         fully trustless after setStart(): ownership is renounced atomically.
///         just as Bitcoin inspired communities and projects that build economies around it,
///         stsato is designed to encourage long-term holding and the burning of sato,
///         aligning incentives between holders, the bonding curve, and the broader sato ecosystem.

contract StSATO is ERC20Burnable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The sato ERC-20 token that backs this contract.
    address public immutable sato;

    uint16 public constant sell_fee = 990;
    uint16 public constant buy_fee = 990;
    uint16 public constant buy_fee_leverage = 10;
    uint16 private constant FEE_BASE_1000 = 1000;

    uint16 private constant FEES_BUY = 125;
    uint16 private constant FEES_SELL = 125;

    bool public start = false;

    uint256 private totalBorrowed = 0;
    uint256 private totalCollateral = 0;

    uint256 public totalMinted = 0; // cumulative lifetime mints (analytics only, no cap)
    uint256 public totalFeesBurned = 0;
    uint256 public lastPrice = 0;

    struct Loan {
        uint256 collateral;  // stsato locked as collateral
        uint256 borrowed;    // sato owed back to the contract
        uint256 endDate;
        uint256 numberOfDays;
    }

    mapping(address => Loan) public Loans;
    mapping(uint256 => uint256) public BorrowedByDate;
    mapping(uint256 => uint256) public CollateralByDate;
    uint256 public lastLiquidationDate;

    event Price(uint256 time, uint256 price, uint256 volumeInSato);
    event Started(bool started);
    event Liquidate(uint256 time, uint256 amount);
    event LoanDataUpdate(
        uint256 collateralByDate,
        uint256 borrowedByDate,
        uint256 totalBorrowed,
        uint256 totalCollateral
    );
    event SendSato(address to, uint256 amount);

    constructor(address _sato) ERC20("stsato", "stsato") Ownable(msg.sender) {
        require(_sato != address(0), "sato cannot be zero address");
        sato = _sato;
        lastLiquidationDate = getMidnightTimestamp(block.timestamp);
    }

    // ── Owner admin ────────────────────────────────────────────────────────────

    /// @notice Fair-launch bootstrap. Owner deposits `satoAmount` sato; ALL stsato
    ///         minted goes directly to the dead address. Owner receives nothing.
    ///         Starting price = 1 sato per stsato.
    ///         Requires at least 1 sato (1e18 wei).
    function setStart(uint256 satoAmount) external onlyOwner {
        require(!start, "Already started");
        require(satoAmount >= 1 ether, "Minimum 1 sato to bootstrap");
        // Fair-launch: owner seeds the backing but receives no stsato.
        // All minted stsato is permanently locked in the dead address.
        // price = getBacking() / totalSupply() = satoAmount / satoAmount = 1e18.
        IERC20(sato).safeTransferFrom(msg.sender, address(this), satoAmount);
        _mintInternal(address(0x000000000000000000000000000000000000dEaD), satoAmount);
        start = true;
        lastPrice = 1e18;
        emit Started(true);
        // Renounce ownership permanently — no privileged functions remain after launch.
        renounceOwnership();
    }

    // ── Core trading ───────────────────────────────────────────────────────────

    /// @notice Buy stsato with sato. Caller must approve this contract for `satoAmount` first.
    function buy(address receiver, uint256 satoAmount) external nonReentrant {
        liquidate();
        require(start, "Trading must be initialized");
        require(receiver != address(0), "Receiver cannot be 0x0");
        IERC20(sato).safeTransferFrom(msg.sender, address(this), satoAmount);
        uint256 stsato = satoToStsato(satoAmount);
        _mintInternal(receiver, (stsato * getBuyFee()) / FEE_BASE_1000);
        uint256 feeAmount = satoAmount / FEES_BUY;
        _sendFees(feeAmount);
        _safetyCheck(satoAmount);
    }

    /// @notice Sell stsato to receive sato.
    function sell(uint256 stsatoAmount) external nonReentrant {
        liquidate();
        uint256 satoOut = stsatoToSato(stsatoAmount);
        uint256 feeAmount = satoOut / FEES_SELL;
        _burn(msg.sender, stsatoAmount);
        _sendSato(msg.sender, (satoOut * sell_fee) / FEE_BASE_1000);
        _sendFees(feeAmount);
        _safetyCheck(satoOut);
    }

    // ── Lending ────────────────────────────────────────────────────────────────

    /// @notice Borrow sato against stsato collateral.
    ///         Caller must approve this contract to transfer `collateral` stsato.
    /// @param satoAmount  sato amount to borrow (gross, before 1% overcollateralisation).
    /// @param numberOfDays  Loan duration (1–365).
    function borrow(uint256 satoAmount, uint256 numberOfDays) external nonReentrant {
        require(start, "Trading must be initialized");
        require(numberOfDays < 366, "Max 365 days");
        require(satoAmount != 0, "Must borrow more than 0");
        if (isLoanExpired(msg.sender)) {
            delete Loans[msg.sender];
        }
        require(Loans[msg.sender].borrowed == 0, "Use borrowMore to borrow more");
        liquidate();

        uint256 endDate = getMidnightTimestamp((numberOfDays * 1 days) + block.timestamp);
        uint256 satoFee = getInterestFee(satoAmount, numberOfDays);
        uint256 feeAddressFee = satoFee / 10;

        // Collateral stsato required (ceiling division to protect the protocol)
        uint256 userStsato = satoToStsatoNoTradeCeil(satoAmount);
        uint256 newUserBorrow = (satoAmount * 99) / 100;

        Loans[msg.sender] = Loan({
            collateral: userStsato,
            borrowed: newUserBorrow,
            endDate: endDate,
            numberOfDays: numberOfDays
        });

        // Pull stsato collateral from user
        _transfer(msg.sender, address(this), userStsato);

        // Pay fee from backing, then send net borrowed amount to user
        _sendFees(feeAddressFee);
        _sendSato(msg.sender, newUserBorrow - satoFee);

        addLoansByDate(newUserBorrow, userStsato, endDate);
        _safetyCheck(satoFee);
    }

    /// @notice Borrow additional sato against an existing open loan.
    function borrowMore(uint256 satoAmount) external nonReentrant {
        require(!isLoanExpired(msg.sender), "Loan expired - use borrow");
        require(satoAmount != 0, "Must borrow more than 0");
        liquidate();

        uint256 userBorrowed   = Loans[msg.sender].borrowed;
        uint256 userCollateral = Loans[msg.sender].collateral;
        uint256 userEndDate    = Loans[msg.sender].endDate;

        uint256 todayMidnight  = getMidnightTimestamp(block.timestamp);
        uint256 newBorrowLength = (userEndDate - todayMidnight) / 1 days;

        uint256 satoFee        = getInterestFee(satoAmount, newBorrowLength);
        uint256 userStsato     = satoToStsatoNoTradeCeil(satoAmount);
        uint256 userBorrowedStsato = satoToStsatoNoTrade(userBorrowed);
        uint256 userExcessStsato   = ((userCollateral) * 99) / 100 - userBorrowedStsato;

        uint256 requireCollateral = userStsato;
        if (userExcessStsato >= userStsato) {
            requireCollateral = 0;
        } else {
            requireCollateral -= userExcessStsato;
        }

        uint256 feeAddressFee     = satoFee / 10;
        uint256 newUserBorrow     = (satoAmount * 99) / 100;
        uint256 newBorrowTotal    = userBorrowed + newUserBorrow;
        uint256 newCollateralTotal = userCollateral + requireCollateral;

        Loans[msg.sender] = Loan({
            collateral: newCollateralTotal,
            borrowed: newBorrowTotal,
            endDate: userEndDate,
            numberOfDays: newBorrowLength
        });

        if (requireCollateral != 0) {
            _transfer(msg.sender, address(this), requireCollateral);
        }

        _sendFees(feeAddressFee);
        _sendSato(msg.sender, newUserBorrow - satoFee);

        addLoansByDate(newUserBorrow, requireCollateral, userEndDate);
        _safetyCheck(satoFee);
    }

    /// @notice Remove excess stsato collateral from an active loan.
    function removeCollateral(uint256 amount) external nonReentrant {
        require(!isLoanExpired(msg.sender), "Loan liquidated - no collateral");
        liquidate();
        uint256 collateral = Loans[msg.sender].collateral;
        require(
            Loans[msg.sender].borrowed <= (stsatoToSato(collateral - amount) * 99) / 100,
            "Require 99% collateralisation rate"
        );
        Loans[msg.sender].collateral = collateral - amount;
        _transfer(address(this), msg.sender, amount);
        subLoansByDate(0, amount, Loans[msg.sender].endDate);
        _safetyCheck(0);
    }

    /// @notice Partially repay a loan. Caller must approve this contract for `repayAmount` sato.
    ///         To repay the full amount in one call, use closePosition().
    function repay(uint256 repayAmount) external nonReentrant {
        uint256 borrowed = Loans[msg.sender].borrowed;
        require(repayAmount != 0, "Must repay something");
        require(repayAmount < borrowed, "Use closePosition to fully repay");
        require(!isLoanExpired(msg.sender), "Loan liquidated - cannot repay");
        IERC20(sato).safeTransferFrom(msg.sender, address(this), repayAmount);
        Loans[msg.sender].borrowed = borrowed - repayAmount;
        subLoansByDate(repayAmount, 0, Loans[msg.sender].endDate);
        _safetyCheck(0);
    }

    /// @notice Close a loan by repaying the full borrowed amount. Collateral stsato is returned.
    ///         Caller must approve this contract for `borrowed` sato.
    function closePosition() external nonReentrant {
        uint256 borrowed   = Loans[msg.sender].borrowed;
        uint256 collateral = Loans[msg.sender].collateral;
        require(!isLoanExpired(msg.sender), "Loan liquidated - no collateral");
        IERC20(sato).safeTransferFrom(msg.sender, address(this), borrowed);
        _transfer(address(this), msg.sender, collateral);
        subLoansByDate(borrowed, collateral, Loans[msg.sender].endDate);
        delete Loans[msg.sender];
        _safetyCheck(0);
    }

    /// @notice Close a leveraged position without supplying external sato.
    ///         Burns the locked stsato collateral and uses the proceeds to repay the loan.
    function flashClosePosition() external nonReentrant {
        require(!isLoanExpired(msg.sender), "Loan liquidated - no collateral");
        liquidate();
        uint256 borrowed   = Loans[msg.sender].borrowed;
        uint256 collateral = Loans[msg.sender].collateral;

        uint256 collateralValue        = stsatoToSato(collateral);
        _burn(address(this), collateral);

        uint256 collateralAfterFee = (collateralValue * 99) / 100;
        uint256 fee                    = collateralValue / 100;
        require(collateralAfterFee >= borrowed, "Insufficient collateral to close");

        uint256 toUser        = collateralAfterFee - borrowed;
        uint256 feeAddressFee = fee / 10;

        _sendSato(msg.sender, toUser);
        _sendFees(feeAddressFee);

        subLoansByDate(borrowed, collateral, Loans[msg.sender].endDate);
        delete Loans[msg.sender];
        _safetyCheck(borrowed);
    }

    /// @notice Extend a loan's end date. Caller must approve this contract for the interest fee in sato.
    /// @return loanFee The sato fee charged.
    function extendLoan(uint256 numberOfDays) external nonReentrant returns (uint256) {
        require(numberOfDays > 0, "Must extend by at least 1 day");
        uint256 oldEndDate   = Loans[msg.sender].endDate;
        uint256 borrowed     = Loans[msg.sender].borrowed;
        uint256 collateral   = Loans[msg.sender].collateral;
        uint256 _numberOfDays = Loans[msg.sender].numberOfDays;
        require(!isLoanExpired(msg.sender), "Loan liquidated - no collateral");

        uint256 newEndDate = oldEndDate + (numberOfDays * 1 days);
        require((newEndDate - block.timestamp) / 1 days < 366, "Loan must be under 365 days");

        uint256 loanFee       = getInterestFee(borrowed, numberOfDays);
        uint256 feeAddressFee = loanFee / 10;

        IERC20(sato).safeTransferFrom(msg.sender, address(this), loanFee);
        _sendFees(feeAddressFee);

        subLoansByDate(borrowed, collateral, oldEndDate);
        addLoansByDate(borrowed, collateral, newEndDate);
        Loans[msg.sender].endDate      = newEndDate;
        Loans[msg.sender].numberOfDays = numberOfDays + _numberOfDays;

        _safetyCheck(loanFee);
        return loanFee;
    }

    // ── Leverage ───────────────────────────────────────────────────────────────

    /// @notice Open a leveraged long stsato position.
    ///         Caller pays `totalFee` sato upfront; the protocol mints stsato on their behalf.
    /// @param satoAmount   Notional sato amount for the position.
    /// @param numberOfDays Duration (1-365).
    function leverage(uint256 satoAmount, uint256 numberOfDays) external nonReentrant {
        require(start, "Trading must be initialized");
        require(numberOfDays < 366, "Max 365 days");

        Loan memory userLoan = Loans[msg.sender];
        if (userLoan.borrowed != 0) {
            if (isLoanExpired(msg.sender)) {
                delete Loans[msg.sender];
            }
            require(Loans[msg.sender].borrowed == 0, "Use account with no loans");
        }
        liquidate();

        uint256 endDate     = getMidnightTimestamp((numberOfDays * 1 days) + block.timestamp);
        uint256 satoFee     = leverageFee(satoAmount, numberOfDays);
        uint256 userAmt     = satoAmount - satoFee;
        uint256 feeAddrAmt  = satoFee / 10;
        uint256 userBorrow  = (userAmt * 99) / 100;
        uint256 overCollAmt = userAmt / 100;
        uint256 subValue    = feeAddrAmt + overCollAmt;
        uint256 totalFee    = satoFee + overCollAmt;

        IERC20(sato).safeTransferFrom(msg.sender, address(this), totalFee);

        uint256 userStsato = satoToStsatoLev(userAmt, subValue);
        _mintInternal(address(this), userStsato);

        _sendFees(feeAddrAmt);

        addLoansByDate(userBorrow, userStsato, endDate);
        Loans[msg.sender] = Loan({
            collateral: userStsato,
            borrowed: userBorrow,
            endDate: endDate,
            numberOfDays: numberOfDays
        });

        _safetyCheck(satoAmount);
    }

    // ── Liquidation ────────────────────────────────────────────────────────────

    /// @notice Process all expired loans up to the current timestamp.
    ///         Unbounded loop — safe under normal operation (called on every trade).
    ///         If the protocol has been dormant for an extended period, call
    ///         drainLiquidations() first to drain the backlog in bounded chunks
    ///         before resuming normal trades.
    function liquidate() public {
        uint256 borrowed;
        uint256 collateral;
        while (lastLiquidationDate < block.timestamp) {
            collateral += CollateralByDate[lastLiquidationDate];
            borrowed   += BorrowedByDate[lastLiquidationDate];
            lastLiquidationDate += 1 days;
        }
        if (collateral != 0) {
            totalCollateral -= collateral;
            _burn(address(this), collateral);
        }
        if (borrowed != 0) {
            totalBorrowed -= borrowed;
            emit Liquidate(lastLiquidationDate - 1 days, borrowed);
        }
    }

    /// @notice Drain a backlog of expired loans in bounded chunks.
    ///         Call repeatedly (e.g. drainLiquidations(30)) until
    ///         lastLiquidationDate >= block.timestamp before resuming trades
    ///         after an extended period of protocol dormancy.
    /// @param maxDays Maximum number of days to process in this call.
    function drainLiquidations(uint256 maxDays) external {
        uint256 borrowed;
        uint256 collateral;
        for (uint256 i = 0; i < maxDays && lastLiquidationDate < block.timestamp; i++) {
            collateral += CollateralByDate[lastLiquidationDate];
            borrowed   += BorrowedByDate[lastLiquidationDate];
            lastLiquidationDate += 1 days;
        }
        if (collateral != 0) {
            totalCollateral -= collateral;
            _burn(address(this), collateral);
        }
        if (borrowed != 0) {
            totalBorrowed -= borrowed;
            emit Liquidate(lastLiquidationDate - 1 days, borrowed);
        }
    }

    // ── View helpers ───────────────────────────────────────────────────────────

    /// @notice Interest rate fee for a given amount and duration.
    /// @notice Total stsato burned since deployment (sells + liquidations + loan closures).
    ///         Derived from totalMinted - totalSupply() — no extra storage needed.
    function getTotalBurned() external view returns (uint256) {
        return totalMinted - totalSupply();
    }

    function getInterestFee(uint256 amount, uint256 numberOfDays) public pure returns (uint256) {
        uint256 interest = Math.mulDiv(0.02e18, numberOfDays, 365) + 0.0005e18;
        return Math.mulDiv(amount, interest, 1e18);
    }

    /// @notice Total leverage fee (mint fee + interest).
    function leverageFee(uint256 satoAmount, uint256 numberOfDays) public view returns (uint256) {
        uint256 mintFee  = (satoAmount * buy_fee_leverage) / FEE_BASE_1000;
        uint256 interest = getInterestFee(satoAmount, numberOfDays);
        return mintFee + interest;
    }

    /// @notice Preview how many stsato `satoAmount` would buy (no trade).
    function getBuyAmount(uint256 satoAmount) public view returns (uint256) {
        uint256 stsato = satoToStsatoNoTrade(satoAmount);
        return (stsato * getBuyFee()) / FEE_BASE_1000;
    }

    /// @notice Frontend helper - equivalent to getBuyAmount.
    function getBuyStsato(uint256 satoAmount) external view returns (uint256) {
        return Math.mulDiv(satoAmount * buy_fee, totalSupply(), getBacking() * FEE_BASE_1000);
    }

    function getBuyFee() public view returns (uint256) { return buy_fee; }
    function getTotalBorrowed() public view returns (uint256) { return totalBorrowed; }
    function getTotalCollateral() public view returns (uint256) { return totalCollateral; }

    /// @notice Total sato backing = sato held by contract + outstanding borrowed sato.
    function getBacking() public view returns (uint256) {
        return IERC20(sato).balanceOf(address(this)) + totalBorrowed;
    }

    function getMidnightTimestamp(uint256 date) public pure returns (uint256) {
        return (date - (date % 86400)) + 1 days;
    }

    function getLoansExpiringByDate(uint256 date) public view returns (uint256, uint256) {
        uint256 midnight = getMidnightTimestamp(date);
        return (BorrowedByDate[midnight], CollateralByDate[midnight]);
    }

    function getLoanByAddress(address _address) public view returns (uint256, uint256, uint256) {
        if (Loans[_address].endDate >= block.timestamp) {
            return (Loans[_address].collateral, Loans[_address].borrowed, Loans[_address].endDate);
        }
        return (0, 0, 0);
    }

    function isLoanExpired(address _address) public view returns (bool) {
        return Loans[_address].endDate < block.timestamp;
    }

    // ── Bonding-curve math ─────────────────────────────────────────────────────

    /// @notice Convert stsato -> sato at current price (round down, favours protocol).
    function stsatoToSato(uint256 value) public view returns (uint256) {
        return Math.mulDiv(value, getBacking(), totalSupply());
    }

    /// @notice Convert sato -> stsato at current price, accounting for buy impact (round down).
    function satoToStsato(uint256 value) public view returns (uint256) {
        return Math.mulDiv(value, totalSupply(), getBacking() - value);
    }

    /// @notice Convert sato -> stsato for a leverage mint, excluding fees from backing (ceiling).
    function satoToStsatoLev(uint256 value, uint256 fee) public view returns (uint256) {
        uint256 backing = getBacking() - fee;
        return Math.mulDiv(value, totalSupply(), backing, Math.Rounding.Ceil);
    }

    /// @notice Convert sato -> stsato without price impact, ceiling division (favours protocol).
    function satoToStsatoNoTradeCeil(uint256 value) public view returns (uint256) {
        uint256 backing = getBacking();
        return Math.mulDiv(value, totalSupply(), backing, Math.Rounding.Ceil);
    }

    /// @notice Convert sato -> stsato without price impact, floor division (favours user).
    function satoToStsatoNoTrade(uint256 value) public view returns (uint256) {
        return Math.mulDiv(value, totalSupply(), getBacking());
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    function _mintInternal(address to, uint256 value) private {
        require(to != address(0), "Can't mint to 0x0 address");
        totalMinted += value;
        _mint(to, value);
    }

    function _safetyCheck(uint256 satoAmount) private {
        uint256 newPrice = Math.mulDiv(getBacking(), 1e18, totalSupply());
        uint256 _totalCollateral = balanceOf(address(this));
        require(_totalCollateral >= totalCollateral, "stsato balance < tracked collateral");
        require(lastPrice <= newPrice, "Price of stsato cannot decrease");
        lastPrice = newPrice;
        emit Price(block.timestamp, newPrice, satoAmount);
    }

    function _sendSato(address to, uint256 amount) internal {
        IERC20(sato).safeTransfer(to, amount);
        emit SendSato(to, amount);
    }

    /// @dev Sends 1% of feeAmount to the dead address (permanently out of circulation);
    ///      the remaining 99% stays in the contract and increases the sato backing for all
    ///      stsato holders. Skips silently if feeAmount is zero.
    function _sendFees(uint256 feeAmount) internal {
        if (feeAmount == 0) return;
        uint256 burnAmount = feeAmount / 100;
        totalFeesBurned += burnAmount;
        IERC20(sato).safeTransfer(DEAD, burnAmount);
        // remaining 99% stays in contract → accrues to stSATO holders as price appreciation
    }

    function addLoansByDate(uint256 borrowed, uint256 collateral, uint256 date) private {
        CollateralByDate[date] += collateral;
        BorrowedByDate[date]   += borrowed;
        totalBorrowed          += borrowed;
        totalCollateral        += collateral;
        emit LoanDataUpdate(CollateralByDate[date], BorrowedByDate[date], totalBorrowed, totalCollateral);
    }

    function subLoansByDate(uint256 borrowed, uint256 collateral, uint256 date) private {
        CollateralByDate[date] -= collateral;
        BorrowedByDate[date]   -= borrowed;
        totalBorrowed          -= borrowed;
        totalCollateral        -= collateral;
        emit LoanDataUpdate(CollateralByDate[date], BorrowedByDate[date], totalBorrowed, totalCollateral);
    }
}
