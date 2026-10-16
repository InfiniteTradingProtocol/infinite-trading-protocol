"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xgrTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.xgrTestnet = (0, defineChain_js_1.defineChain)({
    id: 1879,
    name: 'XGR Testnet',
    nativeCurrency: {
        name: 'XGR',
        symbol: 'XGR',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc1.testnet.xgr.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'XGR Testnet Explorer',
            url: 'https://explorer.testnet.xgr.network',
        },
    },
    testnet: true,
});
//# sourceMappingURL=xgrTestnet.js.map