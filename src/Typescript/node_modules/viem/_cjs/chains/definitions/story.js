"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.story = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.story = (0, defineChain_js_1.defineChain)({
    id: 1514,
    name: 'Data Network',
    nativeCurrency: {
        decimals: 18,
        name: 'DATA',
        symbol: 'DATA',
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 340998,
        },
        ensRegistry: {
            address: '0x5dc881dda4e4a8d312be3544ad13118d1a04cb17',
            blockCreated: 648924,
        },
        ensUniversalResolver: {
            address: '0xddfb18888a9466688235887dec2a10c4f5effee9',
            blockCreated: 649114,
        },
    },
    rpcUrls: {
        default: { http: ['https://mainnet.datarpc.io'] },
    },
    blockExplorers: {
        default: {
            name: 'Data Network explorer',
            url: 'https://datanetscan.io',
            apiUrl: 'https://datanetscan.io/api/v2',
        },
    },
    ensTlds: ['.ip'],
    testnet: false,
});
//# sourceMappingURL=story.js.map