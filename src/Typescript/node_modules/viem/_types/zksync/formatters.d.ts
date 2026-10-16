import type { ZksyncBlock, ZksyncRpcBlock } from './types/block.js';
import type { ZksyncRpcTransaction, ZksyncRpcTransactionReceipt, ZksyncRpcTransactionRequest, ZksyncTransaction, ZksyncTransactionReceipt, ZksyncTransactionRequest } from './types/transaction.js';
export declare const formatters: {
    readonly block: {
        exclude: [] | undefined;
        format: (args: ZksyncRpcBlock, action?: string | undefined) => ZksyncBlock;
        type: "block";
    };
    readonly transaction: {
        exclude: [] | undefined;
        format: (args: ZksyncRpcTransaction, action?: string | undefined) => ZksyncTransaction;
        type: "transaction";
    };
    readonly transactionReceipt: {
        exclude: [] | undefined;
        format: (args: ZksyncRpcTransactionReceipt, action?: string | undefined) => ZksyncTransactionReceipt;
        type: "transactionReceipt";
    };
    readonly transactionRequest: {
        exclude: ("paymaster" | "gasPerPubdata" | "factoryDeps" | "paymasterInput" | "customSignature")[] | undefined;
        format: (args: ZksyncTransactionRequest, action?: string | undefined) => ZksyncRpcTransactionRequest & {
            paymaster: never;
            gasPerPubdata: never;
            factoryDeps: never;
            paymasterInput: never;
            customSignature: never;
        };
        type: "transactionRequest";
    };
};
//# sourceMappingURL=formatters.d.ts.map