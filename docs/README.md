# Documentation

Technical documentation for the Infinite Trading Protocol contracts. User-facing
documentation (vaults, staking, API, roadmap) lives in [`../gitbook`](../gitbook/README.md).

## Products

| Document | Covers |
|---|---|
| [aero-automation.md](aero-automation.md) | Aero classic-pool auto-compounders v1 and v2: design, fees, testing, deployments |
| [agent-seats.md](agent-seats.md) | `AgentSeats`: Infinite Agents memberships paid in ITP |
| [vault-share-accounting.md](vault-share-accounting.md) | Share accounting fixes in `UniV4AutoCompounder` and the legacy `AutoCompoundVault` |
| [stSATO-vs-EGGS-Finance-Contract-Differences.md](stSATO-vs-EGGS-Finance-Contract-Differences.md) | Side-by-side comparison of `StSATO` and the EGGS Finance contract ([PDF](stSATO-vs-EGGS-Finance-Contract-Differences.pdf)) |

## Frontend integration

| Document | Covers |
|---|---|
| [frontend-integration.md](frontend-integration.md) | `UniV3AutoCompounder` ABI, reads, deposits, withdrawals and zaps |
| [new-functions.md](new-functions.md) | Functions added to the compounder after the original integration guide |
| [stsato-frontend-integration.md](stsato-frontend-integration.md) | `StSATO` buy, sell and staking integration |

## Security reviews

| Document | Covers |
|---|---|
| [stsato-audit.md](stsato-audit.md), [stsato-audit-v2.md](stsato-audit-v2.md) | `StSATO` reviews ([v1 PDF](stsato-audit.pdf), [v2 PDF](stsato-audit-v2.pdf)) |
| [usd-yield-vault-audit.md](usd-yield-vault-audit.md) | USD yield vault internal security review |

All published reviews, including the Aero and Velodrome ones, are indexed in the
[repository README](../README.md#security-reviews).

## Legacy

- [legacy/infinite-trading-v1-api-instructions.docx](legacy/infinite-trading-v1-api-instructions.docx): original v1 API instructions, superseded by the [API docs](../gitbook/introduction/api/README.md).
