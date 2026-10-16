import { formatBlockParameter, } from '../../utils/block/formatBlockParameter.js';
/**
 * Returns values from multiple storage slots for multiple adddresses at a given block.
 *
 * - Docs: https://viem.sh/docs/actions/public/getStorageValues
 * - JSON-RPC Methods: [`eth_getStorageValues`](https://github.com/ethereum/execution-apis/issues/752)
 *
 * @param client - Client to use
 * @param parameters - {@link GetStorageValuesParameters}
 * @returns The values of the requested storage slots. {@link GetStorageValuesReturnType}
 *
 * @example
 * import { createPublicClient, http, toHex } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { getStorageValues } from 'viem/actions'
 *
 * const client = createPublicClient({ chain: mainnet, transport: http() })
 * const values = await getStorageValues(client, {
 *   requests: {
 *     '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2': [
 *       toHex(0, { size: 32 }),
 *       toHex(1, { size: 32 }),
 *     ],
 *   },
 * })
 */
export async function getStorageValues(client, { blockHash, blockNumber, blockTag = 'latest', requireCanonical, requests, }) {
    const block = formatBlockParameter({
        blockHash,
        blockNumber,
        blockTag,
        requireCanonical,
    });
    return client.request({
        method: 'eth_getStorageValues',
        params: [requests, block],
    });
}
//# sourceMappingURL=getStorageValues.js.map