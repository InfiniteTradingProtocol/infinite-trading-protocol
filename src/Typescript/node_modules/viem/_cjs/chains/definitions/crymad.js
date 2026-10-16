"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crymad = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.crymad = (0, defineChain_js_1.defineChain)({
    id: 1475,
    name: 'CRYMAD Chain',
    nativeCurrency: {
        name: 'CryMadX',
        symbol: 'CMX-R',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.cmxofficial.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'CRYMAD Chain Explorer',
            url: 'https://explorer.cmxofficial.com',
            apiUrl: 'https://explorer.cmxofficial.com/api/v2',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 834292,
        },
    },
});
//# sourceMappingURL=crymad.js.map