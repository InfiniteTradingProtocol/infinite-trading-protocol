export declare const playfiAlbireo: {
    blockExplorers: {
        readonly default: {
            readonly name: "PlayFi Albireo Explorer";
            readonly url: "https://albireo-explorer.playfi.ai";
        };
    };
    blockTime: 1000;
    contracts: {
        readonly multicall3: {
            readonly address: "0xF9cda624FBC7e059355ce98a31693d299FACd963";
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 1612127;
    name: "PlayFi Albireo Testnet";
    nativeCurrency: {
        readonly name: "Ether";
        readonly symbol: "ETH";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://albireo-rpc.playfi.ai"];
            readonly webSocket: readonly ["wss://albireo-rpc-ws.playfi.ai/ws"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom: {
        readonly getEip712Domain: import("../../zksync/index.js").EIP712DomainFn<import("../index.js").ZkSyncTransactionSerializable, import("../index.js").ZkSyncEIP712TransactionSignable>;
    };
    extendSchema?: Record<string, unknown> | undefined;
    fees?: import("../../index.js").ChainFees<undefined> | undefined;
    formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").ZkSyncRpcBlock, action?: string | undefined) => import("../index.js").ZkSyncBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").ZkSyncRpcTransaction, action?: string | undefined) => import("../index.js").ZkSyncTransaction;
            type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: import("../index.js").ZkSyncRpcTransactionReceipt, action?: string | undefined) => import("../index.js").ZkSyncTransactionReceipt;
            type: "transactionReceipt";
        };
        readonly transactionRequest: {
            exclude: ("paymaster" | "gasPerPubdata" | "factoryDeps" | "paymasterInput" | "customSignature")[] | undefined;
            format: (args: import("../index.js").ZkSyncTransactionRequest, action?: string | undefined) => import("../index.js").ZkSyncRpcTransactionRequest & {
                paymaster: never;
                gasPerPubdata: never;
                factoryDeps: never;
                paymasterInput: never;
                customSignature: never;
            };
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
        readonly transaction: typeof import("../../zksync/serializers.js").serializeTransaction;
    };
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
    readonly network: "albireo";
};
//# sourceMappingURL=playfiAlbireo.d.ts.map