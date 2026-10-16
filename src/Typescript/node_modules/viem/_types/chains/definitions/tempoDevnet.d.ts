export declare const tempoDevnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Tempo Explorer";
            readonly url: "https://explore.devnet.tempo.xyz";
        };
    };
    blockTime: 1000;
    contracts?: {
        [x: string]: import("../../index.js").ChainContract | {
            [sourceId: number]: import("../../index.js").ChainContract | undefined;
        } | undefined;
        ensRegistry?: import("../../index.js").ChainContract | undefined;
        ensUniversalResolver?: import("../../index.js").ChainContract | undefined;
        multicall3?: import("../../index.js").ChainContract | undefined;
        erc6492Verifier?: import("../../index.js").ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 31318;
    name: "Tempo Devnet";
    nativeCurrency: {
        readonly name: "USD";
        readonly symbol: "USD";
        readonly decimals: 6;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.devnet.tempoxyz.dev"];
            readonly webSocket: readonly ["wss://rpc.devnet.tempoxyz.dev"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema: {
        feeToken?: import("ox/tempo/TokenId").TokenIdOrAddress | undefined;
        hardfork?: import("../../tempo/Hardfork.js").Hardfork | undefined;
    };
    fees?: import("../../index.js").ChainFees<undefined> | undefined;
    formatters: {
        readonly transaction: {
            exclude: never[] | undefined;
            format: (args: import("../index.js").z_TransactionRpc, action?: string | undefined) => import("../index.js").z_Transaction<bigint, number, boolean>;
            type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: import("../index.js").z_TransactionReceiptRpc, action?: string | undefined) => import("../index.js").z_TransactionReceipt;
            type: "transactionReceipt";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("../index.js").z_TransactionRequest, action?: string | undefined) => import("../index.js").z_TransactionRequestRpc;
            type: "transactionRequest";
        };
    };
    prepareTransactionRequest: [(r: import("../../index.js").PrepareTransactionRequestParameters, { client, phase }: {
        client: import("../../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>, {
        readonly runAt: readonly ["beforeFillTransaction", "afterFillParameters"];
    }];
    serializers: {
        readonly transaction: import("../../index.js").SerializeTransactionFn;
        readonly transactionEnvelope: ({ serializedTransaction, transaction }: {
            serializedTransaction: import("../../index.js").TransactionSerializedGeneric;
            transaction: import("../../index.js").TransactionSerializable;
        }) => Promise<`0x${string}`>;
    };
    verifyHash: (client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<boolean>;
    readonly hardfork: "t3";
    extend: <const extended_1 extends {
        feeToken?: import("ox/tempo/TokenId").TokenIdOrAddress | undefined;
        hardfork?: import("../../tempo/Hardfork.js").Hardfork | undefined;
    }>(extended: extended_1) => import("../index.js").Assign<import("../index.js").Assign<import("../index.js").Chain<undefined>, {
        readonly id: 31318;
        readonly name: "Tempo Devnet";
        readonly hardfork: "t3";
        readonly blockExplorers: {
            readonly default: {
                readonly name: "Tempo Explorer";
                readonly url: "https://explore.devnet.tempo.xyz";
            };
        };
        readonly nativeCurrency: {
            readonly name: "USD";
            readonly symbol: "USD";
            readonly decimals: 6;
        };
        readonly rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://rpc.devnet.tempoxyz.dev"];
                readonly webSocket: readonly ["wss://rpc.devnet.tempoxyz.dev"];
            };
        };
        readonly testnet: true;
        readonly blockTime: 1000;
        readonly extendSchema: {
            feeToken?: import("ox/tempo/TokenId").TokenIdOrAddress | undefined;
            hardfork?: import("../../tempo/Hardfork.js").Hardfork | undefined;
        };
        readonly formatters: {
            readonly transaction: {
                exclude: never[] | undefined;
                format: (args: import("../index.js").z_TransactionRpc, action?: string | undefined) => import("../index.js").z_Transaction<bigint, number, boolean>;
                type: "transaction";
            };
            readonly transactionReceipt: {
                exclude: [] | undefined;
                format: (args: import("../index.js").z_TransactionReceiptRpc, action?: string | undefined) => import("../index.js").z_TransactionReceipt;
                type: "transactionReceipt";
            };
            readonly transactionRequest: {
                exclude: [] | undefined;
                format: (args: import("../index.js").z_TransactionRequest, action?: string | undefined) => import("../index.js").z_TransactionRequestRpc;
                type: "transactionRequest";
            };
        };
        readonly prepareTransactionRequest: [(r: import("../../index.js").PrepareTransactionRequestParameters, { client, phase }: {
            client: import("../../index.js").Client;
            phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
        }) => Promise<import("../../index.js").PrepareTransactionRequestParameters>, {
            readonly runAt: readonly ["beforeFillTransaction", "afterFillParameters"];
        }];
        readonly serializers: {
            readonly transaction: import("../../index.js").SerializeTransactionFn;
            readonly transactionEnvelope: ({ serializedTransaction, transaction }: {
                serializedTransaction: import("../../index.js").TransactionSerializedGeneric;
                transaction: import("../../index.js").TransactionSerializable;
            }) => Promise<`0x${string}`>;
        };
        readonly verifyHash: (client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<boolean>;
    }>, extended_1>;
};
//# sourceMappingURL=tempoDevnet.d.ts.map