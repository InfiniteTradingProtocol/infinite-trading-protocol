"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.robinhoodTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.robinhoodTestnet = (0, defineChain_js_1.defineChain)({
    id: 46630,
    name: 'Robinhood Chain Testnet',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://rpc.testnet.chain.robinhood.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://explorer.testnet.chain.robinhood.com',
            apiUrl: 'https://explorer.testnet.chain.robinhood.com/api',
        },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
        },
    },
    testnet: true,
});
//# sourceMappingURL=robinhoodTestnet.js.map