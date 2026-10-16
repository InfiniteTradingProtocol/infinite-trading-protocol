# USD Yield Vault — Internal Security Review

| | |
|---|---|
| **Prepared by** | Infinite Trading (internal review — not a third-party audit) |
| **Scope** | `contracts/src/yield/**` |
| **Vault core** | Morpho Vault V2 (vendored, unmodified, `contracts/lib/morpho-vault-v2`) |
| **Network** | Base (chain id 8453), asset USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Compiler** | Solidity `0.8.28`, `via_ir`, `optimizer_runs=100_000`, `evm_version=cancun` |
| **OpenZeppelin** | v5 (UUPS, Ownable2Step, ReentrancyGuard) |
| **Test results** | 68 unit, 4 fuzz, 6 invariants (all passing); 3 / 3 Base fork tests |
| **Status** | Pre-deployment |

---

## 1. Executive Summary

The USD Yield Vault is a fully on-chain USDC yield aggregator. It replaces the dHEDGE-based "USD Yield" vault and has no dHEDGE dependency. Depositors hold shares in a **Morpho Vault V2**. The whole position sits in one integration at a time, chosen from a DAO-curated list. The keeper can move it only when the on-chain APR of the target beats the current one by a configurable threshold.

Funds can only reach adapters that pass both of these gates:

1. **Morpho Vault V2 curator timelock (3 days):** `addAdapter` and every cap increase must be submitted by the DAO Safe, can be revoked by the Safe or any sentinel, and can be executed only after the timelock.
2. **InfiniteTradingRegistry (DAO-owned):** the vault's `adapterRegistry`. Adapters must be listed there, and the registry is also the source of truth for APR readers and keepers (executors).

No critical or high-severity issue was found. One low-severity issue (a keeper could exit a delisted integration into a non-best one) was **fixed** during the review. The remaining findings are inherent to single-position yield aggregation or are informational.

## 2. Scope

| File | LoC | Role |
|---|---|---|
| `InfiniteTradingRegistry.sol` | 298 | UUPS registry: vaults, integrations, rate readers, executors; delayed upgrades |
| `proxy/InfiniteRegistryProxy.sol` | 15 | ERC1967 proxy |
| `InfiniteYieldAllocator.sol` | 240 | Vault allocator: `requireRebalance`, `allocateIdle`, `daoRebalance`, pause |
| `InfiniteYieldAllocatorFactory.sol` | 22 | CREATE2 allocator factory |
| `InfiniteYieldBootstrapper.sol` | 265 | Two-transaction deployment (`deployVault`, `finalize`) |
| `adapters/CompoundV3Adapter.sol` | 105 | Morpho V2 adapter for Comet USDC |
| `adapters/CompoundV3AdapterFactory.sol` | 20 | CREATE2 adapter factory |
| `readers/AaveV3RateReader.sol` | 22 | Aave v3 `currentLiquidityRate` (RAY → WAD) |
| `readers/CompoundV3RateReader.sol` | 17 | Comet `getSupplyRate(utilization) × secondsPerYear` |
| `readers/FluidRateReader.sol` | 28 | Fluid LendingResolver `supplyRate` |
| `readers/MetaMorphoRateReader.sol` | 53 | Asset-weighted supply APR across the MetaMorpho withdraw queue, net of fee |
| `interfaces/*` | 195 | Interfaces |

Out of scope:
- Morpho Vault V2 and MorphoVaultV1Adapter. These are vendored unmodified and audited by Morpho.
- The underlying protocols (Aave, Compound, Fluid, MetaMorpho vaults).
- Frontend and keeper code.

## 3. Architecture

```
Depositor ──deposit/redeem──▶ Morpho Vault V2 (shares "itpUSD")
                                 │  adapterRegistry = InfiniteTradingRegistry
                                 │  allocator       = InfiniteYieldAllocator
                                 │  liquidityAdapter = current integration
                                 ▼
          ┌─────────────┬────────────┬──────────────┬──────────────┐
   MorphoVaultV1Adapter × 5 (ERC-4626)            CompoundV3Adapter
   Aave stata · Fluid fUSDC · Gauntlet Prime ·      Comet cUSDCv3
   Spark USDC · Steakhouse Prime

Keeper ──requireRebalance(to)──▶ Allocator ──getApy()──▶ Registry ──▶ RateReader
```

- **Deposits** flow straight into the liquidity adapter (the current integration). **Withdrawals** pull from it.
- **`requireRebalance(to)`** (executor-only, `nonReentrant`, not paused, after cooldown) works as follows:
  - `to` must be an active registry integration for this vault and a vault adapter, and must differ from the current one.
  - If the current integration is active: require `apr(to) ≥ apr(from) + minApyDelta`.
  - If the current integration is inactive (delisted) or there is none: require `apr(to) ≥ max apr` over the active integrations.
  - Then deallocate everything from `from`, allocate all idle USDC to `to`, set `to` as the liquidity adapter, and start the cooldown.
- **Bounds:**
  - `minApyDelta` ∈ [0.10 pp, 5.00 pp]; deployed with 0.70 pp.
  - `cooldown` ∈ [10 min, 30 days]; deployed with 1 h.
- **`daoRebalance(from, to)`** is the owner's override: no APY check, no cooldown, ignores pause. `to = 0` exits to idle.

## 4. Roles

| Role | Holder | Powers |
|---|---|---|
| Vault owner / curator | DAO Safe `0xb5dB…CEfB` | Timelocked (3 d): adapters, cap increases, fees, registry. Instant: cap decreases, skim recipient |
| Vault sentinel | Safe, keeper1 | Revoke pending submits, decrease caps, deallocate |
| Vault allocator | InfiniteYieldAllocator | allocate / deallocate / liquidity adapter / maxRate |
| Allocator owner | DAO Safe (Ownable2Step, renounce disabled) | thresholds, cooldown, unpause, `daoRebalance`, `setMaxRate` |
| Registry owner | DAO Safe (Ownable2Step, renounce disabled) | integrations, readers, executors, vault listing, upgrades (3-day delay) |
| Executors | `0xE6C3…A340`, `0x233E…F0C0` | `requireRebalance`, `allocateIdle`, `pause` |
| Bootstrapper | none after `finalize` | Verified: holds no role after deployment |

## 5. Findings

| # | Severity | Title | Status |
|---|---|---|---|
| F-01 | Medium (availability, inherent) | Single-position illiquidity blocks withdrawals | Acknowledged |
| F-02 | Low | Keeper could exit a delisted integration into a non-best one | **Fixed** |
| F-03 | Low | Executor can manipulate a pool APR to trigger a move | Acknowledged |
| F-04 | Low | Third parties can sandwich keeper transactions | Acknowledged |
| F-05 | Low | `forceDeallocate` with 0 penalty can push funds to idle | Mitigated |
| F-06 | Low | Broken reader for the current integration blocks the keeper | Mitigated |
| F-07 | Low | Pool-level APR ignores dilution from the vault's own deposit | Acknowledged |
| F-08 | Info | Registry upgrade cannot directly reach funds | — |
| F-09 | Info | CREATE2 front-running only causes a DoS | — |
| F-10 | Info | MetaMorpho reader gas grows with the withdraw queue | — |
| F-11 | Info | `getApys` gas griefing by a reader | — |
| F-12 | Info | Supply cap or pause on a target reverts deposits | — |
| F-13 | Info | Deposits made before `finalize` stay idle | — |
| F-14 | Info | Readers exclude reward incentives (COMP, Merit, etc.) | — |
| F-15 | Info | Morpho V2 `max*` functions return 0 | — |

### F-01 — Single-position illiquidity blocks withdrawals (Medium, inherent)
All assets sit in one integration. If that integration is at 100 % utilization (for example, a Morpho market fully borrowed), redemptions revert until liquidity returns.

**Mitigation:**
- Every integration is a blue-chip USDC market with an interest-rate model that pushes utilization down.
- The DAO can `daoRebalance` to another integration or to idle once liquidity reappears.
- Users can `forceDeallocate` from any adapter (penalty 0).
- Splitting across several integrations was considered and rejected in favour of whole-position moves (user decision).

### F-02 — Keeper could exit a delisted integration into a non-best one (Low) — Fixed
**Before:** when the current integration was deactivated in the registry, `requireRebalance` skipped every APR check, so an executor could move the funds to the worst active integration.

**Fix:** the inactive-source and no-source branches were merged. Both now require `apr(to) ≥ max apr` over the active integrations (`NotBestIntegration`).

**Tests:**
- `test_exitInactiveIntegrationWithoutApyCheck`: exiting to the best integration works even though its APR is below the delisted one's.
- `test_exitInactiveIntegrationOnlyToBest`: moving to a worse integration reverts.

### F-03 — APR manipulation by an executor (Low)
APR readers use spot rates. A compromised executor can flash-borrow to raise utilization (and therefore the APR) of a target in the same transaction and trigger a move.

**Impact is bounded:**
- Funds only move between DAO-whitelisted, timelocked adapters, with no slippage on these lending deposits.
- One move per cooldown.
- A worse integration still has to beat the threshold.
- The DAO can remove the executor, and the allocator can be paused.

The loss is the APR difference until the next legitimate rebalance.

### F-04 — Sandwiching keeper transactions (Low)
A third party can do the same as F-03 around a public keeper transaction. The bounds are the same.

Recommendation: the keeper should submit through a private mempool when one is available on Base, and re-check `bestRebalance()` right before sending.

### F-05 — `forceDeallocate` griefing (Low, mitigated)
With `forceDeallocatePenalty = 0`, anyone can move assets from an adapter to idle at no cost. Funds stay in the vault but earn nothing.

Mitigation: the keeper calls `allocateIdle()` every run. No value can be extracted.

### F-06 — Broken reader for the current integration (Low, mitigated)
If `getApy(from)` reverts (reader bug or upstream upgrade), `requireRebalance` reverts.

Mitigation: the DAO either calls `setRateReader` or deactivates the integration. Deactivation switches the path to the best-of-active check (F-02), and `daoRebalance` is always available. `getApys` uses `try/catch` so the dashboard keeps working.

### F-07 — Dilution ignored (Low)
Readers report the pool APR before our deposit. At large TVL, moving in lowers the target's rate and may trigger a move back (ping-pong).

Bounds: the threshold and cooldown. The cost is gas only. Revisit if TVL becomes a material share of any pool.

### F-08 — Registry upgrades (Info)
The registry is UUPS-upgradeable, but only after `proposeUpgrade` plus a 3-day delay (bounds 1–30 days). An upgraded registry still cannot add an adapter to the vault on its own: `addAdapter` needs the curator timelock, and sentinels can revoke it. Executors and the APR source can change, but movements remain limited to vault adapters.

### F-09 — CREATE2 front-running (Info)
The factories and bootstrapper use deterministic salts. A front-runner can only make a deployment revert (DoS). Changing the salt avoids it, and it cannot capture roles because the configuration is part of the transaction.

### F-10 — MetaMorpho reader gas (Info)
Gas grows linearly with the withdraw queue length (~30 markets max). This was measured on the fork and is well within limits.

### F-11 — `getApys` gas griefing (Info)
Readers are DAO-set. A malicious reader could consume the gas of view calls. This has no on-chain fund impact.

### F-12 — Target supply cap or pause (Info)
If the liquidity adapter's target is paused or capped, deposits revert. The DAO or keeper moves to another integration.

### F-13 — Deposits before `finalize` (Info)
Between `deployVault` and `finalize`, a third-party deposit stays idle and redeemable. A test covers this.

### F-14 — Incentives excluded (Info)
COMP, Merit and Morpho rewards are not counted, so APRs are conservative. The skim recipient (DAO) can collect reward tokens that adapters receive.

### F-15 — `max*` functions return 0 (Info)
Morpho Vault V2 returns 0 from `maxDeposit`, `maxMint`, `maxWithdraw` and `maxRedeem`. Integrators must use the `preview*` functions instead. The frontend follows this.

## 6. Security Properties Tested

| Property | Where |
|---|---|
| Only executors can call `requireRebalance` / `allocateIdle`; only the owner can call `daoRebalance` / setters / unpause | `Allocator.t.sol` |
| A move requires the threshold, cooldown, active integration, vault adapter and `to ≠ from` | `Allocator.t.sol` |
| Inactive or missing source → `to` must be the best | `Allocator.t.sol` |
| Parameter bounds enforced; renounce disabled | `Allocator.t.sol`, `Registry.t.sol` |
| The registry upgrade delay is enforced, can be cancelled, and initialization is locked | `Registry.t.sol` |
| A reader must match the adapter's target | `Registry.t.sol` |
| CompoundV3Adapter never borrows; accounting matches Comet's balance; only the vault can call it | `CompoundV3Adapter.t.sol` |
| After bootstrap the Safe holds every role and the bootstrapper none; 3-day timelocks set | `Bootstrapper.t.sol` |
| Atomic revert when the source is illiquid or the destination rejects the deposit; share price unchanged by a rebalance | `Allocator.t.sol` |
| Fuzz: threshold rule, cooldown rule, no loss across rebalances, non-executor always rejected (512 runs) | `YieldFuzz.t.sol` |
| Invariants (128 runs × depth 40): solvent, single position, no stray funds, cooldown respected, redeems never fail, roles unchanged | `YieldInvariant.t.sol` |
| Real Base protocols: sane readers, full lifecycle, keeper cannot move to a worse rate | `YieldFork.t.sol` |

## 7. Fork Rehearsal (Base mainnet fork, anvil)

The rehearsal ran the full deployment through both `DeployYieldVault.s.sol` and the dashboard wizard.

**Deployment:** 11 transactions, the largest 10.9 M gas (under the EIP-7825 cap). The Safe held every role.

**Deposit and rebalancing:**
- A 10 k USDC deposit went to the best integration (Fluid, 4.87 %).
- A keeper move to a worse integration reverted with `InsufficientApyGain`.
- A non-executor got `NotExecutor`.

**Redemption and fees:** redeeming after 7 days returned 10,008.41 USDC. The 10 % performance fee minted the correct shares to the DAO.

**Adding an integration through governance:** Moonwell Flagship USDC was added via the dashboard: submit → 3 days → execute. It read 4.14 %, and the keeper correctly stayed in Fluid.

## 8. Recommendations Before / After Launch

1. Keep `maxRate` conservative. It limits the share-price jump from a donation or from a faulty adapter's `realAssets`.
2. Keeper:
   - Re-check `bestRebalance()` immediately before sending.
   - Call `allocateIdle()` every run.
   - Alert on revert or pause.
3. Start with modest TVL and review F-07 as TVL grows.
4. Obtain an external audit of the four custom contracts (registry, allocator, CompoundV3Adapter, bootstrapper) before significant TVL.
