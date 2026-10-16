import type { CeloBlock, CeloRpcBlock, CeloRpcTransaction, CeloRpcTransactionRequest, CeloTransaction, CeloTransactionRequest } from './types.js';
export declare const formatters: {
    readonly block: {
        exclude: [] | undefined;
        format: (args: CeloRpcBlock, action?: string | undefined) => CeloBlock;
        type: "block";
    };
    readonly transaction: {
        exclude: [] | undefined;
        format: (args: CeloRpcTransaction, action?: string | undefined) => CeloTransaction;
        type: "transaction";
    };
    readonly transactionRequest: {
        exclude: [] | undefined;
        format: (args: CeloTransactionRequest, action?: string | undefined) => CeloRpcTransactionRequest;
        type: "transactionRequest";
    };
};
//# sourceMappingURL=formatters.d.ts.map