"""\
Author: etherpilled
Organization: Infinite Trading
Year: 2025

"""

import requests
import time

def setSides(
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
    platform="uniswapV3",
    retries=10,
    retry_delay=30,
    timeout=10
):
    """
    Executes a GET request to the Infinite Trading API with specified parameters.

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
        retries (int): Number of retry attempts in case of timeout or no response. Defaults to 10.
        retry_delay (int): Delay between retry attempts in seconds. Defaults to 30.
        timeout (int): Timeout for the API request in seconds. Defaults to 10.

    Returns:
        dict: A dictionary containing the API response in JSON format if successful.

    Raises:
        ValueError: Raised if the 'side' parameter is invalid.
        HTTPError: Raised if the API response status code is not 200 (OK).
    """
    
    side_mapping = {
        "long": "long",
        "cash": "neutral",
        "short": "short"
    }
    
    if side not in side_mapping:
        raise ValueError("Invalid side value. Must be 'long', 'cash', or 'short'.")
    side_api = side_mapping[side]
    
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
    
    endpoint = "https://api.infinitetrading.io/setBot"
    
    for attempt in range(retries):
        try:
            response = requests.get(endpoint, params=params, timeout=timeout)
            response.raise_for_status()  # Raise an HTTPError for bad responses
            if response.status_code == 200:
                print("Trade executed successfully")
                return response.json()
        except requests.exceptions.Timeout:
            print("Request timed out. Retrying...")
        except requests.exceptions.HTTPError as err:
            if response.status_code == 504:
                print("Gateway Timeout. Retrying...")
            else:
                print(f"HTTP error occurred: {err}")
                return {"error": response.status_code, "message": response.text}
        except requests.exceptions.RequestException as err:
            print(f"Request error occurred: {err}")
        time.sleep(retry_delay)
    
    print("Failed to change sides after multiple attempts.")
    return {"error": "timeout", "message": "Failed to change sides after multiple attempts."}

# Example usage
response = setSides(pair="WBTC-USDC", side="long")
print(response)
