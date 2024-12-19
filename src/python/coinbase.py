"""
Author: etherpilled
Copyright (c) Infinite Trading Protocol

Licensed under the MIT License. You may use, distribute, and modify this code under the terms of the MIT license.

Description:
This script fetches historical OHLCV (Open, High, Low, Close, Volume) candle data from the Coinbase API for a list of trading pairs.
It includes:
- Granularity conversion (timeframe to seconds).
- Retry mechanism for handling rate limits, IP bans, or transient errors.
- Support for multiple trading pairs and timeframes.

How to Use:
1. Define the trading pairs, timeframes, and number of candles in the `main()` function.
2. Call the `get_candles_with_retry` function to fetch data for each trading pair.
3. Use the returned data for analysis, modeling, or storage.
4. Adjust the retry parameters in `get_candles_with_retry` if needed.

Dependencies:
- requests: Install it via `pip install requests`

"""

import datetime
import time
import requests
from datetime import datetime

# Mapping timeframes to their equivalent durations in seconds
timeframe_to_seconds = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '6h': 21600,
    '1d': 86400,
    '1w': 604800
}

def get_candles(exchange, pair, numcandles, timeframe):
    """
    Fetches historical OHLCV candles for a specific trading pair and timeframe from Coinbase.

    Args:
        exchange (str): The name of the exchange (not actively used in this function, for extensibility).
        pair (str): The trading pair in the format "BASE-QUOTE" (e.g., "BTC-USD").
        numcandles (int): The number of candles to retrieve.
        timeframe (str): The timeframe for the candles (e.g., '1h', '1d').

    Returns:
        list: A list of OHLCV candles or None if an error occurs.
    """
    product_id = pair.replace("_", "-")  # Convert pair format, e.g., BTC_USD to BTC-USD
    granularity = timeframe_to_seconds.get(timeframe)  # Convert timeframe to seconds

    if granularity is None:
        print(f"Error: Granularity for timeframe '{timeframe}' is not defined.")
        return None

    url = f"https://api.exchange.coinbase.com/products/{product_id}/candles"
    params = {
        'granularity': granularity
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an error for HTTP codes 4xx/5xx

        candles = response.json()
        # Return only the last `numcandles` if available
        return candles[:numcandles] if len(candles) > numcandles else candles

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - {response.text}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred: {req_err}")
    except ValueError as parse_err:
        print(f"Error parsing JSON: {parse_err}")
    except Exception as e:
        print(f"Unexpected error fetching candles: {e}")
    return None

def get_candles_with_retry(pair, numcandles, timeframe, exchange, retries=3, delay=1):
    """
    Attempts to fetch candle data with a retry mechanism for handling transient errors.

    Args:
        pair (str): The trading pair in the format "BASE-QUOTE".
        numcandles (int): The number of candles to retrieve.
        timeframe (str): The timeframe for the candles.
        exchange (str): The name of the exchange (not actively used in this function, for extensibility).
        retries (int): Number of retry attempts.
        delay (int): Delay (in seconds) between retries.

    Returns:
        list: A list of OHLCV candles or None if all attempts fail.
    """
    attempt = 0
    while attempt < retries:
        try:
            candles = get_candles(exchange, pair, numcandles, timeframe)
            if candles is not None:
                return candles
        except Exception as e:
            error_message = str(e).lower()
            print(f"Error fetching candles: {e}")
            # Check if the error message indicates an IP ban
            if "ban" in error_message or "403" in error_message or "rate limit" in error_message:
                print("It looks like your IP might be banned or rate-limited.")
                break  # Exit the loop if the IP is banned
        attempt += 1
        print(f"Retrying... ({attempt}/{retries})")
        time.sleep(delay)
    return None

def main():
    """
    Main function to fetch candle data for multiple trading pairs and timeframes.
    """
    # List of trading pairs and their corresponding timeframes
    pairs = ['BTC-USD', 'ETH-USD', 'POL-USD', 'ARB-USD', 'VELO-USD', 'AERO-USD', 'LINK-USD', 'SOL-USD']
    timeframes = ['1h'] * len(pairs)  # All pairs use the 1-hour timeframe
    exchange = 'coinbase'
    numcandles = 300

    for pair, timeframe in zip(pairs, timeframes):
        # Fetch candles with retry mechanism
        candles = get_candles_with_retry(pair=pair, numcandles=numcandles, timeframe=timeframe, exchange=exchange)

        # TODO: Process candles with your model here
        if candles:
            print(f"Fetched {len(candles)} candles for {pair}.")

        time.sleep(0.5)  # Wait 0.5 seconds between requests to avoid rate limits

if __name__ == "__main__":
    main()
