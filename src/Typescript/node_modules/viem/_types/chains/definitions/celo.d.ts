export declare const celo: {
    blockExplorers: {
        readonly default: {
            readonly name: "Celo Explorer";
            readonly url: "https://celoscan.io";
            readonly apiUrl: "https://api.celoscan.io/api";
        };
    };
    blockTime: 1000;
    contracts: {
        readonly multicall3: {
            readonly address: "0xcA11bde05977b3631167028862bE2a173976CA11";
            readonly blockCreated: 13112599;
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 42220;
    name: "Celo";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "CELO";
        readonly symbol: "CELO";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://forno.celo.org"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: false;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees: import("../../index.js").ChainFees<{
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcBlock, action?: string | undefined) => import("../index.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcTransaction, action?: string | undefined) => import("../index.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloTransactionRequest, action?: string | undefined) => import("../index.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
        };
    }>;
    formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcBlock, action?: string | undefined) => import("../index.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcTransaction, action?: string | undefined) => import("../index.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloTransactionRequest, action?: string | undefined) => import("../index.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
        };
    };
    prepareTransactionRequest?: ((args: import("../../index.js").PrepareTransactionRequestParameters, options: {
        client: import("../../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>) | [fn: ((args: import("../../index.js").PrepareTransactionRequestParameters, options: {
        client: import("../../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers: {
        readonly transaction: typeof import("../index.js").serializeTransactionCelo;
    };
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
};
//# sourceMappingURL=celo.d.ts.map