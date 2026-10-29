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
- **Leader rotation**: rank a basket by relative strength, buy short pullbacks in the current leaders with volatility-based targets and stops, and keep idle stablecoins earning lending yield

## Example: Agentic Leader Rotation (Base)

[Agentic Leader Rotation (ALEAD)](https://app.dhedge.org/pool/0x48b227d228d8eade9e2de04e0b21319874e9fc15)
rotates between cbBTC, WETH, AERO and MORPHO. Every few hours it ranks them by how far each
is stretched above its recent average, and only buys when one of the leaders dips into oversold.
Each position has a profit target, a stop and a maximum holding time, so the vault is in USDC most
of the time, and that USDC is supplied to Aave V3.

The rule was chosen to work across many assets and both bull and bear periods rather than to
maximise one backtest, and its costs were measured on the chain it trades. Past results do not
predict future returns.

## Operational architecture

- strategy side updates through API (`setBot` style control)
- vault composition checks and approval gates
- gas-wallet-based execution model for automation
- continuous agent-driven monitoring and execution decisions

## What users should understand

- performance can differ by market regime
- active automation improves consistency, not certainty
- performance depends on disciplined execution across market regimes
