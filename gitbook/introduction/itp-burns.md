# 🔥 ITP Burns

ITP burn activity is tied to ecosystem operations.

## Why burns exist

The burn mechanism is used to reduce circulating supply over time and align long-term token value with real protocol usage.

## Burn sources

In the current ecosystem model, burns can be driven by:

1. **Revenue-linked operations** (treasury/fee allocation policies)
2. **Automated operational flows** where configured
3. **DAO-led burn actions** visible onchain

## Onchain tracking

ITP burn history is tracked and can be surfaced in frontend tooling, including:

- total burn count
- average burn size
- latest burn activity
- transaction-level history to burn addresses

Burn-address tracking commonly includes:

- `0x000000000000000000000000000000000000dead`
- `0x0000000000000000000000000000000000000000`

## Token context used in burn tracking

- **ITP (Optimism, Staking V1 token in app flows)**: `0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0`
- **ITP (Optimism, legacy burn-history dataset token)**: `0x2aF68d8e6f0964789e3ee0e54427258B69E9B8F0`
- Initial supply reference used in burn dashboards: `1,000,000,000 ITP`

## Why this matters for holders

Burn mechanics should be assessed alongside overall product usage across vaults, LP products, and automation infrastructure.
