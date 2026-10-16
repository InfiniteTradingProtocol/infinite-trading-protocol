"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jasmyChainTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.jasmyChainTestnet = (0, defineChain_js_1.defineChain)({
    id: 681,
    name: 'Jasmy Chain Testnet',
    network: 'jasmyChainTestnet',
    nativeCurrency: { name: 'JasmyCoin', symbol: 'JASMY', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://jasmy-chain-testnet.alt.technology'],
            webSocket: ['wss://jasmy-chain-testnet.alt.technology/ws'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Jasmy Chain Testnet Explorer',
            url: 'https://jasmy-chain-testnet-explorer.alt.technology',
            apiUrl: 'https://jasmy-chain-testnet-explorer.alt.technology/api',
        },
    },
    testnet: true,
});
//# sourceMappingURL=jasmyChainTestnet.js.map