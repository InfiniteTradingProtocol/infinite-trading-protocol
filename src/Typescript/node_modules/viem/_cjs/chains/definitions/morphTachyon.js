"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.morphTachyon = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.morphTachyon = (0, defineChain_js_1.defineChain)({
    id: 2184,
    name: 'Morph Tachyon',
    nativeCurrency: {
        name: 'BGB',
        symbol: 'BGB',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://api.popdex.xyz/api/v1/web3/rpc'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Morph Tachyon Explorer',
            url: 'https://app.popdex.xyz/explorer',
        },
    },
});
//# sourceMappingURL=morphTachyon.js.map