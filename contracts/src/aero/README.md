# Aero auto-compounders

Classic-pool (Solidly-style) auto-compounders for the Aero DEX. This folder holds every version, its
deployments, audits and Safe setup batches. Version history: [CHANGELOG.md](CHANGELOG.md).

| Version | Source | Status |
|---|---|---|
| **v2** | [`v2/`](v2) `AeroTwapOracle`, `AeroFactoryV2`, `AeroVaultV2` (EIP-1167 clones), `AeroZapV2` | **Current** on Optimism and Base |
| v1 | `AeroFactory.sol`, `AeroVault.sol`, `AeroZap.sol`, `AeroChains.sol`, `IAero.sol` | Superseded on Optimism and Base (all vaults empty); still deployed on Ethereum and Robinhood |

Audits:
- **Current:** [audits/2026-10-30_Auto-Compounder_Security_Review.md](audits/2026-10-30_Auto-Compounder_Security_Review.md)
  ([PDF](audits/2026-10-30_Auto-Compounder_Security_Review.pdf)). Aero v2 compared with the Velodrome (Beefy-derived)
  vault, with every test and its result, bytecode checks, all deployed addresses and live vaults to test.
- [audits/2026-10-24_Aero_v1_v2_UltraCode_Audit.pdf](audits/2026-10-24_Aero_v1_v2_UltraCode_Audit.pdf): v1 audit,
  v2 adversarial review and fixes.

## v2 deployments

Full records (addresses, transactions, routes, fees): [deployments/](deployments).

| Chain | Contract | Address |
|---|---|---|
| Optimism (10) | Oracle | `0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf` |
| | FactoryV2 | `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc` |
| | Vault implementation (not a vault) | `0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a` |
| | ZapV2 | `0x95E97Def5456d5860a26DD3108A71Dd13b3E3592` |
| | ITP/wstETH vault | `0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58` |
| | ITP/USDC vault | `0x579f6D1646fDEb59B37a4DC880DbB6857004BafD` |
| | ITP/WBTC vault | `0x6E276D140230C6f967ee2c79AEd69C90A24e115D` |
| Base (8453) | Oracle | `0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82` |
| | FactoryV2 | `0xB60ce95161506EeC22A2D68A784DD21cf78adcA9` |
| | Vault implementation (not a vault) | `0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0` |
| | ZapV2 | `0xAdF1288917495F806b6014f354638F905B9Ce3fa` |
| | AERO/USDC vault | `0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC` |

DAO and treasury: Safe `0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB`. Every vault is created by the deployer and
handed to the Safe with `transferOwnership`; the Safe completes setup with the batch in
[deployments/safe-batches/](deployments/safe-batches) (Safe Transaction Builder JSON).

## How v2 works

- **Shares** are a claim on LP only (idle + gauge-staked). Deposit LP (`deposit`), both tokens at the pool ratio
  (`depositTokens`), or one token through the optional `AeroZapV2`. Withdraw as LP (`redeem`), both tokens
  (`redeemTokens`) or one token (zap). Deposits and withdrawals never swap and never depend on the oracle or gauge.
- **Compounding** happens only in `harvest(minLiquidity)`: keepers by default (factory keepers set by the DAO plus
  vault extras set by the owner); the owner can open it to everyone. Harvested LP unlocks into the share price
  linearly over `profitUnlockTime` (24 h default), so depositing around a harvest earns nothing extra.
- **Price protection**: Aero classic pools have no `quote()`, so `AeroTwapOracle` builds a TWAP from the pools'
  reserve cumulatives (snapshots usable when 30 min to 36 h old). Every swap and LP mint needs spot within
  `maxDeviationBps` (3%) of the TWAP, output within `maxSlippageBps` (2%) of the TWAP price, and size within
  `maxSwapBps` (0.5%) of reserves. No usable TWAP means the step is skipped, never priced from spot.
- **Reward routes** (gauge reward token to a pool token) are set by the vault owner and may only use pools the
  DAO approved in the factory; approval is re-checked at swap time.
- **Fees** are independent percentages of gross income, accrued and pulled (`claimFees`, `payDao`): DAO
  (factory, default 2%, max 10%), strategist (default 0%, max 10%), keeper (default 0.5%, max 2%), optional exit
  fee (max 1%) kept by the remaining holders. No entry fee.
- **Gauges**: only the DAO attaches one (`setGauge`, validated against the Aero gauge factory and voter) and
  enables staking; the DAO or the owner can emergency-unstake. Gauge calls are wrapped so a broken gauge cannot
  block deposits or withdrawals.
- **Not upgradeable**: fixes require a new deployment and migration.

## Operations

- Keeper flow: `oracle.updateMany([pool, ...rewardRoute])`, then `harvest(minLp)` 30-60 min later. The keeper
  job harvests only when pending income is at least 3x the gas cost and at most every 20 h.
- Deploy or add vaults: `script/aero/v2/deploy-aero-v2.cjs` (dry-run by default, writes the deployment record and
  the Safe batch). Foundry equivalent: `script/aero/v2/DeployAeroV2.s.sol`.
- Tests: `FOUNDRY_PROFILE=aero forge test --match-path 'test/aero/*'`; live forks with `AERO_FORK_TESTS=true`
  (`test/aero/v2/AeroV2Optimism.fork.t.sol`, `test/aero/v2/AeroV2Base.fork.t.sol`).
