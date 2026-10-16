"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eduChain = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.eduChain = (0, defineChain_js_1.defineChain)({
    id: 41923,
    name: 'EDU Chain',
    nativeCurrency: {
        decimals: 18,
        name: 'EDU',
        symbol: 'EDU',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.educhain.xyz'],
            webSocket: ['wss://rpc.educhain.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'EDU Chain Explorer',
            url: 'https://explorer.educhain.xyz/',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 16410660,
        },
    },
    testnet: false,
});
//# sourceMappingURL=eduChain.js.map