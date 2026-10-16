"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.morphTachyonTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.morphTachyonTestnet = (0, defineChain_js_1.defineChain)({
    id: 34952,
    name: 'Morph Tachyon Testnet',
    nativeCurrency: {
        name: 'BGB',
        symbol: 'BGB',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-api.popdex.xyz/api/v1/web3/rpc'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Morph Tachyon Testnet Explorer',
            url: 'https://testnet-app.popdex.xyz/explorer',
        },
    },
    testnet: true,
});
//# sourceMappingURL=morphTachyonTestnet.js.map