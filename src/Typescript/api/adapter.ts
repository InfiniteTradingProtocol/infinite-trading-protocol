/**
 * Author: etherpilled
 * Organization: Infinite Trading
 * Year: 2025
 */

import axios from 'axios';

interface SetSidesParams {
    api_key?: string;
    protocol?: string;
    pool?: string;
    network?: string;
    pair: string;
    side: string;
    threshold?: number;
    max_usd?: number;
    slippage?: number;
    share?: number;
    platform?: string;
    retries?: number;
    retry_delay?: number;
    timeout?: number;
}

async function setSides({
    api_key = 'ADD YOUR API KEY HERE',
    protocol = 'dhedge',
    pool = 'ADD YOUR POOL ADDRESS HERE',
    network = 'polygon',
    pair,
    side,
    threshold = 1,
    max_usd = 500,
    slippage = 1,
    share = 100,
    platform = 'uniswapV3',
    retries = 10,
    retry_delay = 30,
    timeout = 10
}: SetSidesParams): Promise<any> {
    /**
     * Executes a GET request to the Infinite Trading API with specified parameters.
     *
     * Parameters:
     *     api_key (string): The API key required for authentication. Defaults to an initial key you must replace.
     *     protocol (string): Identifier for the trading protocol, e.g., 'dhedge'. Defaults to 'dhedge'.
     *     pool (string): The specific pool address to interact with. Must be specified by the user.
     *     network (string): The blockchain network to use, e.g., 'polygon', 'optimism', 'base', 'arbitrum'. Defaults to 'polygon'.
     *     pair (string): The trading pair to target, such as 'WBTC-USDC'. Must be specified by the user.
     *     side (string): Desired trading position ('long', 'cash', or 'short'). Must be specified by the user.
     *     threshold (number): Percentage threshold to trigger a trade to avoid excessive small trades. Defaults to 1.
     *     max_usd (number): Maximum USD amount for the trade. Defaults to 500.
     *     slippage (number): Maximum allowed slippage percentage. Defaults to 1.
     *     share (number): Percentage of the total trade amount. Defaults to 100.
     *     platform (string): The trading platform to use, e.g., 'uniswapV3'. Defaults to 'uniswapV3'.
     *     retries (number): Number of retry attempts in case of timeout or no response. Defaults to 10.
     *     retry_delay (number): Delay between retry attempts in seconds. Defaults to 30.
     *     timeout (number): Timeout for the API request in seconds. Defaults to 10.
     *
     * Returns:
     *     Promise<any>: A Promise that resolves to a dictionary containing the API response in JSON format if successful.
     *
     * Raises:
     *     Error: Raised if the 'side' parameter is invalid or if the API response status code is not 200 (OK).
     */
    
    const sideMapping: { [key: string]: string } = {
        'long': 'long',
        'cash': 'neutral',
        'short': 'short'
    };

    if (!sideMapping[side]) {
        throw new Error("Invalid side value. Must be 'long', 'cash', or 'short'.");
    }
    const sideApi = sideMapping[side];

    const params = {
        apiKey: api_key,
        protocol: protocol,
        pool: pool,
        network: network,
        pair: pair,
        side: sideApi,
        threshold: threshold,
        max_usd: max_usd,
        slippage: slippage,
        share: share,
        platform: platform
    };

    const endpoint = 'https://api.infinitetrading.io/setBot';

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios.get(endpoint, { params, timeout: timeout * 1000 });
            if (response.status === 200) {
                console.log('Trade executed successfully');
                return response.data;
            }
        } catch (error) {
            if (error.response && error.response.status === 504) {
                console.log('Gateway Timeout. Retrying...');
            } else if (error.code === 'ECONNABORTED') {
                console.log('Request timed out. Retrying...');
            } else {
                console.log(`HTTP error occurred: ${error.message}`);
                return { error: error.response?.status, message: error.response?.data };
            }
        }
        await new Promise(resolve => setTimeout(resolve, retry_delay * 1000));
    }

    console.log('Failed to change sides after multiple attempts.');
    return { error: 'timeout', message: 'Failed to change sides after multiple attempts.' };
}

// Example usage
setSides({ pair: 'WBTC-USDC', side: 'long' }).then(response => console.log(response));
