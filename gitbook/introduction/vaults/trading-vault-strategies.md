# Agentic Managed Vaults (Infinite Trading Cloud)

These vaults are connected to Infinite Trading Cloud strategy infrastructure and API-managed execution, with automated controllers managing risk posture and vault state transitions.

## What makes them different

- strategy signal generation and updates from cloud workflows
- operational control via authenticated API actions
- deployable across multiple supported EVM networks
- automated risk-management loops that shift side/exposure based on strategy state

## Strategy styles

- **Trend-following rotations**: switch between risk-on and defensive states
- **Neutral/cash states**: preserve optionality during weak conditions
- **Pair-specific automation**: asset-focused strategy execution with bounded trade parameters
- **Yield overlays**: lend/compound integrations where enabled

## Operational architecture

- strategy side updates through API (`setBot` style control)
- vault composition checks and approval gates
- gas-wallet-based execution model for automation
- continuous agent-driven monitoring and execution decisions

## What users should understand

- performance can differ by market regime
- active automation improves consistency, not certainty
- performance depends on disciplined execution across market regimes
