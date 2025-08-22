# Infinite Trading Protocol - R Scripts

This folder contains various R scripts used in the Infinite Trading Protocol project. Below is a brief description of each script and its functionality.

WE ARE MIGRATING AND IMPROVING THE R-SDK HERE: https://github.com/InfiniteTradingProtocol/Infinite-Trading-R-SDK-v1/tree/main

THIS IS OUTDATED.

## Files

### staking_yield.R

This script generates a Staking Yield Per Epoch chart. It calculates the compound yield over several epochs and visualizes the results using `ggplot2`.

- **Libraries Used**: `tidyr`, `ggplot2`, `dplyr`
- **Key Functions**:
  - Data setup for initial yield values
  - Loop to decrement yield values over epochs
  - Data frame creation and transformation
  - Plotting the yield data

### dhedge_graphql.R

This script interacts with the dHedge GraphQL API to fetch fund compositions and monitor vault deposits. It sends alerts to a Discord channel when certain deposit thresholds are met.

- **Libraries Used**: `httr`, `jsonlite`
- **Key Functions**:
  - `dhedge_graphql(query, name)`: Fetches fund compositions from the dHedge API.
  - `coin_amount(pool, coins)`: Calculates the amount of specified coins in a pool.
  - Monitoring loop that sends alerts to Discord based on deposit thresholds.

### tradfi_correlations.R

This script retrieves financial data from various traditional finance indices and calculates their correlations. It also formats the data for analysis and visualization.

- **Libraries Used**: `PerformanceAnalytics`, `quantmod`, `xts`
- **Key Functions**:
  - `format_xts_ohlc(OHLC)`: Formats OHLC data.
  - Data retrieval using `getSymbols` for multiple indices.
  - Calculation of returns and correlation analysis.

### integrations/googlechat.R

This script provides a function to send messages to Google Chat spaces using webhooks.

- **Libraries Used**: `httr`
- **Key Functions**:
  - `chat(space, message)`: Sends a message to a specified Google Chat space.

### itp_incentives_dexscreener.R

This script fetches price, price change, and liquidity data from DexScreener for various ITP pairs. It calculates the total ITP incentives for each pool in the current epoch.

- **Libraries Used**: `httr`, `jsonlite`
- **Key Functions**:
  - `ds_price(pair, network, exchange, native, pricechange, liquidity)`: Fetches data from DexScreener.
  - `incentives(network, exchange, liquidity_percentage, lps)`: Calculates liquidity and ITP incentives.

## Usage

To use these scripts, ensure that the required packages are installed in your R environment. You can install them using the following commands:

```R
install.packages(c("tidyr", "ggplot2", "dplyr", "httr", "jsonlite", "PerformanceAnalytics", "quantmod", "xts"))
