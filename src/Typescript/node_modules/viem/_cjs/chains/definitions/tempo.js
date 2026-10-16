"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tempo = void 0;
const chainConfig_js_1 = require("../../tempo/chainConfig.js");
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.tempo = (0, defineChain_js_1.defineChain)({
    ...chainConfig_js_1.chainConfig,
    id: 4217,
    blockExplorers: {
        default: {
            name: 'Tempo Explorer',
            url: 'https://explore.tempo.xyz',
        },
    },
    contracts: {
        earnFactory: {
            address: '0x3085A8003f340CD51C72D9e1a1298CDafB171B02',
        },
        erc4626EngineFactory: {
            address: '0xd43D00981222a8db444A528E69f19E3cE5A7D2Ff',
        },
    },
    name: 'Tempo Mainnet',
    nativeCurrency: {
        name: 'USD',
        symbol: 'USD',
        decimals: 6,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.tempo.xyz'],
            webSocket: ['wss://rpc.tempo.xyz'],
        },
    },
});
//# sourceMappingURL=tempo.js.map