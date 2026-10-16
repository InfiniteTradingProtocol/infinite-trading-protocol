"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.robinhood = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.robinhood = (0, defineChain_js_1.defineChain)({
    id: 4663,
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 100,
    rpcUrls: {
        default: {
            http: [
                'https://rpc.mainnet.chain.robinhood.com',
                'https://rpc.ordofi.network',
            ],
            webSocket: ['wss://rpc.ordofi.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://robinhoodchain.blockscout.com',
            apiUrl: 'https://robinhoodchain.blockscout.com/api',
        },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
        },
    },
});
//# sourceMappingURL=robinhood.js.map