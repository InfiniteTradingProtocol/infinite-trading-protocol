export declare const pgnTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "PGN Testnet Explorer";
            readonly url: "https://explorer.sepolia.publicgoods.network";
            readonly apiUrl: "https://explorer.sepolia.publicgoods.network/api";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts: {
        readonly l2OutputOracle: {
            readonly 11155111: {
                readonly address: "0xD5bAc3152ffC25318F848B3DD5dA6C85171BaEEe";
            };
        };
        readonly portal: {
            readonly 11155111: {
                readonly address: "0xF04BdD5353Bb0EFF6CA60CfcC78594278eBfE179";
            };
        };
        readonly l1StandardBridge: {
            readonly 11155111: {
                readonly address: "0xFaE6abCAF30D23e233AC7faF747F2fC3a5a6Bfa3";
            };
        };
        readonly multicall3: {
            readonly address: "0xcA11bde05977b3631167028862bE2a173976CA11";
            readonly blockCreated: 3754925;
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 58008;
    name: "PGN";
    nativeCurrency: {
        readonly name: "Ether";
        readonly symbol: "ETH";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://sepolia.publicgoods.network"];
        };
    };
    sourceId: 11155111;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: import("../../index.js").ChainFees<undefined> | undefined;
    formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").OpStackRpcBlock, action?: string | undefined) => import("../index.js").OpStackBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").OpStackRpcTransaction, action?: string | undefined) => import("../index.js").OpStackTransaction;
            type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: import("../index.js").OpStackRpcTransactionReceipt, action?: string | undefined) => import("../index.js").OpStackTransactionReceipt;
            type: "transactionReceipt";
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
    serializers?: import("../../index.js").ChainSerializers<undefined, import("../../index.js").TransactionSerializable> | undefined;
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
    readonly network: "pgn-testnet";
};
//# sourceMappingURL=pgnTestnet.d.ts.map