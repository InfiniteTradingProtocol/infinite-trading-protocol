"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchBlockHeaders = watchBlockHeaders;
const block_js_1 = require("../../utils/formatters/block.js");
const observe_js_1 = require("../../utils/observe.js");
const stringify_js_1 = require("../../utils/stringify.js");
const blockFields = [
    'size',
    'totalDifficulty',
    'transactions',
    'uncles',
    'withdrawals',
];
function watchBlockHeaders(client, { onBlockHeader, onError, }) {
    let prevBlockHeader;
    const observerId = (0, stringify_js_1.stringify)(['watchBlockHeaders', client.uid]);
    return (0, observe_js_1.observe)(observerId, { onBlockHeader, onError }, (emit) => {
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
                        const blockHeader = (client.chain?.formatters?.block?.format || block_js_1.formatBlock)(data.result, 'watchBlockHeaders');
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