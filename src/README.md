# Integration examples

Small, self-contained scripts showing how to use the
[Infinite Trading API](https://api.infinitetrading.io) and public on-chain and
market data from R, Python and TypeScript. They are examples, not production
services: keys and webhooks are always supplied by the caller.

| Folder | Highlights |
|---|---|
| [`R/`](R/README.md) | API adapter, Coinbase candles, dHEDGE GraphQL, DexScreener incentives and alerts, correlation analysis |
| [`python/`](python/README.md) | API adapter, Coinbase candles, DeFi helpers, ITP incentives, gas-balance monitor |
| [`Typescript/`](Typescript/README.md) | API adapter, Safe upgrade proposal, Velodrome managed veNFT inspector |

Every language ships the same API adapter (`api/adapter.*`), which calls
`POST /setBot` to set a vault bot's side with retries. API keys and endpoints are
described in the [API documentation](../gitbook/introduction/api/README.md).
