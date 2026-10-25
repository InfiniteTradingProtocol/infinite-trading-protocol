# Aero auto-compounders: changelog

Newest first. Addresses and transactions: [deployments/](deployments). Audits: [audits/](audits).

## v2.0.0 (2026-10-24)

Deployed on Optimism (factory `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc`) and Base (factory
`0xB60ce95161506EeC22A2D68A784DD21cf78adcA9`). New vaults: Optimism ITP/wstETH, ITP/USDC, ITP/WBTC; Base AERO/USDC.

- New `AeroTwapOracle`: TWAP from pool reserve cumulatives; every swap and LP mint is checked against it.
- Reward routes restricted to DAO-approved pools (re-checked at swap time), multi-hop with size clamping.
- No reward basket: shares are LP only; deposits and withdrawals never trade.
- Harvested LP unlocks over 24 h (`profitUnlockTime`; owner changes apply from the next harvest).
- Independent, pull-claimed fees: DAO 2% (factory), strategist 0%, keeper 0.5% of gross income; exit fee kept by
  holders; no entry fee.
- Keepers: DAO adds/removes factory keepers; owner adds vault extras; harvest closed by default, owner can open it.
- Gauges attachable later by the DAO only (validated), wrapped gauge calls, emergency unstake.
- Anyone can launch vaults; only the DAO marks them official.
- Vaults are EIP-1167 clones of a fixed implementation (not upgradeable).
- Audit: `audits/2026-10-24_Aero_v1_v2_UltraCode_Audit.pdf`. v2 review findings (1 High, 2 Medium, 4 Low) fixed
  before deployment.

## v1.0.0 (2026-10-21/22) - superseded on Optimism and Base

`AeroFactory` / `AeroVault` / `AeroZap`. Superseded by v2 on Optimism and Base on 2026-10-24 (all v1 vaults
there were empty); v1 remains on Ethereum and Robinhood. Known issues (see audit): xAERO dust blocks zap deposits,
keeper-chosen swap pools with spot pricing, unrevocable mandatory keepers, pushed fees can freeze withdrawals for
blocklistable tokens, gauge fixed at creation. Addresses: [deployments/v1.json](deployments/v1.json).
