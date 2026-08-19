---
description: Decoding Fees in Digital Asset Transactions
---

# 💰 Understanding Fees

Infinite Trading products can include several fee layers depending on the vault or API action.

## Vault-level fees

- **Management fees** (where configured): ongoing operational compensation
- **Performance fees** (where configured): charged only when strategy gains are realized above the relevant threshold model
- **Entry/exit mechanics**: depending on vault type, deposits/withdrawals can include product-specific fee logic

## Auto-compounder fee mechanics

In the Uniswap auto-compounder integrations:

- **Zap-in fee** can apply on single-token entry
- **Compounding fee split** includes DAO and executor allocation

In Velodrome auto-compounder operations:

- Rewards are harvested and restaked
- Harvester incentive logic can include an ITP-denominated reward path

## API monetization fees

The API layer includes action-based pricing for automation operations (for example trade/approve/lend/borrow classes), while many read endpoints remain free-tier usage surfaces.

This model allows:

- sustainable infrastructure operation
- gas wallet abstraction for strategy operators
- programmable execution across networks

## User impact

- Fees are explicit and tied to concrete operations.
- Most user-facing vault analytics already reflect net behavior after fee effects.
- Fee-backed infrastructure helps keep products maintained and evolving.

> Always review fee settings of a specific vault or endpoint before transacting.
