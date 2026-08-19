# 🏛️ ChamberFi (previously dHEDGE)

ChamberFi is the continuation of the earlier dHEDGE product line and remains an important protocol layer in manager and vault workflows.

## Protocol role

ChamberFi provides managed-vault infrastructure where:

- vault managers define strategy mandates
- users deposit into shared vault structures
- portfolio actions execute through onchain transactions
- performance and position states remain transparent onchain

## Relevance to Infinite Trading

Within the ITP ecosystem, ChamberFi-aligned flows are used for:

- manager vault operations
- trader permission workflows
- strategy execution through API-linked automation
- bot-controlled side and allocation updates

## Operational model

The standard workflow is:

1. Create or select a compatible vault.
2. Configure trader permissions for the execution wallet.
3. Set asset approvals required for strategy routes.
4. Apply strategy parameters through bot configuration.
5. Monitor positions, balances, and strategy state continuously.

## Risk and controls

- execution quality depends on liquidity and route conditions
- manager permissions should be restricted and audited
- gas-wallet balances must be maintained to avoid operational interruptions
- all contract interactions should be verified in the live interface before submission
