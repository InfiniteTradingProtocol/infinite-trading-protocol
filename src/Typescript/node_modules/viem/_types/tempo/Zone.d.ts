import type { Chain, ChainFormatters } from '../types/chain.js';
import type { Assign } from '../types/utils.js';
import { type DefineChainReturnType } from '../utils/chain/defineChain.js';
import { type ChainConfig } from './chainConfig.js';
type Defaults = {
    nativeCurrency: {
        decimals: number;
        name: string;
        symbol: string;
    };
    rpcUrls: {
        default: {
            http: string[];
        };
    };
    supportsTransactionReplacementDetection: boolean;
};
type ZoneChain = Chain<ChainFormatters, ChainConfig['extendSchema']> & {
    formatters: ChainConfig['formatters'];
};
/** Defines a Tempo Zone chain. */
export declare function from<const config extends from.Parameters>(config: config): from.ReturnValue<config>;
export declare namespace from {
    type Parameters = Pick<Chain, 'id' | 'name'> & Partial<Omit<Chain, 'id' | 'name' | 'sourceId'>> & {
        sourceId: number;
    };
    type ReturnValue<config extends Parameters = Parameters> = Assign<Assign<DefineChainReturnType<ZoneChain>, Defaults>, config>;
}
export declare const a: from.ReturnValue<{
    readonly id: 4217000006;
    readonly name: "Zone A";
    readonly rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc-zone-a.testnet.tempo.xyz"];
        };
    };
    readonly sourceId: 42431;
}>;
export declare const b: from.ReturnValue<{
    readonly id: 4217000007;
    readonly name: "Zone B";
    readonly rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc-zone-b.testnet.tempo.xyz"];
        };
    };
    readonly sourceId: 42431;
}>;
export declare const internal: from.ReturnValue<{
    readonly id: 421700001;
    readonly name: "Internal Zone";
    readonly sourceId: 4217;
}>;
export declare const internalTestnet: from.ReturnValue<{
    readonly id: 1424310003;
    readonly name: "Internal Testnet Zone";
    readonly sourceId: 42431;
}>;
export {};
//# sourceMappingURL=Zone.d.ts.map