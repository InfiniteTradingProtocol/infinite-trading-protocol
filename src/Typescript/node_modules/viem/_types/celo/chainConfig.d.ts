export declare const chainConfig: {
    readonly blockTime: 1000;
    readonly contracts: {
        readonly gasPriceOracle: {
            readonly address: "0x420000000000000000000000000000000000000F";
        };
        readonly l1Block: {
            readonly address: "0x4200000000000000000000000000000000000015";
        };
        readonly l2CrossDomainMessenger: {
            readonly address: "0x4200000000000000000000000000000000000007";
        };
        readonly l2Erc721Bridge: {
            readonly address: "0x4200000000000000000000000000000000000014";
        };
        readonly l2StandardBridge: {
            readonly address: "0x4200000000000000000000000000000000000010";
        };
        readonly l2ToL1MessagePasser: {
            readonly address: "0x4200000000000000000000000000000000000016";
        };
    };
    readonly formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloRpcBlock, action?: string | undefined) => import("./types.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloRpcTransaction, action?: string | undefined) => import("./types.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloTransactionRequest, action?: string | undefined) => import("./types.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
        };
    };
    readonly serializers: {
        readonly transaction: typeof import("./serializers.js").serializeTransaction;
    };
    readonly fees: import("../index.js").ChainFees<{
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloRpcBlock, action?: string | undefined) => import("./types.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloRpcTransaction, action?: string | undefined) => import("./types.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("./types.js").CeloTransactionRequest, action?: string | undefined) => import("./types.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
        };
    }>;
};
//# sourceMappingURL=chainConfig.d.ts.map