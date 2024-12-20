"""
Executes a GET request to the Infinite Trading API with specified parameters.

Author: etherpilled
Organization: Infinite Trading
Year: 2024

Parameters:
    api_key (str): The API key required for authentication. Defaults to an initial key you must replace.
    protocol (str): Identifier for the trading protocol, e.g., 'dhedge'. Defaults to 'dhedge'.
    pool (str): The specific pool address to interact with. Must be specified by the user.
    network (str): The blockchain network to use, e.g., 'polygon', 'optimism', 'base', 'arbitrum'. Defaults to 'polygon'.
    pair (str): The trading pair to target, such as 'WBTC-USDC'. Must be specified by the user.
    side (str): Desired trading position ('long', 'cash', or 'short'). Must be specified by the user.
    threshold (float): Percentage threshold to trigger a trade to avoid excessive small trades. Defaults to 1.
    max_usd (float): Maximum USD amount for the trade. Defaults to 500.
    slippage (float): Maximum allowed slippage percentage. Defaults to 1.
    share (float): Percentage of the total trade amount. Defaults to 100.
    platform (str): The trading platform to use, e.g., 'uniswapV3'. Defaults to 'uniswapV3'.

Returns:
    dict: A dictionary containing the API response in JSON format.

Raises:
    ValueError: Raised if the 'side' parameter is invalid.
    HTTPError: Raised if the API response status code is not 200 (OK).
"""

import requests

def trade(
    api_key="ADD YOUR API KEY HERE",
    protocol="dhedge",
    pool="ADD YOUR POOL ADDRESS HERE",
    network="polygon",
    pair,
    side,
    threshold=1,
    max_usd=500,
    slippage=1,
    share=100,
    platform="uniswapV3"
):
    # Maps user-friendly side terms to API-compatible keys
    side_mapping = {
        "long": "long",
        "cash": "neutral",
        "short": "short"
    }
    
    # Validates and converts 'side' to an API-compatible key
    if side not in side_mapping:
        raise ValueError("Invalid side value. Must be 'long', 'cash', or 'short'.")
    side_api = side_mapping[side]
    
    # Constructs the query parameters for the API request
    params = {
        "apiKey": api_key,
        "protocol": protocol,
        "pool": pool,
        "network": network,
        "pair": pair,
        "side": side_api,
        "threshold": threshold,
        "max_usd": max_usd,
        "slippage": slippage,
        "share": share,
        "platform": platform
    }
    
    # API endpoint URL
    endpoint = "https://api.infinitetrading.io/setBot"
    
    # Performs the GET request with constructed parameters
    response = requests.get(endpoint, params=params)
    
    # Validates the response status
    if response.status_code != 200:
        response.raise_for_status()
    
    return response.json()

# Example usage

# To buy WBTC
response = trade(pair="WBTC-USDC", side="long")
print(response)

response = infinite_trading(side="long")
# To short WBTC: 
response = infinite_trading(side="short")

# To go in cash (USDC)
response = infinite_trading(side="cash")

print(response)
