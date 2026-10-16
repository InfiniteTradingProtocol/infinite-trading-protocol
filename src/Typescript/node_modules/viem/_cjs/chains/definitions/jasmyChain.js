"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jasmyChain = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.jasmyChain = (0, defineChain_js_1.defineChain)({
    id: 680,
    name: 'Jasmy Chain',
    network: 'jasmyChain',
    nativeCurrency: { name: 'JasmyCoin', symbol: 'JASMY', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://rpc.jasmyscan.net'],
            webSocket: ['wss://rpc.jasmyscan.net/ws'],
        },
    },
    blockExplorers: {
        default: {
            name: 'JasmyScan',
            url: 'https://explorer.jasmyscan.net',
            apiUrl: 'https://explorer.jasmyscan.net/api',
        },
    },
    testnet: false,
});
//# sourceMappingURL=jasmyChain.js.map