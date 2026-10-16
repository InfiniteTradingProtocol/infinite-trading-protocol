"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arc = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.arc = (0, defineChain_js_1.defineChain)({
    id: 5042,
    name: 'Arc',
    nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [
                'https://rpc.mainnet.arc.io',
                'https://rpc.blockdaemon.mainnet.arc.io',
                'https://rpc.drpc.mainnet.arc.io',
                'https://rpc.quicknode.mainnet.arc.io',
            ],
        },
    },
    blockExplorers: {
        default: {
            name: 'Arc Explorer',
            url: 'https://explorer.arc.io',
            apiUrl: 'https://explorer.arc.io/api/v2',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 0,
        },
    },
});
//# sourceMappingURL=arc.js.map