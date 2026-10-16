"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalTestnet = exports.internal = exports.b = exports.a = void 0;
exports.from = from;
const defineChain_js_1 = require("../utils/chain/defineChain.js");
const chainConfig_js_1 = require("./chainConfig.js");
function from(config) {
    const chain = {
        ...chainConfig_js_1.chainConfig,
        nativeCurrency: {
            name: 'USD',
            symbol: 'USD',
            decimals: 6,
        },
        rpcUrls: { default: { http: [] } },
        supportsTransactionReplacementDetection: false,
        ...config,
    };
    return (0, defineChain_js_1.defineChain)(chain);
}
exports.a = from({
    id: 4_217_000_006,
    name: 'Zone A',
    rpcUrls: {
        default: {
            http: ['https://rpc-zone-a.testnet.tempo.xyz'],
        },
    },
    sourceId: 42_431,
});
exports.b = from({
    id: 4_217_000_007,
    name: 'Zone B',
    rpcUrls: {
        default: {
            http: ['https://rpc-zone-b.testnet.tempo.xyz'],
        },
    },
    sourceId: 42_431,
});
exports.internal = from({
    id: 421_700_001,
    name: 'Internal Zone',
    sourceId: 4_217,
});
exports.internalTestnet = from({
    id: 1_424_310_003,
    name: 'Internal Testnet Zone',
    sourceId: 42_431,
});
//# sourceMappingURL=Zone.js.map