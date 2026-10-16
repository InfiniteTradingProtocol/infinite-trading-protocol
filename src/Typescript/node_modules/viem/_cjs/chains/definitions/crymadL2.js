"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crymadL2 = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.crymadL2 = (0, defineChain_js_1.defineChain)({
    id: 7373,
    name: 'CRYMAD Chain L2',
    nativeCurrency: {
        name: 'CryMadX',
        symbol: 'CMX-R',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpcl2.cmxofficial.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'CRYMAD Chain L2 Explorer',
            url: 'https://explorer-l2.cmxofficial.com',
            apiUrl: 'https://explorer-l2.cmxofficial.com/api/v2',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 0,
        },
    },
    sourceId: 1475,
});
//# sourceMappingURL=crymadL2.js.map