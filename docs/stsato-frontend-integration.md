# StSATO — Frontend Integration Guide

> Just as Bitcoin inspired communities and projects that build economies around it, stSATO is designed to encourage long-term holding and the burning of SATO, aligning incentives between holders, the bonding curve, and the broader SATO ecosystem.

**Website:** [infinitetrading.io](https://infinitetrading.io)

## Contract Info

| Property | Value |
|---|---|
| **Contract Address** | `0xe6A47B3a09aCD76d2B42268b7F6B2D65603eFAB8` |
| **Network** | Ethereum Mainnet |
| **Chain ID** | `1` |
| **Token Name** | `stsato` |
| **Token Symbol** | `stsato` |
| **Decimals** | `18` |
| **SATO Token** | `0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09` |
| **Etherscan** | https://etherscan.io/address/0xe6A47B3a09aCD76d2B42268b7F6B2D65603eFAB8 |

---

## ABI

```json
[{"inputs":[{"internalType":"address","name":"_sato","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"type":"error","name":"ERC20InsufficientAllowance"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"type":"error","name":"ERC20InsufficientBalance"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"type":"error","name":"ERC20InvalidApprover"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"type":"error","name":"ERC20InvalidReceiver"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"type":"error","name":"ERC20InvalidSender"},{"inputs":[{"internalType":"address","name":"spender","type":"address"}],"type":"error","name":"ERC20InvalidSpender"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"type":"error","name":"OwnableInvalidOwner"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"type":"error","name":"OwnableUnauthorizedAccount"},{"inputs":[],"type":"error","name":"ReentrancyGuardReentrantCall"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"type":"error","name":"SafeERC20FailedOperation"},{"inputs":[{"internalType":"address","name":"owner","type":"address","indexed":true},{"internalType":"address","name":"spender","type":"address","indexed":true},{"internalType":"uint256","name":"value","type":"uint256","indexed":false}],"type":"event","name":"Approval","anonymous":false},{"inputs":[{"internalType":"uint256","name":"time","type":"uint256","indexed":false},{"internalType":"uint256","name":"amount","type":"uint256","indexed":false}],"type":"event","name":"Liquidate","anonymous":false},{"inputs":[{"internalType":"uint256","name":"collateralByDate","type":"uint256","indexed":false},{"internalType":"uint256","name":"borrowedByDate","type":"uint256","indexed":false},{"internalType":"uint256","name":"totalBorrowed","type":"uint256","indexed":false},{"internalType":"uint256","name":"totalCollateral","type":"uint256","indexed":false}],"type":"event","name":"LoanDataUpdate","anonymous":false},{"inputs":[{"internalType":"address","name":"previousOwner","type":"address","indexed":true},{"internalType":"address","name":"newOwner","type":"address","indexed":true}],"type":"event","name":"OwnershipTransferred","anonymous":false},{"inputs":[{"internalType":"uint256","name":"time","type":"uint256","indexed":false},{"internalType":"uint256","name":"price","type":"uint256","indexed":false},{"internalType":"uint256","name":"volumeInSato","type":"uint256","indexed":false}],"type":"event","name":"Price","anonymous":false},{"inputs":[{"internalType":"address","name":"to","type":"address","indexed":false},{"internalType":"uint256","name":"amount","type":"uint256","indexed":false}],"type":"event","name":"SendSato","anonymous":false},{"inputs":[{"internalType":"bool","name":"started","type":"bool","indexed":false}],"type":"event","name":"Started","anonymous":false},{"inputs":[{"internalType":"address","name":"from","type":"address","indexed":true},{"internalType":"address","name":"to","type":"address","indexed":true},{"internalType":"uint256","name":"value","type":"uint256","indexed":false}],"type":"event","name":"Transfer","anonymous":false},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","name":"BorrowedByDate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","name":"CollateralByDate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","name":"Loans","outputs":[{"internalType":"uint256","name":"collateral","type":"uint256"},{"internalType":"uint256","name":"borrowed","type":"uint256"},{"internalType":"uint256","name":"endDate","type":"uint256"},{"internalType":"uint256","name":"numberOfDays","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"stateMutability":"view","type":"function","name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"stateMutability":"view","type":"function","name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"},{"internalType":"uint256","name":"numberOfDays","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"borrow"},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"borrowMore"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"burn"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"burnFrom"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"satoAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"buy"},{"inputs":[],"stateMutability":"view","type":"function","name":"buy_fee","outputs":[{"internalType":"uint16","name":"","type":"uint16"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"buy_fee_leverage","outputs":[{"internalType":"uint16","name":"","type":"uint16"}]},{"inputs":[],"stateMutability":"nonpayable","type":"function","name":"closePosition"},{"inputs":[],"stateMutability":"view","type":"function","name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}]},{"inputs":[{"internalType":"uint256","name":"maxDays","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"drainLiquidations"},{"inputs":[{"internalType":"uint256","name":"numberOfDays","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"extendLoan","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"nonpayable","type":"function","name":"flashClosePosition"},{"inputs":[],"stateMutability":"view","type":"function","name":"getBacking","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"}],"stateMutability":"view","type":"function","name":"getBuyAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"getBuyFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"}],"stateMutability":"view","type":"function","name":"getBuyStsato","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"numberOfDays","type":"uint256"}],"stateMutability":"pure","type":"function","name":"getInterestFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"_address","type":"address"}],"stateMutability":"view","type":"function","name":"getLoanByAddress","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"date","type":"uint256"}],"stateMutability":"view","type":"function","name":"getLoansExpiringByDate","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"date","type":"uint256"}],"stateMutability":"pure","type":"function","name":"getMidnightTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"getTotalBorrowed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"getTotalBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"getTotalCollateral","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"_address","type":"address"}],"stateMutability":"view","type":"function","name":"isLoanExpired","outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"lastLiquidationDate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"lastPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"},{"internalType":"uint256","name":"numberOfDays","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"leverage"},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"},{"internalType":"uint256","name":"numberOfDays","type":"uint256"}],"stateMutability":"view","type":"function","name":"leverageFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"nonpayable","type":"function","name":"liquidate"},{"inputs":[],"stateMutability":"view","type":"function","name":"name","outputs":[{"internalType":"string","name":"","type":"string"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"removeCollateral"},{"inputs":[],"stateMutability":"nonpayable","type":"function","name":"renounceOwnership"},{"inputs":[{"internalType":"uint256","name":"repayAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"repay"},{"inputs":[],"stateMutability":"view","type":"function","name":"sato","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"view","type":"function","name":"satoToStsato","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"fee","type":"uint256"}],"stateMutability":"view","type":"function","name":"satoToStsatoLev","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"view","type":"function","name":"satoToStsatoNoTrade","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"view","type":"function","name":"satoToStsatoNoTradeCeil","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"uint256","name":"stsatoAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"sell"},{"inputs":[],"stateMutability":"view","type":"function","name":"sell_fee","outputs":[{"internalType":"uint16","name":"","type":"uint16"}]},{"inputs":[{"internalType":"uint256","name":"satoAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"setStart"},{"inputs":[],"stateMutability":"view","type":"function","name":"start","outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"view","type":"function","name":"stsatoToSato","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"totalFeesBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"totalMinted","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"stateMutability":"nonpayable","type":"function","name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"stateMutability":"nonpayable","type":"function","name":"transferOwnership"}]
```

---

## Protocol Overview

StSATO is a bonding-curve liquid-staking ERC-20 token backed 1:1 by SATO.

- **Buy SATO → receive stSATO** at the current backing price
- **Sell stSATO → receive SATO** minus fee
- **Trade fees accumulate in the backing**, appreciating stSATO for all holders
- **Borrow SATO** against stSATO collateral at up to 99% LTV
- **No admin keys** after `setStart()` — ownership is permanently renounced

Price formula: `price = getBacking() / totalSupply()` (18 decimal fixed point, 1e18 = 1.0 SATO per stSATO)

---

## Token Approvals

Before calling any write function that moves SATO or stSATO in, the user must approve the contract first.

| Function | Token to Approve | Amount |
|---|---|---|
| `buy(receiver, satoAmount)` | SATO | `satoAmount` |
| `setStart(satoAmount)` | SATO | `satoAmount` (owner only) |
| `borrow(satoAmount, days)` | stSATO | `satoToStsatoNoTradeCeil(satoAmount)` |
| `borrowMore(satoAmount)` | stSATO | `satoToStsatoNoTradeCeil(satoAmount)` |
| `closePosition()` | SATO | `Loans[user].borrowed` |
| `repay(repayAmount)` | SATO | `repayAmount` |
| `extendLoan(days)` | SATO | `getInterestFee(Loans[user].borrowed, days)` |
| `leverage(satoAmount, days)` | SATO | `leverageFee(satoAmount, days)` |

---

## Read Functions

### Protocol State

#### `start() → bool`
Returns `true` once `setStart()` has been called. All trading functions revert until this is `true`. Check this first on page load.

#### `getBacking() → uint256`
Total SATO backing = SATO held in contract + all outstanding borrowed SATO. Divide by `totalSupply()` (scaled ×1e18) to get current price.

#### `lastPrice() → uint256`
Last recorded price in 1e18 units. `1e18` = 1 SATO per stSATO. Use for price charts.

#### `totalSupply() → uint256`
Current circulating stSATO (18 decimals).

#### `totalMinted() → uint256`
Cumulative stSATO ever minted (analytics).

#### `getTotalBurned() → uint256`
Total stSATO burned = `totalMinted - totalSupply()`.

#### `totalFeesBurned() → uint256`
Total SATO permanently destroyed via `SATO.burn()` from fees (~1% of all fees collected). Reduces SATO total supply.

#### `sato() → address`
Returns the SATO token address: `0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09`.

### Price Conversion

#### `getBuyStsato(uint256 satoAmount) → uint256`
#### `getBuyAmount(uint256 satoAmount) → uint256` *(same function)*
Preview: stSATO received for `satoAmount` SATO (accounts for 0.8% buy fee and price impact). **Use this to show the output amount in the buy UI before the user confirms.**

#### `stsatoToSato(uint256 stsatoAmount) → uint256`
Preview: SATO received for selling `stsatoAmount` stSATO (accounts for 0.8% sell fee). **Use for the sell preview.**

#### `satoToStsato(uint256 value) → uint256`
Convert SATO → stSATO at current price with buy impact (floor). For display.

#### `satoToStsatoNoTrade(uint256 value) → uint256`
Convert SATO → stSATO without price impact (floor). For display.

#### `satoToStsatoNoTradeCeil(uint256 value) → uint256`
Same but ceiling division. **Use this to compute the exact stSATO collateral required for `borrow()` and `borrowMore()`.**

#### `getBuyFee() → uint256`
Returns the fee numerator: `1000 - buy_fee` = 8 (0.8% of trade).

#### `buy_fee() → uint16` → returns `990`
#### `sell_fee() → uint16` → returns `990`
#### `buy_fee_leverage() → uint16` → returns `10`

### Loan / Borrow State

#### `getLoanByAddress(address _address) → (uint256 collateral, uint256 borrowed, uint256 endDate)`
Returns the user's active loan. All values 18 decimals. Returns `(0, 0, 0)` if no loan.
- `collateral` — stSATO locked
- `borrowed` — SATO borrowed
- `endDate` — unix timestamp when loan expires

> **IMPORTANT — how to check for an active loan:**  
> Always use `borrowed > 0` to determine whether a loan exists. Do NOT rely solely on `isLoanExpired` — it returns `true` for addresses with no loan at all (because `endDate = 0 < block.timestamp`). See the pitfall note below.

#### `Loans(address) → (uint256 collateral, uint256 borrowed, uint256 endDate, uint256 numberOfDays)`
Raw mapping — same as above plus original `numberOfDays`.

#### `isLoanExpired(address _address) → bool`
`true` if the user's loan `endDate` is in the past. **Also returns `true` for addresses that have never borrowed** (because the default `endDate` is `0`, which is always less than `block.timestamp`).

> **PITFALL — `isLoanExpired` does NOT mean "has a loan":**  
> ```
> isLoanExpired = true  →  EITHER: loan expired  OR: no loan ever opened
> isLoanExpired = false →  loan exists and is still active
> ```
> Always check `borrowed > 0` first. Correct pattern:
> ```js
> const [collateral, borrowed, endDate] = await contract.getLoanByAddress(addr)
> const hasLoan     = borrowed > 0n
> const loanExpired = hasLoan && (endDate < BigInt(Math.floor(Date.now() / 1000)))
> const loanActive  = hasLoan && !loanExpired
> ```
> Using `isLoanExpired` alone to gate a "show borrow UI" will incorrectly show the borrow form to users who already have an active loan (the contract will then revert with "Active loan exists").

#### `getTotalBorrowed() → uint256`
Total SATO borrowed across all active loans.

#### `getTotalCollateral() → uint256`
Total stSATO locked as collateral across all active loans.

#### `getInterestFee(uint256 amount, uint256 numberOfDays) → uint256`
Pure. Returns SATO interest fee for borrowing `amount` SATO for `numberOfDays`. **Use to preview the SATO cost before `extendLoan()`.**

#### `leverageFee(uint256 satoAmount, uint256 numberOfDays) → uint256`
Total SATO fee to open a leverage position (mint fee + full interest upfront). **Use to preview before `leverage()`.**

#### `lastLiquidationDate() → uint256`
Unix timestamp of the last day that has been processed for liquidations. If far behind `block.timestamp`, call `drainLiquidations()` first.

#### `getLoansExpiringByDate(uint256 date) → (uint256 collateral, uint256 borrowed)`
Total collateral + borrowed expiring on a specific midnight timestamp.

#### `BorrowedByDate(uint256 midnightTimestamp) → uint256`
#### `CollateralByDate(uint256 midnightTimestamp) → uint256`
Raw day-bucket mappings.

#### `getMidnightTimestamp(uint256 date) → uint256`
Pure. Rounds `date` down to midnight UTC. Use to query the day-bucket mappings.

---

## Write Functions

### Trading

#### `buy(address receiver, uint256 satoAmount)`
Buy stSATO with SATO.

**Step 1 — Approve:** `SATO.approve("0xe6A47B3a09aCD76d2B42268b7F6B2D65603eFAB8", satoAmount)`
**Step 2 — Call:** `buy(userAddress, satoAmount)`

- `receiver` — address to receive stSATO (can differ from `msg.sender`)
- `satoAmount` — SATO to spend (18 decimals)
- Reverts if: `start() == false`, `receiver == address(0)`

---

#### `sell(uint256 stsatoAmount)`
Sell stSATO to receive SATO. No prior approval needed.

- `stsatoAmount` — stSATO to sell (18 decimals)
- Reverts if: `start() == false`, balance insufficient

---

### Borrowing

#### `borrow(uint256 satoAmount, uint256 numberOfDays)`
Borrow SATO against stSATO collateral.

**Step 1 — Compute collateral:** `collateral = await contract.satoToStsatoNoTradeCeil(satoAmount)`
**Step 2 — Approve stSATO:** `stSATO.approve("0xe6A47B3a09aCD76d2B42268b7F6B2D65603eFAB8", collateral)`
**Step 3 — Call:** `borrow(satoAmount, numberOfDays)`

- `satoAmount` — SATO to borrow (18 decimals)
- `numberOfDays` — loan duration, 1–365
- Reverts if: user already has a loan (use `borrowMore()` instead)

---

#### `borrowMore(uint256 satoAmount)`
Add more to an existing open loan.

**Step 1 — Compute collateral:** `satoToStsatoNoTradeCeil(satoAmount)`
**Step 2 — Approve stSATO**
**Step 3 — Call:** `borrowMore(satoAmount)`

- Reverts if: no active loan, loan is expired

---

#### `repay(uint256 repayAmount)`
Partially repay a loan. To fully close, use `closePosition()`.

**Approve SATO first:** `SATO.approve(CONTRACT, repayAmount)`

- `repayAmount` — SATO to repay (must be > 0 and < `Loans[user].borrowed`)
- Reverts if: loan is liquidated, `repayAmount` >= full balance

---

#### `closePosition()`
Fully repay the loan and recover all collateral. Collateral stSATO returned to `msg.sender`.

**Approve SATO first:** `SATO.approve(CONTRACT, Loans[user].borrowed)`

- Reverts if: loan already liquidated

---

#### `flashClosePosition()`
Close a leveraged position without providing external SATO. Burns the locked stSATO collateral and uses the proceeds to repay the loan. No approval needed.

Best for: closing positions opened via `leverage()`.

---

#### `removeCollateral(uint256 amount)`
Withdraw excess collateral from an active loan (only surplus above minimum required).

No approval needed — contract sends stSATO back to caller.

- `amount` — stSATO to withdraw (18 decimals)
- Reverts if: loan expired, would drop below 99% collateralisation, no active loan

---

#### `extendLoan(uint256 numberOfDays)`
Extend an active loan's end date.

**Step 1 — Compute fee:** `fee = await contract.getInterestFee(Loans[user].borrowed, numberOfDays)`
**Step 2 — Approve SATO:** `SATO.approve(CONTRACT, fee)`
**Step 3 — Call:** `extendLoan(numberOfDays)`

- `numberOfDays` — days to extend (≥1, new total ≤365)
- Returns: `uint256` fee charged

---

### Leverage

#### `leverage(uint256 satoAmount, uint256 numberOfDays)`
Open a leveraged long stSATO position. Protocol mints stSATO and locks it as collateral; caller pays SATO fee upfront.

**Step 1 — Compute fee:** `fee = await contract.leverageFee(satoAmount, numberOfDays)`
**Step 2 — Approve SATO:** `SATO.approve(CONTRACT, fee)`
**Step 3 — Call:** `leverage(satoAmount, numberOfDays)`

- `satoAmount` — notional SATO amount (18 decimals)
- `numberOfDays` — duration, 1–365
- Reverts if: user already has an active loan

---

### Liquidations

#### `liquidate()`
Process all expired loans up to `block.timestamp`. Called automatically on every trade. Safe to call manually.

No parameters, no approval.

#### `drainLiquidations(uint256 maxDays)`
Clear expired loan backlog in bounded chunks. Call repeatedly until `lastLiquidationDate >= block.timestamp`. Use before trading after long protocol dormancy.

- `maxDays` — days to process per call (e.g. `30`)

---

### Bootstrap (Owner Only — One Time)

#### `setStart(uint256 satoAmount)`
Owner-only. Bootstraps the protocol. All minted stSATO is permanently locked in the dead address. Permanently renounces ownership atomically.

**Approve SATO first:** `SATO.approve(CONTRACT, satoAmount)` — minimum `1000000000000000000` (1 SATO)

After this call: `owner()` returns `address(0)`, `start()` returns `true`. No further admin actions possible.

---

## Events

| Event | Signature | When | Use |
|---|---|---|---|
| `Price` | `Price(uint256 time, uint256 price, uint256 volumeInSato)` | Every buy/sell | Price charts, volume tracking |
| `Started` | `Started(bool started)` | Once at `setStart()` | UI unlock |
| `LoanDataUpdate` | `LoanDataUpdate(uint256 collateralByDate, uint256 borrowedByDate, uint256 totalBorrowed, uint256 totalCollateral)` | Every borrow/repay/liquidation | Real-time loan stats |
| `Liquidate` | `Liquidate(uint256 time, uint256 amount)` | On liquidation | Liquidation feed |
| `SendSato` | `SendSato(address to, uint256 amount)` | On SATO outflows | Activity feed |
| `Transfer` | `Transfer(address from, address to, uint256 value)` | All stSATO transfers | Token balance tracking |

---

## Common UI Patterns

### Check if Trading is Live
```js
const isStarted = await contract.start()
// gate all UI on this
```

### Display Current Price
```js
const backing = await contract.getBacking()   // bigint
const supply  = await contract.totalSupply()  // bigint
const price   = (backing * 10n**18n) / supply // 1e18 = 1.0 SATO/stSATO
const priceFloat = Number(price) / 1e18
```

### Buy Flow
```js
// Preview
const stsatoOut = await contract.getBuyStsato(satoAmountWei)

// Approve + Buy
await satoToken.approve(STSATO_ADDRESS, satoAmountWei)
await contract.buy(userAddress, satoAmountWei)
```

### Sell Flow
```js
// Preview
const satoOut = await contract.stsatoToSato(stsatoAmountWei)

// No approval needed
await contract.sell(stsatoAmountWei)
```

### Borrow Flow
```js
// Compute required collateral (always use Ceil for borrowing)
const collateral = await contract.satoToStsatoNoTradeCeil(satoToBorrow)

// Preview interest cost
const interestFee = await contract.getInterestFee(satoToBorrow, days)

// Approve collateral (stSATO) then borrow
await stSatoToken.approve(STSATO_ADDRESS, collateral)
await contract.borrow(satoToBorrow, days)
```

### Close Position
```js
const [collateral, borrowed, endDate] = await contract.getLoanByAddress(userAddress)

await satoToken.approve(STSATO_ADDRESS, borrowed)
await contract.closePosition()
```

### Check Liquidation Health

> **IMPORTANT — `lastLiquidationDate` may be ahead of the current time:**  
> At deployment, `lastLiquidationDate` is initialised to the *next* midnight after deploy. For the first ~24 hours this value is **greater than** `block.timestamp`. A naive `nowSec - lastLiq` with BigInt arithmetic will underflow (wrap to a huge positive number), making `daysBehind` appear enormous. Always guard with a `> nowSec` check.

```js
const lastLiq = await contract.lastLiquidationDate()  // bigint
const nowSec  = BigInt(Math.floor(Date.now() / 1000))

// Guard: lastLiq may be ahead of now (initialised to next midnight)
const isCaughtUp  = lastLiq >= nowSec
const daysBehind  = isCaughtUp ? 0 : Number((nowSec - lastLiq) / 86400n)

if (!isCaughtUp && daysBehind > 1) {
  // call drainLiquidations(30) until caught up
}
```

---

## Function Selectors (for direct calldata)

| Function | Selector |
|---|---|
| `buy(address,uint256)` | `0xcce7ec13` |
| `sell(uint256)` | `0xe4849b32` |
| `borrow(uint256,uint256)` | `0x0ecbcdab` |
| `borrowMore(uint256)` | `0x9d0bf2e9` |
| `repay(uint256)` | `0x371fd8e6` |
| `closePosition()` | `0xc393d0e3` |
| `flashClosePosition()` | `0x9d41ac3a` |
| `leverage(uint256,uint256)` | `0x5e96263c` |
| `extendLoan(uint256)` | `0x7ace2ac9` |
| `removeCollateral(uint256)` | `0x3237c158` |
| `liquidate()` | `0x28a07025` |
| `drainLiquidations(uint256)` | `0x9b06d209` |
| `setStart(uint256)` | `0xf6a03ebf` |
| `getBacking()` | `0xc94220ab` |
| `getBuyStsato(uint256)` | `0xe583cf10` |
| `getBuyAmount(uint256)` | `0x1fb87f39` |
| `stsatoToSato(uint256)` | `0xa48c76e4` |
| `satoToStsatoNoTradeCeil(uint256)` | `0x38dc9e56` |
| `getLoanByAddress(address)` | `0x95ced06f` |
| `isLoanExpired(address)` | `0x70f84ba9` |
| `getInterestFee(uint256,uint256)` | `0x035b7c4b` |
| `leverageFee(uint256,uint256)` | `0x3be4e598` |
| `start()` | `0xbe9a6555` |
| `lastPrice()` | `0x053f14da` |
| `totalSupply()` | `0x18160ddd` |
| `totalMinted()` | `0xa2309ff8` |
| `getTotalBurned()` | `0xb55cd04b` |
| `getTotalBorrowed()` | `0x0307c4a1` |
| `getTotalCollateral()` | `0xd6eb5910` |
| `lastLiquidationDate()` | `0x3421f750` |

---

## Fee Summary

| Action | Fee | Destination |
|---|---|---|
| Buy | 0.8% of SATO in | ~99% added to backing, ~1% burned via `SATO.burn()` |
| Sell | 0.8% of stSATO value | ~99% stays in backing, ~1% burned via `SATO.burn()` |
| Borrow | Interest = `2% * days/365 + 0.05%` | Repaid to backing on closePosition |
| Leverage | Mint fee (0.8%) + full interest upfront | Backing + deflationary burn |

---

## Security Notes

- No admin keys after launch — `owner()` = `address(0)` permanently
- No price oracle — price is pure on-chain math, sandwich attacks provably unprofitable (always -1% loss minimum)
- `ReentrancyGuard` on all state-changing functions
- `SafeERC20` for all token transfers
- `Math.mulDiv` (OpenZeppelin v5) for overflow-safe fixed-point arithmetic
- Max loan: 365 days. Min: 1 day
- Max LTV: 99% collateralisation ratio enforced
