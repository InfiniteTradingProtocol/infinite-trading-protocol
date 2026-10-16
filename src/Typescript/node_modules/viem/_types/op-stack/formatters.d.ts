import type { OpStackBlock, OpStackRpcBlock } from './types/block.js';
import type { OpStackRpcTransaction, OpStackRpcTransactionReceipt, OpStackTransaction, OpStackTransactionReceipt } from './types/transaction.js';
export declare const formatters: {
    readonly block: {
        exclude: [] | undefined;
        format: (args: OpStackRpcBlock, action?: string | undefined) => OpStackBlock;
        type: "block";
    };
    readonly transaction: {
        exclude: [] | undefined;
        format: (args: OpStackRpcTransaction, action?: string | undefined) => OpStackTransaction;
        type: "transaction";
    };
    readonly transactionReceipt: {
        exclude: [] | undefined;
        format: (args: OpStackRpcTransactionReceipt, action?: string | undefined) => OpStackTransactionReceipt;
        type: "transactionReceipt";
    };
};
//# sourceMappingURL=formatters.d.ts.map