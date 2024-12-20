# Python Scripts for Infinite Trading Protocol

This directory contains Python scripts used in the Infinite Trading Protocol project. Below is a brief description of each script and its functionality.

## Files

### 1. `defi.py`

This script contains various utility functions for dealing with DeFi operations on different networks. Key functionalities include:
- Converting between coin names and contract addresses.
- Fetching Uniswap fees for specific coin pairs.
- Fetching dHedge pool compositions.
- Checking transaction status on different networks.
- Fetching wallet balances.

### 2. `coinbase.py`

Author: etherpilled

Description:
This script fetches historical OHLCV (Open, High, Low, Close, Volume) candle data from the Coinbase API for a list of trading pairs. It includes:
- Granularity conversion (timeframe to seconds).
- Retry mechanism for handling rate limits, IP bans, or transient errors.
- Support for multiple trading pairs and timeframes.

How to Use:
1. Define the trading pairs, timeframes, and number of candles in the `main()` function.
2. Call the `get_candles_with_retry` function to fetch data for each trading pair.
3. Use the returned data for analysis, modeling, or storage.
4. Adjust the retry parameters in `get_candles_with_retry` if needed.

### 3. `itp_incentives_dexscreener.py`

Author: etherpilled

Description:
This script fetches price, price change, and liquidity data from DexScreener for various liquidity pairs (LPs) and calculates the total amount of ITP incentives for each pool in the current epoch. Key functionalities include:
- Fetching data for specific LPs on the Optimism network.
- Calculating total USD liquidity and weighted average price for ITP.
- Calculating and displaying incentives for each pool.

## Dependencies

- `requests`: Install it via `pip install requests`
- `pandas`: Install it via `pip install pandas`
- `numpy`: Install it via `pip install numpy`

## How to Run

To run any of these scripts, you need to have Python installed on your system. Navigate to the directory containing the script and use the following command:

```sh
python <script_name>.py
