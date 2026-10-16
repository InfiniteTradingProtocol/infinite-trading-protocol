import { formatBlock } from '../../utils/formatters/block.js';
import { observe } from '../../utils/observe.js';
import { stringify } from '../../utils/stringify.js';
const blockFields = [
    'size',
    'totalDifficulty',
    'transactions',
    'uncles',
    'withdrawals',
];
/**
 * Watches and returns incoming block headers.
 *
 * - Docs: https://viem.sh/docs/actions/public/watchBlockHeaders
 * - JSON-RPC Methods: Uses a WebSocket or IPC subscription via [`eth_subscribe`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_subscribe) and the `"newHeads"` event.
 *
 * @param client - Client to use
 * @param parameters - {@link WatchBlockHeadersParameters}
 * @returns A function that can be invoked to stop watching for new block headers. {@link WatchBlockHeadersReturnType}
 *
 * @example
 * import { createPublicClient, webSocket } from 'viem'
 * import { watchBlockHeaders } from 'viem/actions'
 * import { mainnet } from 'viem/chains'
 *
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: webSocket(),
 * })
 * const unwatch = watchBlockHeaders(client, {
 *   onBlockHeader: (blockHeader) => console.log(blockHeader),
 * })
 */
export function watchBlockHeaders(client, { onBlockHeader, onError, }) {
    let prevBlockHeader;
    const observerId = stringify(['watchBlockHeaders', client.uid]);
    return observe(observerId, { onBlockHeader, onError }, (emit) => {
        let active = true;
        let subscribed = false;
        let unsubscribe = () => (active = false);
        (async () => {
            try {
                const transport = (() => {
                    if (client.transport.type === 'fallback') {
                        const transport = client.transport.transports.find((transport) => transport.config.type === 'webSocket' ||
                            transport.config.type === 'ipc');
                        if (!transport)
                            return client.transport;
                        return transport.value;
                    }
                    return client.transport;
                })();
                const { unsubscribe: unsubscribe_ } = await transport.subscribe({
                    params: ['newHeads'],
                    onData(data) {
                        if (!active)
                            return;
                        const blockHeader = (client.chain?.formatters?.block?.format || formatBlock)(data.result, 'watchBlockHeaders');
                        for (const field of blockFields)
                            delete blockHeader[field];
                        emit.onBlockHeader(blockHeader, prevBlockHeader);
                        prevBlockHeader = blockHeader;
                    },
                    onError(error) {
                        if (subscribed)
                            emit.onError?.(error);
                    },
                });
                subscribed = true;
                unsubscribe = unsubscribe_;
                if (!active)
                    unsubscribe();
            }
            catch (err) {
                emit.onError?.(err);
            }
        })();
        return () => unsubscribe();
    });
}
//# sourceMappingURL=watchBlockHeaders.js.map