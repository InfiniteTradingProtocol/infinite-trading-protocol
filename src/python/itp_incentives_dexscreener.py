#####################################################
## DexScreener Price Change and Liquidity Fetcher
## Author: etherpilled
## Project: Infinite Trading Protocol
## Description: This code fetches all the main 
## DexScreener LPs and returns the total amount 
## of ITP incentives for each pool in the current epoch.
#####################################################

import requests
import json

# Function to fetch price, price change, and liquidity data from DexScreener
def ds_price(pair, network, exchange, native=False, pricechange=False, liquidity=False):
    
    # Define base URL for DexScreener API.
    base_url = "https://api.dexscreener.com/latest/dex/pairs/"
    
    # Set endpoint based on network and pair
    endpoint = ""
    if network == "optimism":
        endpoint = "optimism/"
    elif network == "polygon":
        endpoint = "polygon/"
    else:
        raise ValueError("Unsupported network")
    
    # Define contract address based on pair and exchange
    pair_contract = {
        "ITP-USDC": "0xb84c932059a49e82c2c1bb96e29d59ec921998be",
        "ITP-wstETH": "0xdad7b4c48b5b0be1159c674226be19038814ebf6",
        "ITP-WBTC": "0x93e40c357c4dc57b5d2b9198a94da2bd1c2e89ca",
        "ITP-DHT": "0x3d5cbc66c366a51975918a132b1809c34d5c6fa2",
        "ITP-xOpenX": "0x44fb5dc428c65576d5fce5298cf1c77ea28cf2dc",
        "ITP-VELO": "0xc04754f8027abbfe9eea492c9cc78b66946a07d1",
        "ITP-OP": "0x79f1af622fe2c636a2d946f03a62d1dfc8ca6de4",
    }.get(pair)
    
    if pair_contract is None:
        raise ValueError("Unsupported pair")
    
    # Construct the full URL for the API request
    url = f"{base_url}{endpoint}{pair_contract}"
    print(f"Querying: {url}")
    
    response = requests.get(url)
    
    # Check if the response is successful
    if response.status_code == 200:
        data = response.json()
        
        # Handle price change data
        if pricechange:
            price_change = list(map(float, data["pair"]["priceChange"]))
            if not native:
                price_change.append(float(data["pair"]["priceUsd"]))
            else:
                price_change.append(data["pair"]["priceNative"])
            return price_change
        
        # Handle liquidity data
        if liquidity:
            liquidity_data = data["pair"]["liquidity"]
            liquidity_data["price"] = float(data["pair"]["priceUsd"])
            return liquidity_data
        
        # Return price in USD or native token
        if not native:
            return float(data["pair"]["priceUsd"])
        else:
            return data["pair"]["priceNative"]
    
    else:
        print(f"Error: {response.status_code}")
        return None

#####################################################
# Main script to calculate liquidity and ITP incentives
#####################################################

# List of Liquidity Pairs (LPs)
lps = ["ITP-USDC", "ITP-wstETH", "ITP-WBTC", "ITP-DHT", "ITP-xOpenX", "ITP-VELO", "ITP-OP"]
usd_liquidity = []
prices = []

# Fetch data for each LP
for lp in lps:
    liquidity_data = ds_price(pair=lp, network="optimism", exchange="velodromeV2", liquidity=True)
    usd_liquidity.append(liquidity_data["usd"] / 2)
    prices.append(liquidity_data["price"])
    print(f"LP: {lp}, Liquidity: {usd_liquidity[-1]}")

# Calculate total USD liquidity
total_usd_liquidity = sum(usd_liquidity)
print(f"Total USD Liquidity (excluding ITP value): {total_usd_liquidity}")

# Calculate weighted average price for ITP
weighted_price = sum([p * (liq / total_usd_liquidity) for p, liq in zip(prices, usd_liquidity)])
print(f"Weighted ITP Price: {weighted_price}")

# Set percentage of liquidity for incentives
percentage = 0.02

# Calculate total ITP incentives
total_incentives = (total_usd_liquidity * percentage) / weighted_price
print(f"Total Weekly ITP Incentives: {total_incentives} ITP")

# Calculate and display incentives for each pool
print("Incentives for each pool this epoch:")
for lp, liquidity in zip(lps, usd_liquidity):
    pool_incentives = total_incentives * (liquidity / total_usd_liquidity)
    print(f"{lp} : {pool_incentives} ITP")
