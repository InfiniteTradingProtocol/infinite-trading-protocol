# Infinite Trading Protocol - Source Code

This repository contains various scripts and functions implemented in different programming languages to support the Infinite Trading Protocol. Below is a detailed description of the contents and functionalities of each script within the `/src` directory.

## Contents

### `/src/R/`

- `README.md`: Detailed descriptions of the R scripts available in this folder.
- `dhedge_graphql.R`: Interacts with the dHedge GraphQL API to fetch fund compositions and monitor vault deposits; sends alerts to Discord.
- `ds_price.R`: Fetches price, price change, and liquidity data from DexScreener for various pairs.
- `itp_incentives_dexscreener.R`: Fetches price, price change, and liquidity data from DexScreener for ITP pairs and calculates total incentives for each pool.
- `staking_yield.R`: Generates a Staking Yield Per Epoch chart; calculates compound yield over several epochs.
- `technical_indicators.R`: Placeholder for technical indicators (currently empty).
- `tradfi_correlations.R`: Retrieves financial data from traditional finance indices and calculates their correlations.
- **Subfolder `/api/`**:
  - `adapter.R`: Adapter script for API interactions.

### `/src/Typescript/`

- `README.md`: Placeholder README indicating the presence of TypeScript functions.

### `/src/python/`

- `README.md`: Detailed descriptions of the Python scripts available in this folder.
- `coinbase.py`: Fetches historical OHLCV candle data from the Coinbase API for various trading pairs.
- `defi.py`: Contains utility functions for DeFi operations across different networks, including fetching Uniswap fees, dHedge pool compositions, transaction status, and wallet balances.
- `itp_incentives_dexscreener.py`: Fetches LP data from DexScreener and calculates total ITP incentives for each pool.
- **Subfolder `/api/`**:
  - `adapter.py`: Adapter script for API interactions.

## Usage

### R Scripts

To use the R scripts, make sure you have the required packages installed in your R environment. You can install them using the following command:

```R
install.packages(c("tidyr", "ggplot2", "dplyr", "httr", "jsonlite", "PerformanceAnalytics", "quantmod", "xts"))
```

### Python Scripts

To use the Python scripts, ensure you have Python installed on your system along with the necessary dependencies. You can install the dependencies using the following commands:

```sh
pip install requests pandas numpy
```

Run any of the Python scripts using the following command:

```sh
python <script_name>.py
```

---
