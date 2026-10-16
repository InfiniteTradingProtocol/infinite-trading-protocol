"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kortana = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.kortana = (0, defineChain_js_1.defineChain)({
    id: 9002,
    name: 'Kortana',
    nativeCurrency: {
        decimals: 18,
        name: 'Dinar',
        symbol: 'DNR',
    },
    rpcUrls: {
        default: { http: ['https://zeus-rpc.mainnet.kortana.xyz'] },
    },
    blockExplorers: {
        default: {
            name: 'Kortana Explorer',
            url: 'https://explorer.mainnet.kortana.xyz',
        },
    },
});
//# sourceMappingURL=kortana.js.map