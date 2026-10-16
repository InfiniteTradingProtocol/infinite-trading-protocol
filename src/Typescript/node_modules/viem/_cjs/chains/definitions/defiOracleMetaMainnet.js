"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defiOracleMetaMainnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.defiOracleMetaMainnet = (0, defineChain_js_1.defineChain)({
    id: 138,
    name: 'Defi Oracle Meta Mainnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [
                'https://rpc-http-pub.d-bis.org',
                'https://rpc.d-bis.org',
                'https://rpc2.d-bis.org',
                'https://rpc.public-0138.defi-oracle.io',
                'https://rpc.defi-oracle.io',
            ],
            webSocket: [
                'wss://rpc-ws-pub.d-bis.org',
                'wss://ws.rpc.d-bis.org',
                'wss://ws.rpc2.d-bis.org',
                'wss://rpc.public-0138.defi-oracle.io',
                'wss://wss.defi-oracle.io',
            ],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://explorer.d-bis.org',
        },
    },
});
//# sourceMappingURL=defiOracleMetaMainnet.js.map