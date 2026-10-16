"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hyveChain = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.hyveChain = (0, defineChain_js_1.defineChain)({
    id: 7847,
    name: 'HyveChain',
    nativeCurrency: { name: 'HYVE', symbol: 'HYVE', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://rpc.hyvechain.com'],
            webSocket: ['wss://ws.hyvechain.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'HyveChain Explorer',
            url: 'https://explorer.hyvechain.com',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 4090846,
        },
    },
    testnet: false,
});
//# sourceMappingURL=hyveChain.js.map