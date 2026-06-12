# Infinite Trading Protocol — TradingVault

## Overview

TradingVault is a permissioned, NAV-based vault for algorithmic trading strategies on Base. It replaces dHEDGE V2 for Infinite Trading DAO's bot-managed funds.

Users deposit USDC and receive vault shares priced at $1.00 at inception. The DAO's trading bots hold, trade, and rebalance assets inside the vault. Users withdraw proportionally from all positions at any time. Share price tracks NAV in real time.

---

## Architecture

```
contracts/src/
├── TradingVault.sol              # Core: ERC20 shares, deposit, proportional withdraw, NAV
├── VaultRebalancer.sol           # Side logic: LONG / NEUTRAL transitions
├── AssetOracle.sol               # DAO-controlled pricing (Chainlink + TWAP + Pyth)
├── interfaces/
│   ├── ITradingVault.sol
│   ├── IAssetOracle.sol
│   ├── IAaveV3Pool.sol
│   └── IUniswapV3Router.sol
└── integrations/
    ├── AaveIntegration.sol       # supply / withdraw / borrow / repay
    └── UniswapIntegration.sol    # exactInputSingle / exactInput
```

All contracts are UUPS upgradeable proxies. The DAO multisig holds upgrade authority. Each vault is a separate proxy instance pointing to a shared implementation.

---

## Roles

| Role | Address type | Permissions |
|---|---|---|
| **Owner** | DAO multisig | Upgrade, set oracle, add integrations, emergency halt, change fees |
| **Manager** | Strategy operator | Set side, set long token, enable Aave, add/remove traders |
| **Trader** | Trading bot EOA | Execute swaps, Aave supply/withdraw, rebalance |
| **User** | Any EOA | Deposit, withdraw, zap in/out |

Traders can **never** send funds to an arbitrary address — only whitelisted protocol calls are permitted.

---

## Share Price & NAV

Share price starts at **$1.00** and is calculated in real time:

```
sharePrice = totalAssetValueUSD() × 1e18 / totalShares
```

`totalAssetValueUSD()` iterates every tracked asset, queries `AssetOracle.getValueUsd(token, balance)`, and sums to a USDC-denominated (6 decimal) figure.

**First deposit:** mints `usdcAmount × 1e12` shares so that 1 share = $1.00. A small "dead shares" amount is minted to `address(0xdead)` to prevent ERC4626-style inflation attacks.

---

## Deposit

```
deposit(uint256 usdcAmount)
zapIn(address fromToken, uint256 amount, uint256 minShares)
```

- Accrues management fee before minting
- Enforces `depositCap` (max TVL)
- Records `depositTimestamp[msg.sender]` for withdrawal cooldown
- Updates `peakNAV` if this deposit raises it

---

## Withdrawal — Proportional Basket

When a user withdraws, **no assets are sold**. Every tracked position is unwound proportionally and transferred directly:

```
withdraw(uint256 shares) → (address[] assets, uint256[] amounts)
withdrawToUsdc(uint256 shares, uint256 minUsdc)   // sells basket → USDC
zapOut(uint256 shares, address toToken, uint256 minOut)
```

**Algorithm:**

1. Calculate `userFraction = shares / totalShares`
2. For each asset in `trackedAssets`:
   - If it is an **Aave aToken**: call `aavePool.withdraw(underlying, balance × userFraction, address(this))`, then transfer the underlying to the user
   - Otherwise: transfer `balance × userFraction` of the token directly to the user
3. Burn `shares`
4. Run drawdown check

**Example — user owns 1% of vault:**

| Asset in vault | Action | User receives |
|---|---|---|
| 50,000 USDC | transfer 1% | 500 USDC |
| aBasUSDC (Aave USDC) | withdraw 1% from Aave | 200 USDC |
| aBasWETH (Aave WETH) | withdraw 1% from Aave | 0.003 WETH |
| ITP | transfer 1% | 1,200 ITP |

The user receives the basket as-is. `withdrawToUsdc` sells each asset back to USDC via Uniswap with a caller-supplied `minUsdc` slippage guard.

**Withdrawal cooldown:** users must wait `withdrawCooldown` (default 1 hour) after depositing before withdrawing. This prevents flash loan NAV manipulation.

---

## Side System

The vault operates in one of two sides at a time. The manager sets the side; the trader bot calls `rebalance()` to execute it.

### `NEUTRAL` (Cash)
- Target allocation: 100% USDC (or aBasUSDC if Aave yield is enabled)
- On rebalance: sell all non-USDC assets → USDC → optionally supply to Aave

### `LONG`
- Target allocation: 100% `longToken` (or its Aave equivalent if Aave is enabled and the token has an Aave market)
- On rebalance: withdraw aUSDC → USDC, sell all non-longToken assets → USDC → buy longToken → optionally supply to Aave as collateral

```
setSide(Side side, address longToken)   // manager
rebalance(uint256 maxSlippageBps)       // trader
```

`setSide` does not execute any swaps — it only updates intent. `rebalance` executes the swaps and is subject to:
- NAV integrity check: NAV after rebalance must not drop more than `maxSlippageBps + 50` bps vs NAV before
- Drawdown circuit breaker check

**Side change cooldown:** manager must wait `SIDE_CHANGE_COOLDOWN` (default 1 hour) between side changes to prevent rapid flip exploitation.

---

## Aave V3 Integration (Base)

Aave V3 Pool on Base: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

```
aaveSupply(address token, uint256 amount)    // trader
aaveWithdraw(address token, uint256 amount)  // trader
```

When `aaveEnabled = true` and side is `NEUTRAL`, idle USDC is supplied to Aave to earn yield (aBasUSDC). When side is `LONG` and the long token has an Aave market, the token is held as collateral (earning supply APY).

The aToken balance is automatically tracked as part of `trackedAssets`. Its USD value = underlying USD value (aTokens are 1:1 redeemable, with accrued interest).

---

## AssetOracle

A separate UUPS upgradeable contract owned and operated exclusively by the DAO. The vault calls it for all pricing — the vault itself contains no oracle logic.

```solidity
interface IAssetOracle {
    function getValueUsd(address token, uint256 amount) external view returns (uint256);
    function getUsdPrice(address token) external view returns (uint256 price18);
}
```

Each token is configured with one of four oracle types:

| Type | Used for | Notes |
|---|---|---|
| `CHAINLINK` | ETH, BTC, major tokens | Free to read. 1h heartbeat on Base. Staleness check enforced. |
| `UNISWAP_TWAP` | ITP, cbXRP, cbEGGS, long-tail | Free, on-chain. Recommend 30-min TWAP. Pool cardinality check enforced. |
| `PYTH` | 400+ assets, low latency | Free to read. Off-chain push. Price age ≤ 60s enforced. |
| `FIXED` | Stablecoins (USDC = $1.00) | Only for assets with guaranteed peg. DAO-controlled. |

The DAO can add, modify, or replace oracle configs per token without touching the vault contract.

**Staleness guards (in AssetOracle):**
- Chainlink: `require(block.timestamp - updatedAt <= 7200)` — revert if price older than 2 hours
- TWAP: `require(cardinality >= MIN_CARDINALITY)` — revert if pool has insufficient observations
- Pyth: `require(age <= 60)` — revert if price older than 60 seconds

If `getUsdPrice` reverts, the vault's `totalAssetValueUSD()` reverts, which blocks deposits and rebalances. Withdrawals use a fallback path that skips failed oracles and marks the asset value as zero (conservative — protects users from being blocked from exiting).

---

## Fee Mechanism

### Management Fee
Annual percentage charged continuously against NAV by minting new shares to the manager (diluting depositors). Accrued on every deposit and withdrawal.

```
managementFeeBps  — e.g. 200 = 2% per year
```

### Performance Fee
Charged on withdrawal above the per-address high-water mark.

```
performanceFeeBps  — e.g. 2000 = 20% of profit
highWaterMarkPerShare[user]  — share price at last withdrawal or initial deposit
```

Performance fee is taken as USDC before calculating withdrawal amounts.

---

## Security

### Access Control
- Traders can only call whitelisted function selectors — no arbitrary external calls
- No trader or manager can send vault funds to an arbitrary EOA
- DAO multisig is the sole upgrade authority

### NAV Integrity (invariant on every trader call)
```
navAfterTx >= navBeforeTx × (1 - toleranceBps / 10000)
```
Every swap, Aave call, and rebalance runs this check. Reverts if NAV drops too much in a single transaction (catches bad oracle data, unfair trades, and bugs).

### Drawdown Circuit Breaker
```
if (peakNAV - currentNAV) / peakNAV > maxDrawdownBps:
    halted = true
```
When halted: all trader calls revert. Only owner can unpause. New deposits are blocked. Withdrawals always remain open (users can always exit).

### Deposit / Withdrawal Protections
| Protection | Purpose |
|---|---|
| `depositCap` | Limits blast radius — max TVL the vault accepts |
| `withdrawCooldown` (1h default) | Prevents flash loan NAV manipulation |
| `depositFreeze` | Auto-triggered if NAV drops >5% within one block |
| Dead shares at genesis | Prevents ERC4626 inflation attack |

### Position Limits
- `maxSingleAssetBps` — no single asset may exceed X% of NAV (default 9500 = 95%)
- Checked after every rebalance

### Oracle Staleness
All prices are validated for freshness before use. Stale prices revert the transaction rather than silently returning bad data.

### Reentrancy
All deposit, withdraw, and trade functions are `nonReentrant`. SafeERC20 is used for all token transfers to handle non-standard ERC20s.

---

## Key Addresses (Base Mainnet)

| Contract | Address |
|---|---|
| Uniswap V3 NonfungiblePositionManager | `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1` |
| Uniswap V3 SwapRouter02 | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| Uniswap V3 Factory | `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` |
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| WETH | `0x4200000000000000000000000000000000000006` |
| ITP | `0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440` |
| cbXRP | `0xcb585250f852C6c6bf90434AB21A00f02833a4af` |
| cbEGGS | `0xdDbAbe113c376f51E5817242871879353098c296` |
| DAO / Owner | `0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB` |
| Keeper 1 | `0xE6C312d661bE5e3eC022e2F18e084713A434A340` |
| Keeper 2 | `0x233EC2735d58698eFC4d5f24A521AA251252f0C0` |

---

## Deployed Vaults (Existing — UniV3AutoCompounder)

| Vault | Proxy | Pool |
|---|---|---|
| ITP/USDC 0.05% | `0xf0e3305e81744e4dfa2d01c0a145814357a89018` | `0x16A1E7F62b702d84AAa0D1f534121DE9d17B0E18` |
| cbEGGS/WETH 1% | `0xD248B1e882c4444674D83eF912713113B719f7Ce` | `0x95CB82D517A1Ce4e6ac4312BCf718cD0EE9f3884` |
| ITP/cbXRP 1% | `0x2fe57c7a0978d5bA39461572b87db41131b43646` | `0x33840Ce3817ef3F79DA49EC70e4653c4aE20eE3F` |
| Implementation v2 | `0x578621734b779162A954256cb2903632B8144D5E` | — |

---

## Build Order

1. `AssetOracle.sol` — price feeds, no vault dependency, deploy first
2. `TradingVault.sol` — core: ERC20 shares, deposit, proportional withdraw, NAV
3. Aave integration — `aaveSupply` / `aaveWithdraw`, aToken tracking
4. `VaultRebalancer.sol` — side logic, `_rebalanceToNeutral` / `_rebalanceToLong`
5. Zap functions — `zapIn` / `zapOut` via Uniswap
6. Fee module — management + performance with per-user high-water mark
7. Fork tests — NAV invariant fuzz, drawdown circuit breaker, proportional withdrawal math
8. Deploy scripts — `DeployAssetOracle.s.sol`, `DeployTradingVault.s.sol`
