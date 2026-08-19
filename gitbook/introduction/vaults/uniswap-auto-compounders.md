# Uniswap Auto-Compounders

Uniswap auto-compounder vaults convert concentrated liquidity management into a simpler vault-share experience.

## How they work (high level)

1. User deposits through dual-token or zap flow
2. Vault maintains LP position
3. Fees are harvested and reinvested
4. User shares represent proportional ownership

## Current ITP-aligned deployment examples

- ITP/USDC
- cbEGGS/WETH
- ITP/cbXRP

## Where the edge comes from (without secret sauce)

- disciplined fee harvesting cadence
- automated reinvestment logic
- slippage-aware execution paths
- strategy-level controls around pool selection and maintenance

## Why users like this model

- no need to manually harvest/rebalance LP positions
- compounding can improve long-term efficiency
- easier access to sophisticated LP behavior in a single product
