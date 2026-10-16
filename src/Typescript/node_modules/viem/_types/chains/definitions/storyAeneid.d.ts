export declare const storyAeneid: {
    blockExplorers: {
        readonly default: {
            readonly name: "Data Network Aeneid Explorer";
            readonly url: "https://aeneid.datanetscan.io";
            readonly apiUrl: "https://aeneid.datanetscan.io/api/v2";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts: {
        readonly multicall3: {
            readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
            readonly blockCreated: 1792;
        };
        readonly ensRegistry: {
            readonly address: "0x5dC881dDA4e4a8d312be3544AD13118D1a04Cb17";
            readonly blockCreated: 1322033;
        };
        readonly ensUniversalResolver: {
            readonly address: "0x6D3B3F99177FB2A5de7F9E928a9BD807bF7b5BAD";
            readonly blockCreated: 1322097;
        };
    };
    ensTlds: readonly [".ip"];
    id: 1315;
    name: "Data Network Aeneid";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "DATA";
        readonly symbol: "DATA";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://aeneid.datarpc.io"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: import("../../index.js").ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: import("../../index.js").PrepareTransactionRequestParameters, options: {
        client: import("../../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>) | [fn: ((args: import("../../index.js").PrepareTransactionRequestParameters, options: {
        client: import("../../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: import("../../index.js").ChainSerializers<undefined, import("../../index.js").TransactionSerializable> | undefined;
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
    readonly network: "data-network-aeneid";
};
//# sourceMappingURL=storyAeneid.d.ts.map