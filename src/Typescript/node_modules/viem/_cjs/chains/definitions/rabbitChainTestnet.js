"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rabbitChainTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.rabbitChainTestnet = (0, defineChain_js_1.defineChain)({
    id: 9280,
    name: 'Rabbit Chain Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Test Rabbit',
        symbol: 'tRAB',
    },
    rpcUrls: {
        default: { http: ['https://rpc-testnet.rabbitchain.org'] },
    },
    blockExplorers: {
        default: {
            name: 'Rabbit Chain Testnet Explorer',
            url: 'https://explorer-testnet.rabbitchain.org',
        },
    },
    testnet: true,
});
//# sourceMappingURL=rabbitChainTestnet.js.map