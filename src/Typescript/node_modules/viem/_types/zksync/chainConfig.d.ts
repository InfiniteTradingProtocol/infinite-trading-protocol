export declare const chainConfig: {
    readonly blockTime: 1000;
    readonly formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("./index.js").ZkSyncRpcBlock, action?: string | undefined) => import("./index.js").ZkSyncBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("./index.js").ZkSyncRpcTransaction, action?: string | undefined) => import("./index.js").ZkSyncTransaction;
            type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: import("./index.js").ZkSyncRpcTransactionReceipt, action?: string | undefined) => import("./index.js").ZkSyncTransactionReceipt;
            type: "transactionReceipt";
        };
        readonly transactionRequest: {
            exclude: ("paymaster" | "gasPerPubdata" | "factoryDeps" | "paymasterInput" | "customSignature")[] | undefined;
            format: (args: import("./index.js").ZkSyncTransactionRequest, action?: string | undefined) => import("./index.js").ZkSyncRpcTransactionRequest & {
                paymaster: never;
                gasPerPubdata: never;
                factoryDeps: never;
                paymasterInput: never;
                customSignature: never;
            };
            type: "transactionRequest";
        };
    };
    readonly serializers: {
        readonly transaction: typeof import("./serializers.js").serializeTransaction;
    };
    readonly custom: {
        readonly getEip712Domain: import("./index.js").EIP712DomainFn<import("./index.js").ZkSyncTransactionSerializable, import("./index.js").ZkSyncEIP712TransactionSignable>;
    };
};
//# sourceMappingURL=chainConfig.d.ts.map