# Infinite Trading Auto-Compounders: Security Review

**Velodrome v1 (Beefy-derived `InfiniteVaultStrategy`) and Aero v2 (`AeroVaultV2`)**

| | |
|---|---|
| Date | 2026-10-30 (fork tests and on-chain reads between 18:00 UTC on Oct 30 and 01:00 UTC on Oct 31) |
| Chains | Optimism (10), Base (8453) |
| Repository | [InfiniteTradingProtocol/infinite-trading-protocol](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol), branch `main` |
| Reviewer | Claude Code (Opus 5.5) with the Infinite Trading team: an internal, AI-performed review backed by unit, fuzz and live-fork tests. It is **not** an independent third-party audit. |
| Supersedes | [2026-10-24 Aero audit](2026-10-24_Aero_v1_v2_UltraCode_Audit.pdf) for Aero v2. Its v2 findings are carried over intact in section 6; Aero v1 is out of scope here. |

## Results at a glance

| Check | Result |
|---|---|
| Aero v2 unit tests, incl. a fuzz test at 10,000 runs | **33 / 33 pass** |
| Aero v2 live-fork tests (real Optimism and Base pools, gauges, emissions) | **4 / 4 pass** |
| Velodrome vault live-fork tests (upgrade path, all 6 live vaults) | **12 / 12 pass** |
| Deployed bytecode equals this repository's source (9 contracts, immutables masked) | **9 / 9 identical** |
| Vault clones point at the audited implementation (4 Aero v2 vaults) | **4 / 4** |
| Contract size (EIP-170, 24,576 bytes) | Largest is `AeroVaultV2`: 22,218 bytes |
| Open High or Medium findings | **None** |
| Explorer source verification (Aero v2: Etherscan, Basescan, Sourcify, Blockscout) | **8 / 8 verified**; the 4 vault clones show as proxies of the verified implementation |

**Verdict.** We found no way for anyone, including the DAO, a vault owner or a keeper, to take depositors' principal from either design. Every High and Medium issue found in earlier reviews is fixed, and its regression test is in the suites above and passes. What remains is economic and operational: thin ITP liquidity, compounding that depends on a keeper, and, for Aero v2, no upgrade path. Section 10 lists each one. Before significant TVL, we recommend an independent human audit of Aero v2.

---

## 1. Scope

| Component | Source (GitHub) | Live contracts |
|---|---|---|
| **Velodrome v1**: `InfiniteVaultStrategy` v2.1 (vault and strategy in one contract) | [`contracts/src/velodrome/InfiniteVaultStrategy.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/velodrome/InfiniteVaultStrategy.sol) and [`interfaces/`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/tree/main/contracts/src/velodrome/interfaces) | 6 BeaconProxy vaults on Optimism (section 8) |
| **Aero v2**: `AeroTwapOracle`, `AeroFactoryV2`, `AeroVaultV2`, `AeroZapV2`, `IAeroV2` | [`contracts/src/aero/v2/`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/tree/main/contracts/src/aero/v2) | Optimism and Base (section 8) |

Out of scope:
- **Excluded code:** Aero v1 (`contracts/src/aero/*.sol`), the Velodrome and Aero DEX contracts themselves, token contracts, the frontend, and off-chain keepers.
- **Source integrity:** SHA-256 of the reviewed sources at commit [`97d4d6c`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/commit/97d4d6c91dfd95b16c7286026dff8cd9ae1bef4b), which is unchanged on `main`:

| File | SHA-256 |
|---|---|
| `aero/v2/AeroVaultV2.sol` | `e88e691ad8705c1ca9585c0dd162a35617b367b16a36afbbfeeb9d19d39f333f` |
| `aero/v2/AeroFactoryV2.sol` | `2ac3e0b514044cf35b8725c03e4a55d10ffb15f1df462af1c0484347aeb2dbe2` |
| `aero/v2/AeroTwapOracle.sol` | `8c6b4abd9c7c7f00ac0b8a39c891dc2ec5388940828fcdb9db26a86931b137f2` |
| `aero/v2/AeroZapV2.sol` | `dcb356c4569101e8c8c123f2027895b1bb94ae090fb14129d6a5a97920cc349e` |
| `aero/v2/IAeroV2.sol` | `e0f2ed633be598e226bcf1ef987efdd7f68634fe47ecd976d8520df812815402` |
| `velodrome/InfiniteVaultStrategy.sol` (v2.1) | `f6fc8b6a8bae95b85745032e9e9254e1f0e04308c1ba91f18d63b6fc3bde482f`, the same hash recorded in the [2026-09-30 review](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts_audits/InfiniteVaultStrategy_v2.1_Security_Review_2026-09-30.pdf) |

Method:
- Manual line-by-line review of both contracts.
- Comparison with Beefy's upstream sources.
- Re-running every unit, fuzz and live-fork test.
- Comparing deployed runtime bytecode with local builds.
- Read-only on-chain reads of every deployed contract.
- Foundry's static analyser (`forge lint`).

**Tools:** Foundry 1.8 (solc 0.8.26, Cancun, via-IR, 200 optimizer runs; profiles `aero` and `velodrome`) and `cast` for read-only calls. No private keys were used, and no transaction was sent.

---

## 2. Prior audits and references

### 2.1 Beefy (upstream of the Velodrome vault)

The Velodrome vault is a fork of Beefy's open-source Velodrome strategy and vault:
- [`StrategyVelodromeGaugeV2.sol`](https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/strategies/Velodrome/StrategyVelodromeGaugeV2.sol)
- [`BeefyVaultV7.sol`](https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol)
- [`StratFeeManagerInitializable.sol`](https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/strategies/Common/StratFeeManagerInitializable.sol)

Beefy publishes its audits at [github.com/beefyfinance/beefy-audits](https://github.com/beefyfinance/beefy-audits): 12 reports from 2020 to 2025. The reports that cover the vault-and-strategy design this fork inherits are:

| Report | Auditor | Scope | Result |
|---|---|---|---|
| [2020-12-10 Vault audit](https://github.com/beefyfinance/beefy-audits/blob/master/2020-12-10-Beefy-DefiYield-Vault-Audit.pdf) | DefiYield | Beefy vault | Scanned report (4 pages) |
| [2021-03-05 Beefy contracts](https://github.com/beefyfinance/beefy-audits/blob/master/2021-03-05-Beefy-CertiK-Final-For-Beefy-Contracts.pdf) | CertiK | `BeefyVaultV4`, `StrategyCake`, `StrategySyrup`, `YieldBalancer` | 0 critical, 2 major, 1 minor, 11 informational |
| [2021-06-24 Beefy smart contracts](https://github.com/beefyfinance/beefy-audits/blob/master/2021-06-24-Beefy-Smart-Contract.pdf) | CertiK | `BeefyVaultV3`, `BeefyBurningVault`, `StrategyAutoCake`, `StrategyAutoVenus` | 2 critical, 2 major, 4 minor, 13 informational |

The other reports cover newer Beefy products: the ERC-4626 wrapper, the BIFI token, zaps, CLM and beS. Their auditors are Zellic, OpenZeppelin, Cyfrin, Certora, Sherlock and Electisec. Beefy also runs a public bug bounty on [Immunefi](https://immunefi.com/bug-bounty/beefyfinance/).

> **What these audits do and do not cover.** They reviewed Beefy's own earlier vault and strategy contracts, mostly on BNB Chain. None of them covers `StrategyVelodromeGaugeV2`, and none covers Infinite Trading's fork. The fork keeps Beefy's architecture: a share vault over a gauge-staked LP, harvest, fee categories, and pause/panic. But it changes much of the logic (section 3.2), so Beefy's audits are context, not coverage. The fork's own reviews are listed next.

### 2.2 Infinite Trading reviews

| Review | Covers |
|---|---|
| [2026-09-30 InfiniteVaultStrategy v2 and v2.1 security review](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts_audits/InfiniteVaultStrategy_v2.1_Security_Review_2026-09-30.pdf) | Velodrome vault upgrade from v1 to v2.1: 2 High, 4 Medium, 6 Low, 6 Info, all fixed, mitigated or acknowledged |
| [2026-10-24 Aero audit](2026-10-24_Aero_v1_v2_UltraCode_Audit.pdf) | Aero v1 (superseded) and the design, adversarial review and deployment of Aero v2 |
| This report | Velodrome v1 against Aero v2, re-tested on today's chain state |

---

## 3. The original: Velodrome auto-compounder (`InfiniteVaultStrategy`)

### 3.1 How it works

Each vault is a `BeaconProxy`. All six vaults share one implementation through `UpgradeableBeacon`. The beacon is owned by the `InfiniteVaultFactory` proxy, and the DAO Safe holds that factory's only admin role. Because shares and strategy live in one contract, a vault is also its own ERC-20 share token.

1. **Deposit** ([L209-242](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/velodrome/InfiniteVaultStrategy.sol#L209-L242)):
   - The user deposits Velodrome LP (`want`).
   - The vault harvests first, so pending income is priced into the shares.
   - It mints shares pro-rata to `balance()` (idle LP plus gauge-staked LP), then stakes the LP if the gauge is alive.
2. **Harvest** ([L303-342](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/velodrome/InfiniteVaultStrategy.sol#L303-L342)):
   - Permissionless. It also runs before every deposit and withdrawal.
   - **Gauge alive:** claim VELO, take the performance fee, then add liquidity: swap rewards along fixed routes into both pool tokens and add LP at the router quote.
   - **Gauge killed:** unstake, claim the pool's swap fees, and compound those.
   - Every external call in this path is `try/catch`, so a failed harvest never blocks a deposit or withdrawal.
3. **Withdraw** ([L248-277](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/velodrome/InfiniteVaultStrategy.sol#L248-L277)):
   - Burns shares for the pro-rata LP, after the harvest, minus a withdrawal fee.
   - The fee defaults to 0.1% and is capped at 5%. It stays in the vault for the remaining holders, and none is charged while paused.

**Fees.** The performance fee applies to the reward token only:
- **Total:** 10% of rewards, capped at 50%.
- **Swap and split:** the fee is swapped to ITP and split between the treasury, the harvest caller and an ITP burn.
- **Live split:** 99.5–99.9% of the fee is burned and 0.1–0.5% goes to the caller.
- **Swap fees:** with every gauge now killed (OBS-05), income is pool swap fees, which carry no performance fee.

### 3.2 What Infinite Trading changed versus Beefy upstream

| Area | Beefy (`StrategyVelodromeGaugeV2` + `BeefyVaultV7`) | Infinite Trading `InfiniteVaultStrategy` v2.1 |
|---|---|---|
| Structure | Separate vault and strategy | One contract (shares plus strategy) behind a `BeaconProxy` |
| Upgrades | Vault swaps strategy after an `approvalDelay` timelock | DAO Safe upgrades the beacon (all vaults at once), no timelock (OBS-06) |
| Swap protection | Harvest swaps with `minOut = 0` | `minOut` from router quote minus slippage (0.5% default), **plus** a spot-vs-TWAP guard (3%) before any swap or liquidity add |
| Liquidity add | Ratio estimate; `addLiquidity` with minimums of 1 wei | `quoteAddLiquidity`-sized amounts; leftovers zapped through the pair, capped at 0.5% of reserves with a 1 h cooldown |
| Caller fee recipient | `tx.origin` | `msg.sender`, or an explicit `harvest(address)` for batchers |
| First deposit | Shares equal the amount | 1,000 shares locked at `0x…dEaD`; zero-share deposits revert |
| Harvest on deposit and withdraw | Optional, deposit only | On by default, before deposit **and** withdraw, priced after the harvest |
| Killed gauge | Harvest reverts | Unstake, compound swap fees, re-stake automatically if revived |
| Withdrawal fee cap | 0.5% | 5% (live: 0.1%); the owner is exempt |
| Strategist fee | Strategist share | Replaced by an ITP buy-and-burn share |
| Reentrancy | Vault guarded, strategy not | `nonReentrant` on deposit, withdraw and both `harvest` functions |

### 3.3 Security history (from the 2026-09-30 review; all still in place)

| ID | Severity | Issue | Status in v2.1 |
|---|---|---|---|
| H-01 | High | Rewards never compounded in 5 of 6 vaults (add-liquidity minimums from raw balances, error swallowed) | Fixed: quote-based amounts, capped zap |
| H-02 | High | Harvest-on-deposit priced shares before the harvest | Fixed: harvest first, then price |
| M-01 | Medium | A killed gauge bricked harvest (and so withdrawals) | Fixed: wrapped gauge calls |
| M-02 | Medium | Permissionless harvest with same-block quotes | Mitigated: 3% TWAP guard, deferral |
| M-03 | Medium | First-depositor share inflation | Fixed: 1,000 dead shares |
| M-04 | Medium | A killed gauge earned zero yield | Fixed: unstake and compound swap fees |
| L-01…L-06 | Low | Silent failures, dead ITP/USDC route, thin-pool selling, missing reentrancy guard, dead UUPS path, stable-pool math | 4 fixed, 1 mitigated, 1 by design |
| I-01 | Info | Two EOAs could upgrade every vault | Resolved: the DAO Safe is the only admin |
| I-02…I-06 | Info | Owner powers, swap deadlines, batcher call fee, TWAP liveness, removed views | Acknowledged or resolved |

---

## 4. The new: Aero v2 auto-compounder

### 4.1 Architecture

| Contract | Role |
|---|---|
| `AeroTwapOracle` ([source](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroTwapOracle.sol)) | Permissionless TWAP from Aero pools' reserve cumulatives (Aero classic pools have no `quote()`). 10-minute granularity, a ring of 240 snapshots, and usable windows of 30 min to 36 h. Without a usable snapshot it returns `ok = false`. |
| `AeroFactoryV2` ([source](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroFactoryV2.sol)) | Immutable launcher. Anyone can create a vault (an EIP-1167 clone of one fixed implementation). The DAO alone sets the protocol fee, keepers, approved route pools, the treasury and the "official" label, and gauges are validated through it. |
| `AeroVaultV2` ([source](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol)) | The vault. Shares are a claim on LP only, and no proxy admin exists. |
| `AeroZapV2` ([source](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroZapV2.sol)) | Optional single-token in/out router. It holds nothing between calls, uses caller-set minimums, and accepts only factory vaults. |

### 4.2 How it works

1. **Deposit:**
   - The user deposits in one of three ways: LP (`deposit`), both tokens at the pool ratio (`depositTokens`, which pulls only the matched amounts), or one token through the zap.
   - Shares are minted against `totalAssets` = idle LP + staked LP − profit still unlocking.
   - **Deposits never swap, harvest or read the oracle.**
2. **Harvest** (keepers only, unless the owner opens it):
   - Updates the oracle, claims gauge emissions (if staking) and pool fees.
   - Accrues fees on the new income.
   - Swaps the reward along its DAO-approved route, with every hop TWAP-checked.
   - Zaps any one-sided remainder, mints LP and re-stakes.
   - The LP it mints **unlocks into the share price linearly over 24 h**.
3. **Redeem:**
   - Burns shares for LP (`redeem`), both tokens (`redeemTokens`) or one token (zap), with caller minimums.
   - An optional exit fee (default 0%, capped at 1%) stays with the remaining holders.
   - **Redeems never swap or read the oracle**; they withdraw from the gauge only what is needed.

### 4.3 Security guards (with code locations)

| # | Guard | Where |
|---|---|---|
| 1 | No user action trades: deposits and redeems never swap, compound or read the oracle, which removes sandwich and just-in-time attacks on users | [`deposit`…`redeemTokens` L185-247](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L185-L247) |
| 2 | Harvested LP unlocks linearly over `profitUnlockTime` (24 h; owner can set 1 h–2 d, applied at the *next* harvest) | [L141-150](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L141-L150), [L274-282](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L274-L282), [L305-309](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L305-L309) |
| 3 | TWAP or nothing: every swap and LP mint needs a usable TWAP; otherwise the step is skipped (event `StepSkipped`), never priced from spot | [L527-551](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L527-L551), [L570-580](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L570-L580), [oracle L51-67](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroTwapOracle.sol#L51-L67) |
| 4 | Spot within `maxDeviationBps` of the TWAP: default 3%, bounded 0.1–10% | [L621-627](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L621-L627) |
| 5 | Output at least the TWAP fair price minus `maxSlippageBps` (default 2%, max 5%), and received output re-checked after the swap | [L547-550](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L547-L550), [L553-568](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L553-L568) |
| 6 | Size cap: each hop at most `maxSwapBps` of reserves (default 0.5%, max 5%); oversized rewards are clamped, re-planned and the rest waits | [L474-500](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L474-L500), [L613-619](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L613-L619) |
| 7 | Routes use DAO-approved pools only, re-checked at every swap; at most 4 hops, no duplicate pools, and the route must end in a pool token | [L322-343](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L322-L343), [L514-517](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L514-L517) |
| 8 | Harvest is keeper-gated by default (factory keepers set by the DAO, vault extras set by the owner) with a caller `minLiquidity` | [L273-282](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L273-L282) |
| 9 | Fees come from income only, are accrued and **pulled** (`claimFees`, `payDao`), and reserved balances are excluded from compounding; a blocklisted fee recipient can never freeze redemptions | [L249-268](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L249-L268), [L453-472](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L453-L472) |
| 10 | Hard fee caps: DAO ≤ 10% (factory), strategist ≤ 10%, keeper ≤ 2%, exit ≤ 1%; no entry fee and no exemptions | [L24-26, L656-666](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L656-L666), [factory L91-96](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroFactoryV2.sol#L91-L96) |
| 11 | Inflation protection: the first deposit locks 1,000 shares plus any pre-donated LP at `0xdead`; zero-share mints revert; caller `minShares` | [L389-410](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L389-L410) |
| 12 | Fee-on-transfer LP is rejected: the received amount must equal `lp` | [L190-191](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L190-L191) |
| 13 | Gauges: only the DAO attaches one, and only a gauge that the Aero gauge factory, the voter and the pool all recognise; staking is enabled by the DAO only, and only with a reward route | [L348-367](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L348-L367), [factory L134-144](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroFactoryV2.sol#L134-L144) |
| 14 | Emergency unstake (DAO or owner) returns all LP to the vault; gauge deposit and claim calls are wrapped, so a broken gauge cannot block deposits or harvests | [L368-382](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L368-L382), [L633-645](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L633-L645) |
| 15 | Reentrancy: `ReentrancyGuardTransient` on every user, fee, harvest and staking entry point | `nonReentrant` throughout `AeroVaultV2`, `AeroZapV2` |
| 16 | Initialisation: implementation initializers disabled; `initialize` callable only by the factory; two-step ownership | [L100-131](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L100-L131) |
| 17 | Exact approvals: the gauge allowance is set to the amount and reset to 0; the zap resets allowances and refunds dust | [L638-644](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroVaultV2.sol#L638-L644), [zap L66-72](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/v2/AeroZapV2.sol#L66-L72) |
| 18 | **No sweep, rescue or upgrade function.** No role can move LP or tokens out except a holder redeeming their own shares and fee recipients claiming accrued fees | Whole contract |

### 4.4 Who can do what

| Role | Can | Cannot |
|---|---|---|
| Depositor | Deposit, redeem (LP, tokens or one token) at any time; claim nothing on others' behalf | — |
| Keeper | `harvest(minLiquidity)`; earns the keeper fee (0.5%) | Choose pools, prices or amounts; touch principal |
| Vault owner (DAO Safe for official vaults) | Set fees within caps, risk parameters within bounds, unlock time (next harvest), extra keepers, open harvest, reward route through DAO-approved pools; emergency unstake | Upgrade code, attach a gauge, enable staking, approve pools, withdraw user funds |
| DAO (Safe `0xb5dB…CEfB`) | DAO fee ≤ 10%, treasury, factory keepers (not the default keeper), approved pools, official flag, attach a validated gauge, enable staking, emergency unstake | Upgrade code, withdraw user funds |
| Anyone | Create a vault (unofficial), update the oracle, trigger `claimFees`/`payDao` (funds go only to the entitled account) | Mark a vault official |

---

## 5. Velodrome v1 versus Aero v2

| Aspect | Velodrome v1 (`InfiniteVaultStrategy` v2.1) | Aero v2 (`AeroVaultV2`) |
|---|---|---|
| Code base | Fork of Beefy's Velodrome strategy and vault | New code on OpenZeppelin 5 |
| Upgradeability | BeaconProxy; DAO Safe can upgrade all vaults instantly | None: fixed EIP-1167 clones; fixes need a new deployment and migration |
| Who launches vaults | Factory admin (DAO) | Anyone; only the DAO marks vaults official |
| DEX interaction | Velodrome router | Direct pool calls (transfer, swap, mint, burn) |
| Harvest | Permissionless, and before every deposit and withdrawal | Keepers only by default; never inside deposits or withdrawals |
| Anti-JIT | Harvest before pricing shares | No compounding in user actions, plus a 24 h linear profit unlock |
| Price check | Spot within 3% of `pool.quote` TWAP; swap `minOut` from same-block quote | Own oracle TWAP (30 min–36 h); spot within 3%; output within 2% of the TWAP price; size ≤ 0.5% of reserves; no TWAP means no trade |
| Swap routes | Fixed at initialisation, no setter | Owner-set, DAO-approved pools only, re-checked per hop |
| Income compounded | Gauge rewards (VELO) or, when the gauge is killed, swap fees | Pool fees, gauge emissions and donations, per token |
| Fees | Performance fee on rewards: 10% (cap 50%), mostly burned as ITP; withdrawal fee 0.1% (cap 5%), owner exempt | DAO 2% (cap 10%), strategist 0% (cap 10%), keeper 0.5% (cap 2%) of gross income, all pull-claimed; exit fee 0% (cap 1%) kept by holders; no exemptions |
| User slippage parameters | None | `minShares`, `minLp`, `min0` / `min1`, zap minimums |
| Deposit forms | LP | LP, both tokens, or one token (zap) |
| Pause | Owner pause / panic; withdrawals stay open | No pause; emergency unstake; withdrawals never depend on the oracle |
| Owner sweep | `inCaseTokensGetStuck` (any token except LP and shares) | None |
| Gauge | Fixed at creation; handles a killed gauge | Attached later by the DAO after validation; replaceable while nothing is staked |
| Ownership | Single-step `Ownable` | Two-step `Ownable2Step` |
| Reentrancy guard | `ReentrancyGuard` (ERC-7201 slot) | `ReentrancyGuardTransient` (EIP-1153) |

**Summary.** Aero v2 swaps the Velodrome vault's two biggest trust points for code-level guarantees. First, nobody can upgrade it, where the DAO can upgrade the Velodrome vaults. Second, harvests run behind a TWAP guard with hop-by-hop size and slippage limits, where the Velodrome vault relies on same-block quotes. Each gain has a cost. Aero v2 cannot be patched, and compounding stops if no keeper runs. In the Velodrome vault, any user's deposit or withdrawal harvests.

---

## 6. Findings

### 6.1 Aero v2 adversarial review (2026-10-24), carried over

Every finding was confirmed with a Foundry proof of concept and an independent skeptic, then fixed before deployment. All regression tests pass today (section 7).

| ID | Severity | Title | Status | Regression test |
|---|---|---|---|---|
| ITP-AEROV2-01 | **High** | Forced skipping of pre-deposit compounding let anyone capture pending income (mock PoC: ~92% of it; fork PoC: ~99%) | Fixed: user actions never compound; harvested LP unlocks over 24 h | `test_JitSandwichCapturesNothing`, `test_ProfitUnlocksLinearly`, `test_UserActionsNeverSwapOrCompound` |
| ITP-AEROV2-02 | Medium | Reward clamp never converged when an intermediate hop bound | Fixed: 4 attempts, 2% margin, re-plan | `test_ClampConvergesOnIntermediateHop` |
| ITP-AEROV2-03 | Medium | 12 h TWAP window too short for a daily keeper | Fixed: 36 h window, oracle updated 30–60 min before harvest | `test_HarvestCompoundsAfterTwapSeeded` |
| ITP-AEROV2-04 | Low | Deposits and redeems could trigger swaps | Fixed by 01 | `test_UserActionsNeverSwapOrCompound` |
| ITP-AEROV2-05 | Low | Revoked route pools were still used by existing routes | Fixed: per-hop re-check | `test_RevokedPoolStopsRoute` |
| ITP-AEROV2-06 | Low | Profit unlock shorter than the harvest interval | Fixed: 24 h default | `test_Defaults` |
| ITP-AEROV2-07 | Low | Owner could shorten the unlock right after a harvest | Fixed: applies at the next harvest | `test_ProfitUnlocksLinearly` |
| ITP-AEROV2-08 | Info | Each harvest restarts the unlock schedule | Accepted (Yearn-style behaviour) | — |
| ITP-AEROV2-09 | Info | A depositor who joins after a harvest shares the unlocking profit | Accepted trade-off; mitigated by regular harvests | — |

Also hardened in v2:
- Staking can only be enabled when a reward route exists, if the reward is not a pool token, and that route cannot be cleared while staking (`test_StakingNeedsRewardRoute`).
- Fees are pull-paid, so a blocklisted strategist cannot freeze redemptions (`test_BlockedStrategistCannotFreezeRedeem`).
- Dust donations cannot block deposits (`test_DustDonationsDoNotBlockDeposits`).

### 6.2 New observations (this review, 2026-10-30)

| ID | Severity | Observation | Recommendation |
|---|---|---|---|
| OBS-01 | Info (operational) | **No Aero v2 vault has been harvested yet.**<br>• `lastHarvest = 0` on all four vaults.<br>• Each pool holds a single oracle snapshot from 2026-10-24, now older than 36 h, so `averageReserves` returns `ok = false`.<br>• A harvest today would accrue fees on income but skip every swap and LP mint, by design; the income waits in the vault for the next valid harvest. Deposits and redeems are unaffected. | Start the keeper flow: `oracle.updateMany([pool, …route])`, then `harvest` 30–60 min later. |
| OBS-02 | Info (resolved) | **Aero v2 sources were not verified on any explorer** when this review started. Resolved on 2026-10-31:<br>• All eight contracts are verified on Optimistic Etherscan, Basescan and [Sourcify](https://sourcify.dev) (`match`), and on Optimism Blockscout. Base Blockscout could not be checked from the command line.<br>• The four vault clones read back on Etherscan as minimal proxies of the verified `AeroVaultV2`, so each vault page shows its source.<br>• The verified source is byte-identical to this repository (section 7.4). | None. |
| OBS-03 | Info (economic) | **The Aero ITP pools are very thin:** about $37 (ITP/USDC), $84 (ITP/wstETH) and $18 (ITP/WBTC) of total depth.<br>• Each vault's own trades are capped at 0.5% of reserves.<br>• A user zap is a market swap, priced only by the caller's `minSwapOut`. | Add liquidity before promoting the ITP vaults; in the UI, default to `depositTokens` or LP over the zap. |
| OBS-04 | Low | **ITP/VELO Velodrome vault fee recipient:** `infiniteFeeRecipient` is `0xe2c7…bD12`, a former team EOA whose factory roles were revoked on 2026-09-30.<br>• That EOA created the vault on 2025-11-06 and passed itself as the recipient.<br>• On 2026-03-04 the other five vaults were moved to the DAO Safe; this one was missed.<br>• Its fee share is 0%, so it receives funds only if the ITP burn fails (burn fallback). Nothing has reached it from this vault. | DAO: `setInfiniteFeeRecipient(Safe)` on `0x569D…2247`. |
| OBS-05 | Info | **All six Velodrome ITP gauges are killed** (`gaugeAlive() = false`).<br>• The vaults hold their LP unstaked and compound pool swap fees; the last harvest was 2026-10-30 13:37 UTC.<br>• Swap fees carry no performance fee. | None. If a gauge is revived, the vaults re-stake automatically (`test_RevivedGaugeRestakes`). |
| OBS-06 | Info (centralisation) | **Velodrome vaults are upgradeable** by the DAO Safe (3-of-8) with no timelock, unlike Beefy's `approvalDelay`. Aero v2 cannot be upgraded by anyone. | Put a timelock in front of `upgradeBeacon` (already noted in the 2026-09-30 review). |
| OBS-07 | Info (tests) | **Stale precondition in `test_DeadGaugeUnstakesAndCompoundsSwapFees`:** it required LP still staked in the killed ITP/DHT gauge.<br>• Live harvests had already moved that LP out, which is the behaviour the test checks.<br>• The precondition is now conditional, and the fee-compounding half runs on today's state. | Done in this review (see the diff in git). |
| OBS-08 | Info (static analysis) | **`forge lint` on `src/aero/v2`:** no exploitable issue. The warnings are expected patterns:<br>• loop counters flagged as uninitialised<br>• calls in bounded loops (≤ 4 hops, 3 tokens)<br>• reentrancy notes on functions already under `nonReentrant`<br>• the intentional strict-equality fee-on-transfer check<br>• `uint64(block.timestamp)`<br>• unused tuple returns from `getReserves` | None. |

No High or Medium issue was found in this review.

---

## 7. Test evidence

All commands run from `contracts/`. Fork tests fork the current chain head and use only public RPCs.

### 7.1 Aero v2 unit tests: 33 / 33 pass

[`test/aero/v2/AeroV2.t.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/test/aero/v2/AeroV2.t.sol) with mocks in [`AeroV2Mocks.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/test/aero/v2/AeroV2Mocks.sol)

```
FOUNDRY_PROFILE=aero forge test --match-path 'test/aero/v2/*' --fuzz-runs 10000 -vv
```

| Test | Proves |
|---|---|
| `test_Defaults` | Initial fees, risk bounds and 24 h unlock are as documented |
| `test_AnyoneLaunchesOnlyDaoMarksOfficial` | Permissionless launch; only the DAO sets `isOfficial` |
| `test_CannotLaunchOnUnknownPool` | Vaults only on pools from the Aero factories |
| `test_ImplementationAndClonesCannotBeReinitialized` | No re-initialisation of the implementation or clones |
| `test_DaoManagesKeepersFeesPoolsTreasury` | DAO-only factory controls; the default keeper cannot be removed |
| `test_OwnerFeeAndRiskBounds` | Owner settings revert outside the caps |
| `test_LpRoundTripWithDeadShares` | First deposit locks dead shares; LP round trip is exact |
| `test_DepositTokensAndRedeemTokens` | Two-token deposit pulls only matched amounts; two-token redeem |
| `test_MinSharesAndMinOutProtect` | Caller minimums revert on slippage |
| `test_ExitFeeStaysWithHolders` | Exit fee accrues to the remaining holders |
| `test_DustDonationsDoNotBlockDeposits` | Donations cannot block deposits (fixes Aero v1's main issue) |
| `test_HarvestClosedByDefaultOpenByOwner` | Keeper gate; the owner can open harvesting |
| `test_FeesAreIndependentShares` | DAO, strategist and keeper fees are independent shares of gross |
| `test_BlockedStrategistCannotFreezeRedeem` | A blocklisted fee recipient cannot block redemptions |
| `test_NoTwapMeansNoSwapButFeesStillCharged` | No TWAP means no swap |
| `test_HarvestCompoundsAfterTwapSeeded` | Compounding works once the oracle window is valid |
| `test_ManipulatedSpotSkipsCompounding` | Spot moved past 3% skips every price-sensitive step |
| `test_RewardRouteNeedsApprovedPools` | Routes reject unapproved, duplicate or mismatched pools |
| `test_MultiHopRewardCompounds` | Multi-hop reward route compounds into LP |
| `test_OversizedRewardIsClampedNotDumped` | Rewards larger than the size cap are clamped, not dumped |
| `test_PoolClaimFailureNeverBlocksDepositOrRedeem` | A failing pool claim never blocks user actions |
| `test_OnlyDaoAttachesValidGaugeAndEnablesStaking` | Gauge validation and DAO-only staking |
| `test_StakedLifecycleAndEmergencyUnstakeByOwner` | Staked deposits, redeems and owner emergency unstake |
| `test_GaugeEmissionsCharged` | Emissions are fee-charged and compounded |
| `test_ZapInOutLeavesNothing` | The zap holds no tokens after use |
| `test_ZapRejectsForeignVault` | The zap only serves factory vaults |
| `test_JitSandwichCapturesNothing` | ITP-AEROV2-01 regression: a just-in-time depositor gains nothing |
| `test_ProfitUnlocksLinearly` | Linear unlock; unlock-time changes apply at the next harvest |
| `test_UserActionsNeverSwapOrCompound` | Deposits and redeems never trade |
| `test_ClampConvergesOnIntermediateHop` | ITP-AEROV2-02 regression |
| `test_RevokedPoolStopsRoute` | ITP-AEROV2-05 regression |
| `test_StakingNeedsRewardRoute` | Staking requires a route when emissions are not a pool token |
| `testFuzz_RoundTripNeverGainsLp` | **10,000 fuzz runs:** a deposit-redeem round trip never returns more LP than deposited |

### 7.2 Aero v2 live-fork tests: 4 / 4 pass

[`AeroV2Optimism.fork.t.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/test/aero/v2/AeroV2Optimism.fork.t.sol) and [`AeroV2Base.fork.t.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/test/aero/v2/AeroV2Base.fork.t.sol). Run at 2026-10-30 18:01 UTC (Optimism ≈ block 158,892,280; Base ≈ 53,297,080).

```
AERO_FORK_TESTS=true FOUNDRY_PROFILE=aero forge test --match-path 'test/aero/v2/*.fork.t.sol' -vv
```

| Test | Proves (on real pools) |
|---|---|
| `test_LiveLifecycleWithMultiHopReward` (Optimism) | Deposit, harvest and redeem on the real ITP/wstETH pool with the real xAERO → USDC → ITP route. The harvest minted LP; the oversized reward was clamped to 0.5% of reserves; both users redeemed in full |
| `test_LiveUnseededOracleNeverSwaps` (Optimism) | With no usable TWAP the vault never swaps |
| `test_LiveGaugeNotYetDeployed` (Optimism) | `setGauge` rejects the not-yet-deployed Aero gauge addresses |
| `test_BaseStakedLifecycle` (Base) | Staked AERO/USDC vault with **real gauge emissions**: harvest minted LP, the DAO fee accrued in AERO, and a 2,000 USDC deposit redeemed 1,991.55 USDC (pool fees and price impact only) |

### 7.3 Velodrome vault live-fork tests: 12 / 12 pass

[`test/InfiniteVaultStrategy.fork.t.sol`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/test/InfiniteVaultStrategy.fork.t.sol). Run at 2026-10-31 00:56 UTC (Optimism ≈ block 158,904,700). Each test upgrades the live beacon exactly as the DAO would, then exercises the six real vaults.

```
FOUNDRY_PROFILE=velodrome forge test --skip script --match-path test/InfiniteVaultStrategy.fork.t.sol -vv
```

| Test | Proves |
|---|---|
| `test_StorageLayoutPreservedOnAllVaults` | Every getter and route of all 6 vaults is unchanged by the upgrade |
| `test_HarvestDeploysIdleTokens` | Idle tokens are deployed into LP; TVL increases |
| `test_ZapIsCappedForIlliquidPools` | ITP price moves ≤ 1.5% per harvest on every vault |
| `test_HarvestNoArgStillPaysCaller` | The legacy `harvest()` pays the caller |
| `test_HarvestAllViaMulticallPaysRecipient` | One Multicall3 transaction harvests all vaults; nothing leaks to Multicall3 |
| `test_DepositWithdrawRoundTripAllLiveVaults` | Deposit, then withdraw a day later, on every vault except ITP/DHT (covered by the dead-gauge deposit test): loss ≤ withdrawal fee |
| `test_WithdrawNeverBlockedByHarvest` | Withdrawals succeed on all 6 vaults |
| `test_DeadGaugeUnstakesAndCompoundsSwapFees` | Killed gauge: LP is unstaked and swap fees compound into LP (OBS-07) |
| `test_DeadGaugeDepositStaysUnstaked` | Deposits into a killed-gauge vault work and withdraw in full minus the fee |
| `test_RevivedGaugeRestakes` | A revived gauge is re-staked in full |
| `test_FirstDepositMintsDeadShares` | A fresh vault locks 1,000 dead shares |
| `test_RollbackToPreviousImplementations` | The DAO can roll back to v2 and v1 |

### 7.4 On-chain checks

**Bytecode.** Runtime bytecode read from each chain (eth_getCode) matched the local build of this repository, with immutable slots masked:

| Chain | Contract | Address | Runtime | Result |
|---|---|---|---|---|
| Optimism | AeroTwapOracle | `0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf` | 1,808 B | identical |
| Optimism | AeroFactoryV2 | `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc` | 4,802 B | identical |
| Optimism | AeroVaultV2 (implementation) | `0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a` | 22,218 B | identical |
| Optimism | AeroZapV2 | `0x95E97Def5456d5860a26DD3108A71Dd13b3E3592` | 4,451 B | identical |
| Base | AeroTwapOracle | `0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82` | 1,808 B | identical |
| Base | AeroFactoryV2 | `0xB60ce95161506EeC22A2D68A784DD21cf78adcA9` | 4,802 B | identical |
| Base | AeroVaultV2 (implementation) | `0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0` | 22,218 B | identical |
| Base | AeroZapV2 | `0xAdF1288917495F806b6014f354638F905B9Ce3fa` | 4,451 B | identical |
| Optimism | InfiniteVaultStrategy v2.1 (live beacon implementation) | `0x36471C8330d4F3527997CC9B379cbF862eD42944` | 24,261 B | identical |

**Configuration** (all read on-chain):
- **Aero v2 vaults:** all four are exact EIP-1167 clones of their chain's implementation, owned by the DAO Safe with no pending owner, and marked official.
- **Aero v2 factories:** both have `dao` and `treasury` set to the Safe, a 2% DAO fee and default keeper `0xE6C3…A340`.
- **Aero v2 implementations:** both have `owner = 0x0`.
- **Velodrome:**
  - The beacon `0x7Ef3…26e6` points to v2.1 and is owned by the factory proxy.
  - The DAO Safe is the factory's only `DEFAULT_ADMIN_ROLE` holder (member count 1), with a 3-signer threshold.
  - The implementation has `owner = 0x0`.

**Static analysis:** `FOUNDRY_PROFILE=aero forge lint src/aero/v2`; see OBS-08.

---

## 8. Deployments

### 8.1 Aero v2 (new auto-compounder)

| Chain | Contract | Address | Explorer verification |
|---|---|---|---|
| Optimism | AeroTwapOracle | [`0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf`](https://optimistic.etherscan.io/address/0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf) | Etherscan, Sourcify, Blockscout; byte-identical |
| Optimism | AeroFactoryV2 | [`0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc`](https://optimistic.etherscan.io/address/0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc) | Etherscan, Sourcify, Blockscout; byte-identical |
| Optimism | AeroVaultV2 implementation (not a vault) | [`0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a`](https://optimistic.etherscan.io/address/0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a) | Etherscan, Sourcify, Blockscout; byte-identical |
| Optimism | AeroZapV2 | [`0x95E97Def5456d5860a26DD3108A71Dd13b3E3592`](https://optimistic.etherscan.io/address/0x95E97Def5456d5860a26DD3108A71Dd13b3E3592) | Etherscan, Sourcify, Blockscout; byte-identical |
| Base | AeroTwapOracle | [`0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82`](https://basescan.org/address/0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82) | Basescan, Sourcify; byte-identical |
| Base | AeroFactoryV2 | [`0xB60ce95161506EeC22A2D68A784DD21cf78adcA9`](https://basescan.org/address/0xB60ce95161506EeC22A2D68A784DD21cf78adcA9) | Basescan, Sourcify; byte-identical |
| Base | AeroVaultV2 implementation (not a vault) | [`0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0`](https://basescan.org/address/0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0) | Basescan, Sourcify; byte-identical |
| Base | AeroZapV2 | [`0xAdF1288917495F806b6014f354638F905B9Ce3fa`](https://basescan.org/address/0xAdF1288917495F806b6014f354638F905B9Ce3fa) | Basescan, Sourcify; byte-identical |

Deployment transactions, routes and fees: [`deployments/optimism-v2.json`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/deployments/optimism-v2.json) and [`deployments/base-v2.json`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/contracts/src/aero/deployments/base-v2.json). The executed DAO setup batches are in [`deployments/safe-batches/`](https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/tree/main/contracts/src/aero/deployments/safe-batches).

### 8.2 Velodrome v1 (original auto-compounder, Optimism)

| Contract | Address | Explorer verification |
|---|---|---|
| InfiniteVaultFactory (ERC1967 proxy) | [`0x88E883a28C8C2f7524C7aAd0a44309E190337D5b`](https://optimistic.etherscan.io/address/0x88E883a28C8C2f7524C7aAd0a44309E190337D5b) | Blockscout (full), Sourcify |
| UpgradeableBeacon | [`0x7Ef3e66BD423B774E132fB15b19bd4c5216926e6`](https://optimistic.etherscan.io/address/0x7Ef3e66BD423B774E132fB15b19bd4c5216926e6) | Blockscout (full) |
| InfiniteVaultStrategy v2.1 (implementation) | [`0x36471C8330d4F3527997CC9B379cbF862eD42944`](https://optimistic.etherscan.io/address/0x36471C8330d4F3527997CC9B379cbF862eD42944) | Blockscout, Sourcify; byte-identical |
| Six vaults (BeaconProxy) | Section 9.2 | Blockscout (full), Sourcify exact match |

DAO Safe (owner of every vault in both systems; Velodrome factory admin; Aero DAO and treasury): [`0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB`](https://optimistic.etherscan.io/address/0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB).

---

## 9. Live vaults reviewers can test

Values as of 2026-10-31 00:55 UTC. USD amounts are approximate, valued at pool prices: ITP ≈ $0.00501 from the Velodrome ITP/USDC pool, AERO ≈ $0.624.

### 9.1 Aero v2

| Vault | Chain | Address | Pool and depth | Vault holds | State |
|---|---|---|---|---|---|
| Infinite Aero ITP/wstETH (`acITP-wstETH`) | Optimism | [`0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58`](https://optimistic.etherscan.io/address/0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58) | [`0x7681…1d36`](https://optimistic.etherscan.io/address/0x76817cf226aa94b164295AED4f62e7a1EEd41d36), ~$84 | test deposit (~$0.05) | No gauge yet, unstaked; route xAERO → USDC → ITP |
| Infinite Aero ITP/USDC (`acITP-USDC`) | Optimism | [`0x579f6D1646fDEb59B37a4DC880DbB6857004BafD`](https://optimistic.etherscan.io/address/0x579f6D1646fDEb59B37a4DC880DbB6857004BafD) | [`0xeA3a…2e01`](https://optimistic.etherscan.io/address/0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01), ~$37 | test deposit (~$0.05) | No gauge yet; route xAERO → USDC |
| Infinite Aero ITP/WBTC (`acITP-WBTC`) | Optimism | [`0x6E276D140230C6f967ee2c79AEd69C90A24e115D`](https://optimistic.etherscan.io/address/0x6E276D140230C6f967ee2c79AEd69C90A24e115D) | [`0x96E3…6651`](https://optimistic.etherscan.io/address/0x96E354C66e56c6083064d30FCE5FeD009C3a6651), ~$18 | test deposit (~$0.05) | No gauge yet; route xAERO → USDC → ITP |
| Infinite Aero AERO/USDC (`acAERO-USDC`) | Base | [`0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC`](https://basescan.org/address/0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC) | [`0xF634…B18E`](https://basescan.org/address/0xF634058dC94e6BF8e828E27621320C423bC8B18E), ~$29.8M | dust test deposit | Gauge [`0xd424…5cD1`](https://basescan.org/address/0xd424BA8ca9d4E278753DE76651a0095451e65cD1) attached and staked; AERO is a pool token, so no route |

All four vaults: fees DAO 2%, strategist 0%, keeper 0.5%, exit 0%; 24 h profit unlock; harvest keeper-only; `lastHarvest = 0` (OBS-01).

**Best vault for testing:** Base AERO/USDC. It is the only one with a deep pool and live gauge emissions. The Optimism ITP pools are tiny (OBS-03), so test them with a few dollars and prefer the two-token or LP deposit.

### 9.2 Velodrome v1 (Optimism)

| Vault | Address | Vault TVL | Share of pool | Price per share |
|---|---|---|---|---|
| Infinite ITP-VELO (`acITP-VELO`) | [`0x569D92f0c94C04C74c2f3237983281875D9e2247`](https://optimistic.etherscan.io/address/0x569D92f0c94C04C74c2f3237983281875D9e2247) | ~$14,830 | 80.3% | 1.3107 |
| Infinite ITP-wstETH (`acITP-wstETH`) | [`0x2811a577cf57A2Aa34e94B0Eb56157066717563f`](https://optimistic.etherscan.io/address/0x2811a577cf57A2Aa34e94B0Eb56157066717563f) | ~$13,000 | 69.9% | 1.1831 |
| Infinite ITP-USDC (`acITP-USDC`) | [`0xC4628802a42F83E5bce3caB05A4ac2F6E485F276`](https://optimistic.etherscan.io/address/0xC4628802a42F83E5bce3caB05A4ac2F6E485F276) | ~$4,220 | 99.7% | 1.1172 |
| Infinite ITP-WBTC (`acITP-WBTC`) | [`0x3092F8dE262F363398F15DDE5E609a752938Cc11`](https://optimistic.etherscan.io/address/0x3092F8dE262F363398F15DDE5E609a752938Cc11) | ~$3,120 | 70.3% | 1.1069 |
| Infinite ITP-DHT (`acITP-DHT`) | [`0xFCEa66a3333a4A3d911ce86cEf8Bdbb8bC16aCA6`](https://optimistic.etherscan.io/address/0xFCEa66a3333a4A3d911ce86cEf8Bdbb8bC16aCA6) | ~$2,000 | ~100% | 1.0523 |
| Infinite ITP-OP (`acITP-OP`) | [`0x8A2e22BdA1fF16bdEf27b6072e087452fa874b69`](https://optimistic.etherscan.io/address/0x8A2e22BdA1fF16bdEf27b6072e087452fa874b69) | ~$1,860 | ~100% | 1.5302 |

Total ≈ $39,000. On every vault the gauge is killed and the LP is unstaked (OBS-05). All six are owned by the DAO Safe, unpaused, with a 0.1% withdrawal fee and harvest on deposit and withdraw, and were last harvested 2026-10-30 13:37 UTC. A price per share above 1.0 is growth since each vault launched: compounded income plus withdrawal fees left in the vault.

### 9.3 How to test

**On the site** ([infinitetrading.io/auto-compounder](https://www.infinitetrading.io/auto-compounder)): connect a wallet on Optimism or Base. Both systems are listed there. Deep links open the Aero v2 ITP deposit dialog preselected:
- [`?pool=itp-usdc`](https://www.infinitetrading.io/auto-compounder?pool=itp-usdc), [`?pool=itp-wsteth`](https://www.infinitetrading.io/auto-compounder?pool=itp-wsteth), [`?pool=itp-wbtc`](https://www.infinitetrading.io/auto-compounder?pool=itp-wbtc)
- Optional `&method=zap|pair|both|lp`: one token, the other token, both tokens, or existing LP.

**Directly on the contracts** (any wallet, or the explorer's Read/Write tabs; every contract is source-verified):

| Action | Aero v2 (`AeroVaultV2`) | Velodrome v1 (`InfiniteVaultStrategy`) |
|---|---|---|
| Deposit LP | `approve(vault, lp)` on the pool, then `deposit(lp, minShares, receiver)` | `approve(vault, lp)`, then `deposit(lp)` |
| Deposit both tokens | Approve both tokens, then `depositTokens(amount0, amount1, minShares, receiver)` | — |
| One token | `AeroZapV2.zapIn(vault, tokenIn, amountIn, swapAmount, minSwapOut, minShares)`; `quoteSwapAmount` gives `swapAmount` | — |
| Withdraw | `redeem(shares, minLp, receiver)`, `redeemTokens(shares, min0, min1, receiver)`, or approve the shares to the zap, then `zapOut(vault, shares, tokenOut, minOut)` | `withdraw(shares)` / `withdrawAll()` |
| Inspect | `totalAssets()`, `convertToAssets(1e18)`, `pendingIncome()`, `lockedProfitNow()`, `rewardRoute()` | `balance()`, `getPricePerFullShare()`, `gaugeAlive()`, `lastHarvest()` |

Expected results:
- **Aero v2:** a deposit followed by a redeem returns the deposited LP exactly (exit fee 0%).
- **Velodrome:** a round trip returns the LP minus the 0.1% withdrawal fee.

---

## 10. Residual risks

- **No upgrade path (Aero v2).** A defect found later cannot be patched. It would need a new deployment, and users would move their own funds. Users always keep the ability to redeem.
- **Keeper dependence (Aero v2).** Compounding needs a keeper that refreshes the oracle and then harvests (OBS-01). If no keeper runs, yield is not compounded, but principal and withdrawals are unaffected.
- **Thin ITP liquidity.** This applies to both systems, and especially to the Aero ITP pools (OBS-03). The vaults cap their own trades, but deposit value and zap execution follow the pool price.
- **Centralised upgrades (Velodrome).** A 3-of-8 Safe can upgrade all six Velodrome vaults instantly (OBS-06).
- **Gauge and DEX dependence.** Withdrawals of staked LP depend on the gauge's `withdraw`. The DEX contracts, the tokens (ITP, USDC, wstETH, WBTC, AERO, xAERO) and their admin powers are outside this review.
- **Review type.** This is an AI-performed internal review. Before significant TVL, get an independent human audit of Aero v2.

## 11. Disclaimer

This report reflects the source code and on-chain state reviewed between 2026-10-30 18:00 UTC and 2026-10-31 01:00 UTC. It was produced by an AI system (Claude Code, Opus 5.5) working with the Infinite Trading team, using manual review, unit, fuzz and live-fork tests, static analysis and read-only on-chain checks.
- It is not a guarantee that the contracts are free of defects.
- It is not an independent third-party audit.
- It covers economic design only as far as stated.
- It is not financial advice.

References to Beefy's audits describe the upstream codebase only. They are not an endorsement by Beefy or its auditors of Infinite Trading's contracts.
