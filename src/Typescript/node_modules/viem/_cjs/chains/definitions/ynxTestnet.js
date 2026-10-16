"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ynxTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.ynxTestnet = (0, defineChain_js_1.defineChain)({
    id: 6_423,
    name: 'YNX Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'YNXT',
        symbol: 'YNXT',
    },
    rpcUrls: {
        default: {
            http: ['https://evm.ynxweb4.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'YNX Explorer',
            url: 'https://explorer.ynxweb4.com',
        },
    },
    testnet: true,
});
//# sourceMappingURL=ynxTestnet.js.map