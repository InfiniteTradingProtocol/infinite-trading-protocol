export declare const chainConfig: {
    readonly blockTime: 2000;
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
            format: (args: import("./index.js").OpStackRpcBlock, action?: string | undefined) => import("./index.js").OpStackBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("./index.js").OpStackRpcTransaction, action?: string | undefined) => import("./index.js").OpStackTransaction;
            type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: import("./index.js").OpStackRpcTransactionReceipt, action?: string | undefined) => import("./index.js").OpStackTransactionReceipt;
            type: "transactionReceipt";
        };
    };
    readonly serializers: {
        readonly transaction: typeof import("./serializers.js").serializeTransaction;
    };
};
//# sourceMappingURL=chainConfig.d.ts.map