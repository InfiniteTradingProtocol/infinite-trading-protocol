coins_list = [
        {"coin": "ULP", "contract": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", "network":"polygon","pair":"ULP-USD"},
        {"coin": "MaticX", "contract": "0xfa68fb4628dff1028cfec22b4162fccd0d45efb6", "network":"polygon","pair":"MaticX-USD"},
        {"coin": "USDC", "contract": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "network": "polygon","pair":"USD-USD"},
        {"coin": "WETH", "contract": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "network": "polygon","pair":"ETH-USD"},
        {"coin": "WMATIC", "contract": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", "network": "polygon","pair":"MATIC-USD"},
        {"coin": "WBTC", "contract": "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", "network": "polygon","pair":"BTC-USD"},
        {"coin": "ETHBEAR1X", "contract": "0x79d2aefe6a21b26b024d9341a51f6b7897852499", "network": "polygon","pair":"ETHBEAR1X-USD"},
        {"coin": "MATICBEAR1X", "contract": "0x8987ca55e635d0d3ba9469ee31e9b8a7d447e9cc", "network": "polygon","pair":"MATICBEAR1X-USD"},
        {"coin": "BTCBEAR1X", "contract": "0x86c3dd18baf4370495d9228b58fd959771285c55", "network": "polygon","pair":"BTCBEAR1X-USD"},
        {"coin": "LINK", "contract": "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", "network": "polygon","pair":"LINK-USD"},
        {"coin": "SOL", "contract": "0x7dff46370e9ea5f0bad3c4e29711ad50062ea7a4", "network": "polygon","pair":"SOL-USD"},
        {"coin": "AAVE", "contract": "0xd6df932a45c0f255f85145f286ea0b292b21c90b", "network": "polygon","pair":"AAVE-USD"},
        {"coin": "DUSD", "contract": "0xbae28251b2a4e621aa7e20538c06dee010bc06de", "network": "polygon","pair":"DUSD-USD"},
        {"coin": "USDmny", "contract": "0xc4c6333afdd510066786e0d257eb91095fd729e3", "network": "polygon","pair":"USDmny-USD"},
        {"coin": "stMATIC", "contract": "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4", "network": "polygon","pair":"stMATIC-USD"},
        {"coin": "ETHBEAR2X", "contract": "0x027da30fadab6202801f97be344e2348a2a92842", "network": "polygon","pair":"ETHBEAR2X-USD"},
        {"coin": "BTCBEAR2X", "contract": "0x3dbce2c8303609c17aa23b69ebe83c2f5c510ada", "network": "polygon","pair":"BTCBEAR2X-USD"},
        {"coin": "ETHBULL3X", "contract": "0x460b60565cb73845d56564384ab84bf84c13e47d", "network": "polygon","pair":"ETHBULL3X-USD"},
        {"coin": "BTCBULL3X", "contract": "0xdb88ab5b485b38edbeef866314f9e49d095bce39", "network": "polygon","pair":"BTCBULL3X-USD"},
        {"coin": "MATICBULL2X", "contract": "0x7dab035a8a65f7d33f1628a450c6780323d3c5e1", "network": "polygon","pair":"MATICBULL2X-USD"},
        {"coin": "BLPstMATICWMATIC", "contract": "0x8159462d255c1d24915cb51ec361f700174cd994", "network": "polygon","pair":"BLPstMATICWMATIC-USD"},
        {"coin": "CRV", "contract": "0x172370d5cd63279efa6d502dab29171933a610af", "network": "polygon","pair":"CRV-USD"},
        {"coin": "GRT", "contract": "0x5fe2b58c013d7601147dcdd68c143a77499f5531", "network": "polygon","pair":"GRT-USD"},
        {"coin": "DHT", "contract": "0x8c92e38eca8210f4fcbf17f0951b198dd7668292", "network": "polygon","pair":"DHT-USD"},
        {"coin": "SNX", "contract": "0x50b728d8d964fd00c2d0aad81718b71311fef68a", "network": "polygon","pair":"SNX-USD"},
        {"coin": "PAXG", "contract": "0x553d3d295e0f695b9228246232edf400ed3560b5", "network": "polygon","pair":"PAXG-USD"},
        {"coin": "OP", "contract": "0x4200000000000000000000000000000000000042", "network": "optimism","pair":"OP-USD"},
        {"coin": "USDC", "contract": "0x7f5c764cbc14f9669b88837ca1490cca17c31607", "network": "optimism","pair":"USD-USD"},
        {"coin": "DHT", "contract": "0xaf9fe3b5ccdae78188b1f8b9a49da7ae9510f151", "network": "optimism","pair":"DHT-USD"},
        {"coin": "WETH", "contract": "0x4200000000000000000000000000000000000006", "network": "optimism","pair":"ETH-USD"},
        {"coin": "wstETH", "contract": "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb", "network": "optimism","pair":"wstETH-USD"},
        {"coin": "ETHy", "contract": "0xb2cfb909e8657c0ec44d3dd898c1053b87804755", "network": "optimism","pair":"ETHy-USD"},
        {"coin": "VELO", "contract": "0x3c8b650257cfb5f272f799f5e2b4e65093a11a05", "network": "optimism","pair":"VELO-USD"},
        {"coin": "LYRA", "contract": "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", "network": "optimism","pair":"LYRA-USD"},
        {"coin": "KWENTA", "contract": "0x920cf626a271321c151d027030d5d08af699456b", "network": "optimism","pair":"KWENTA-USD"},
        {"coin": "rETH", "contract": "0x9bcef72be871e61ed4fbbc7630889bee758eb81d", "network": "optimism","pair":"rETH-USD"},
        {"coin": "STG", "contract": "0x296f55f8fb28e498b858d0bcda06d955b2cb3f97", "network": "optimism","pair":"STG-USD"},
        {"coin": "USDmny", "contract": "0x49bf093277bf4dde49c48c6aa55a3bda3eedef68", "network": "optimism","pair":"USDmny-USD"},
        {"coin": "SNX", "contract": "0x8700daec35af8ff88c16bdf0418774cb3d7599b4", "network": "optimism","pair":"SNX-USD"},
        {"coin": "LINK", "contract": "0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6", "network": "optimism","pair":"LINK-USD"},
        {"coin": "WBTC", "contract": "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "network": "arbitrum","pair":"BTC-USD"},
        {"coin": "WETH", "contract": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "network": "arbitrum","pair":"ETH-USD"},
        {"coin": "USDC", "contract": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", "network": "arbitrum","pair":"USDC-USD"},
        {"coin": "USDT", "contract": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "network": "arbitrum","pair":"USDT-USD"}
] 

def decimals(coin):
    decimals = 18
    if coin == "WBTC":
        decimals = 8
    elif coin == "USDC":
        decimals = 6
    return decimals
  
def coin_to_contract(coin, network):
    for item in coins_list:
        if item['coin'].lower() == coin.lower() and item['network'].lower() == network.lower():
            return item['contract'].lower()
    return None

def contract_to_coin(contract,network):
    for item in coins_list:
        if item['contract'].lower() == contract.lower() and item['network'].lower() == network.lower():
                return item['coin']
        return None

def coin_from_contract(contract,network):
    for item in coins_list:
        if item['contract'].lower() == contract.lower() and item['network'].lower() == network.lower():
            return item['coin']

def pair_from_contract(contract,network):
    for item in coins_list:
        if item['contract'].lower() == contract.lower() and item['network'].lower() == network.lower():
            return item['pair']
          
def uniswap_fees(coin1, coin2, network):
    fee = 500
    usdc = False
    if coin1 == "USDC" or coin2 == "USDC":
        usdc = True
    if network == "optimism":
        if usdc and (coin1 == "SNX" or coin2 == "SNX"):
            fee = 3000
        elif usdc and (coin1 == "OP" or coin2 == "OP"):
            fee = 3000
    if network == "polygon":
        if usdc and (coin1 == "stMATIC" or coin2 == "stMATIC"):
            fee = 3000
    return fee

def dhedgeComposition(pool,network):
    url = f"http://localhost:8000/poolComposition?network={network}&pool={pool}"
    response = requests.get(url)
    content = response.text
    result = json.loads(content)
    poolBalances = result["msg"]

    df = pd.json_normalize(poolBalances)
    # Replace the nested columns to only show the hex value

    df['balance'] = df['balance.hex']
    df['rate'] = df['rate.hex']
    df = df.drop(['balance.type', 'balance.hex', 'rate.type', 'rate.hex'], axis=1)

    # Convert hex values to decimal
    df['balance'] = df['balance'].apply(lambda x: float(int(x, 16)))
    df['rate'] = df['rate'].apply(lambda x: float(int(x, 16)))

    # Assuming 'network' is defined elsewhere in your code
    df['symbol'] = df['asset'].apply(lambda x: coin_from_contract(x.lower(), network))
    df['assetPair'] = df['asset'].apply(lambda x: pair_from_contract(x.lower(),network))
    # Apply the 'decimals' function
    df['amount'] = df.apply(lambda row: row['balance'] / (10 ** decimals(row['asset'])), axis=1)
    df['price'] = df['rate'] / (10 ** 18)
    df = df.drop(['balance','rate'], axis=1)
    return df
