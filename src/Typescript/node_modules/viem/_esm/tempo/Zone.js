import { defineChain, } from '../utils/chain/defineChain.js';
import { chainConfig } from './chainConfig.js';
export function from(config) {
    const chain = {
        ...chainConfig,
        nativeCurrency: {
            name: 'USD',
            symbol: 'USD',
            decimals: 6,
        },
        rpcUrls: { default: { http: [] } },
        supportsTransactionReplacementDetection: false,
        ...config,
    };
    return defineChain(chain);
}
export const a = /*#__PURE__*/ from({
    id: 4_217_000_006,
    name: 'Zone A',
    rpcUrls: {
        default: {
            http: ['https://rpc-zone-a.testnet.tempo.xyz'],
        },
    },
    sourceId: 42_431,
});
export const b = /*#__PURE__*/ from({
    id: 4_217_000_007,
    name: 'Zone B',
    rpcUrls: {
        default: {
            http: ['https://rpc-zone-b.testnet.tempo.xyz'],
        },
    },
    sourceId: 42_431,
});
export const internal = /*#__PURE__*/ from({
    id: 421_700_001,
    name: 'Internal Zone',
    sourceId: 4_217, // tempo mainnet
});
export const internalTestnet = /*#__PURE__*/ from({
    id: 1_424_310_003,
    name: 'Internal Testnet Zone',
    sourceId: 42_431, // tempo testnet
});
//# sourceMappingURL=Zone.js.map