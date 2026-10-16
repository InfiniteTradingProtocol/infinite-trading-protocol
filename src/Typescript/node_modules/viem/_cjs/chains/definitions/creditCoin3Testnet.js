"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditCoin3Testnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.creditCoin3Testnet = (0, defineChain_js_1.defineChain)({
    id: 102031,
    name: 'Creditcoin Testnet',
    nativeCurrency: { name: 'Creditcoin Testnet', symbol: 'tCTC', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://rpc.cc3-testnet.creditcoin.network'],
            webSocket: ['wss://rpc.cc3-testnet.creditcoin.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://creditcoin-testnet.blockscout.com',
            apiUrl: 'https://creditcoin-testnet.blockscout.com/api',
        },
    },
    contracts: {
        multicall3: {
            address: '0x47b51dC7b7Bbb3d9eB12080e3DA6E26125e8D75e',
            blockCreated: 5_566_188,
        },
    },
    testnet: true,
});
//# sourceMappingURL=creditCoin3Testnet.js.map