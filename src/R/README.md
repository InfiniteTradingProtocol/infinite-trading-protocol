# R examples

Standalone R scripts for the Infinite Trading API and public market data. The
maintained R client is the
[Infinite Trading R SDK](https://github.com/InfiniteTradingProtocol/Infinite-Trading-R-SDK-v1).

| File | Purpose |
|---|---|
| [`api/adapter.R`](api/adapter.R) | `setSides()`: set a vault bot's side through the Infinite Trading API (`/setBot`), with retries |
| [`coinbase.R`](coinbase.R) | `get_candles()` / `get_candles_with_retry()`: OHLCV candles from the Coinbase Exchange public API (1m to 1w) |
| [`dHEDGE/dHEDGE_GraphQL.R`](dHEDGE/dHEDGE_GraphQL.R) | dHEDGE GraphQL helpers: pool trader, funds by trader, pool token price history |
| [`dexscreener/itp_incentives.R`](dexscreener/itp_incentives.R) | `ds_price()`: DexScreener price, change and liquidity; ITP incentives per pool for the current epoch |
| [`dexscreener/price_monitoring.R`](dexscreener/price_monitoring.R) | Price-threshold alerts for Optimism pairs, posted to Discord |
| [`integrations/discord.R`](integrations/discord.R), [`integrations/googlechat.R`](integrations/googlechat.R) | Webhook senders used by the monitoring scripts |
| [`utils/correlation_analysis.R`](utils/correlation_analysis.R) | Monthly-return correlation matrix across global indices, commodities and futures (Yahoo Finance) |
| [`utils/staking_yield.R`](utils/staking_yield.R) | Staking yield per epoch chart with compounding |

## Setup

```r
install.packages(c("httr", "jsonlite", "dplyr", "tidyr", "ggplot2",
                   "lubridate", "quantmod", "xts", "PerformanceAnalytics"))
```

Webhook URLs and API keys are passed in by the caller; never commit them.
