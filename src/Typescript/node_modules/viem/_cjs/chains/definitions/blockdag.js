"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockdag = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.blockdag = (0, defineChain_js_1.defineChain)({
    id: 1404,
    name: 'BlockDAG',
    nativeCurrency: {
        decimals: 18,
        name: 'BlockDAG',
        symbol: 'BDAG',
    },
    rpcUrls: {
        default: { http: ['https://rpc.bdagexplorer.com/'] },
    },
    blockExplorers: {
        default: {
            name: 'BDAG Explorer',
            url: 'https://explorer.bdagexplorer.com',
        },
    },
});
//# sourceMappingURL=blockdag.js.map