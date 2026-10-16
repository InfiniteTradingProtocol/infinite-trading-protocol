"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eCanna = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.eCanna = (0, defineChain_js_1.defineChain)({
    id: 4111,
    name: 'E Canna Mainnet',
    nativeCurrency: {
        name: 'E Canna',
        symbol: 'ECNA',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://rpc.ecnascan.com'] },
    },
    blockExplorers: {
        default: {
            name: 'ECNA Scan',
            url: 'https://explorer.ecnascan.com',
        },
    },
});
//# sourceMappingURL=eCanna.js.map