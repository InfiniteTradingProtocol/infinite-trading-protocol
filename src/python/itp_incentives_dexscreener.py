import requests
import json

def ds_price(pair, network, exchange, native=False, pricechange=False, liquidity=False):
    url = "https://api.dexscreener.com/latest/dex/pairs/"
    ep = ""
    c = ""

    if network == "optimism":
        ep = "optimism/"
    elif network == "polygon":
        ep = "polygon/"

    if exchange == "velodromeV2":
        pairs = {
            "ITP-USDC": "0xb84c932059a49e82c2c1bb96e29d59ec921998be",
            "ITP-wstETH": "0xdad7b4c48b5b0be1159c674226be19038814ebf6",
            "ITP-WBTC": "0x93e40c357c4dc57b5d2b9198a94da2bd1c2e89ca",
            "ITP-DHT": "0x3d5cbc66c366a51975918a132b1809c34d5c6fa2",
            "ITP-xOpenX": "0x44fb5dc428c65576d5fce5298cf1c77ea28cf2dc",
            "ITP-VELO": "0xc04754f8027abbfe9eea492c9cc78b66946a07d1",
            "ITP-OP": "0x79f1af622fe2c636a2d946f03a62d1dfc8ca6de4",
            "alETH-WETH": "0xa1055762336f92b4b8d2edc032a0ce45ead6280a",
            "opxVELO-VELO": "0xa80ad5c1f8c21b34b427ea432530ae7ff36e3926",
            "frxETH-WETH": "0x3f42dc59dc4df5cd607163bc620168f7ff7ab970",
            "alUSD-USDC": "0x4d7959d17b9710be87e3657e69d946914221bb88",
            "sUSD-USDC": "0x252cbdff917169775be2b552ec9f6781af95e7f6",
            "MTA-USDC": "0x8453cc52f2108ff9d1636b6a108db06ac137b72f",
            "LUSD-USDC": "0xf04458f7b21265b80fc340de7ee598e24485c5bb",
            "WLD-ITP": "0x1d543e0f4e77ae517cef496f3e25938a218c49c9",
            "ITP-opxVELO": "0xb0f97aef89a6d7fba969c0067de1a54cde4b2f8f"
        }
        c = pairs.get(pair, "")
        ep += c

    elif exchange == "uniswapV3" and pair == "stMATIC-MaticX" and network == "polygon":
        ep += "0xc63123aec88f6965d2792e96f9e8a3324dbbc6b0"

    url += ep
    print(f"Querying: {url}")
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Print the entire JSON response for debugging purposes
        print("API Response:")
        print(json.dumps(data, indent=2))

        # Handle the case where "pair" or "pairs" is None
        if data.get("pair") is None and data.get("pairs") is None:
            print(f"No data available for {pair} on {exchange}. Skipping...")
            return None

        # Handle the case where "pairs" is a list
        if isinstance(data.get("pairs"), list):
            pair_data = data["pairs"][0]  # Assuming you want the first item
        else:
            pair_data = data.get("pair", {})

        if pair_data is None:
            print(f"No pair data available for {pair}. Skipping...")
            return None

        if pricechange:
            price_changes = pair_data["priceChange"]
            price_changes = [float(pc) for pc in price_changes[:4]]
            price = pair_data["priceUsd"] if not native else pair_data["priceNative"]
            price_changes.append(float(price))
            return price_changes

        if liquidity:
            if "liquidity" in pair_data and "priceUsd" in pair_data:
                pair_data["liquidity"]["price"] = float(pair_data["priceUsd"])
                return pair_data["liquidity"]
            else:
                print(f"Liquidity data is unavailable for {pair}.")
                return None

        return float(pair_data.get("priceUsd", 0)) if not native else pair_data.get("priceNative", 0)

    else:
        print(f"Error: {response.reason}")
        return None


# Main logic to query multiple pairs and calculate liquidity and price
lps = ["ITP-USDC", "ITP-wstETH", "ITP-WBTC", "ITP-DHT", "ITP-xOpenX", "ITP-VELO", "ITP-OP", "WLD-ITP", "ITP-opxVELO"]

usd_liquidity = []
prices = []
incentives = {}

print("Starting to query liquidity pools...")

for lp in lps:
    liquidity = ds_price(pair=lp, network="optimism", exchange="velodromeV2", liquidity=True)
    if liquidity:
        usd_liquidity.append(liquidity['usd'] / 2)
        prices.append(liquidity['price'])
        print(f"Liquidity for {lp}: {usd_liquidity[-1]}")
    else:
        print(f"Failed to get liquidity for {lp}")

if usd_liquidity:
    print("Total USD liquidity (not counting ITP value):")
    L = sum(usd_liquidity)
    print(f"Total USD liquidity: {L}")

    P = sum(p * (liq / L) for p, liq in zip(prices, usd_liquidity))
    print(f"Weighted ITP price: {P}")

    I = (L * 0.15) / P
    print(f"Total Weekly ITP Incentives: {I} ITP")

    print("Incentives for each pool:")
    for lp, liq in zip(lps, usd_liquidity):
        incentive = I * (liq / L)
        incentives[lp] = incentive
        print(f"{lp}: {incentive} ITP")

    # Print a summary of the incentives
    print("\nSummary of Incentives:")
    for lp, incentive in incentives.items():
        print(f"{lp}: {incentive:.2f} ITP")
else:
    print("No liquidity data available.")