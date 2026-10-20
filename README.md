<p align="center">
  <img src="https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/logos/ITP.png" alt="Infinite Trading Protocol Diagram"/>
</p>


---

# Infinite Trading Protocol 

Welcome to the official code repository for Infinite Trading Protocol. The protocol offers a comprehensive suite of tools designed for advanced financial analysis, data integration, trading bots, and more.

---

## Introduction

The Infinite Trading Protocol API is designed to provide developers with the tools necessary for creating advanced trading strategies and integrating blockchain technology into their financial applications.

## Features

- **Advanced Financial Analysis**: Utilize our tools for comprehensive financial data analysis and insights.
- **Data Integration**: Seamlessly integrate financial data from various sources.
- **Trading Bots**: Develop, test, and deploy sophisticated trading bots to automate your trading strategies.
- **Blockchain Integration**: Leverage blockchain technology to enhance transparency and security in financial transactions.

## Code Structure

### `/src` Directory

The `/src` directory contains various scripts and functions implemented in different programming languages to support the Infinite Trading Protocol. Below is a detailed description of the contents and functionalities of each script within the `/src` directory.

---

#### `/src/R/`

- **`dhedge_graphql.R`**: Interacts with the dHedge GraphQL API to fetch fund compositions and monitor vault deposits; sends alerts to Discord.
- **`ds_price.R`**: Fetches price, price change, and liquidity data from DexScreener for various pairs.
- **`itp_incentives_dexscreener.R`**: Fetches price, price change, and liquidity data from DexScreener for ITP pairs and calculates total incentives for each pool.
- **`staking_yield.R`**: Generates a Staking Yield Per Epoch chart; calculates compound yield over several epochs.
- **`tradfi_correlations.R`**: Retrieves financial data from traditional finance indices and calculates their correlations.
- **Subfolder `/api/`**:
  - **`adapter.R`**: Adapter script for API interactions.

### `/src/Typescript/`

- **`api/adapter.ts`**: Adapter script for API interactions using TypeScript and Axios.

### `/src/python/`

- **`coinbase.py`**: Fetches historical OHLCV candle data from the Coinbase API for various trading pairs.
- **`defi.py`**: Contains utility functions for DeFi operations across different networks, including fetching Uniswap fees, dHedge pool compositions, transaction status, and wallet balances.
- **`itp_incentives_dexscreener.py`**: Fetches LP data from DexScreener and calculates total ITP incentives for each pool.
- **Subfolder `/api/`**:
  - **`adapter.py`**: Adapter script for API interactions using Python and Requests.

---

## Usage

### Protocol administration dashboard

The static [factory admin dashboard](dashboard/factory-admin/index.html) provides
vault, staking, treasury, deployment and Safe batch workflows. From
`dashboard/factory-admin`, run `python3 serve.py` and open the localhost URL it
prints. The server builds the contract artifacts needed by deployment tools;
Foundry and the contract dependencies must already be installed.

A companion POC frontend, [managed-vault-factory.html](dashboard/factory-admin/managed-vault-factory.html),
lets a deployer create a single-owner vault with DAO-controlled asset/route/executor
allowlists, a factory fee split and a multicall-friendly `executor`/`rewardRecipient`
trade flow. It is intentionally simple: the owner can deposit, withdraw, transfer
ownership and route strategy trades, while the factory enforces the base policy.

The dashboard uses the frontend's dark-violet palette, purple controls and
bundled Infinite Trading logo. Module navigation sits beside the workspace on
desktop and becomes a wrapping navigation grid on mobile. Each module retains
its own section navigation. Wallet signing, simulations and network-scoped Safe
batches are unchanged by the visual styling.

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

### TypeScript Scripts

To use the TypeScript scripts, ensure you have Node.js and npm installed on your system along with the necessary dependencies. You can install the dependencies using the following command:

```sh
npm install
```

Compile and run the TypeScript scripts using the following commands:

```sh
tsc <script_name>.ts
node <script_name>.js
```

---

## Contributing

We welcome contributions from the community. If you wish to contribute to the Infinite Trading Protocol API, please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the terms of the [MIT license](LICENSE).

---

## Contact

For support or any queries, please reach out to admin@infinitetrading.io, telegram: @infinitetradingprotocol, or X: @infinitetradepr.

## Copyright

Copyright (c) 2025 Infinite Trading. All rights reserved.

Unauthorized copying of this file, via any medium is strictly prohibited.
```
