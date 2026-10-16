export declare const lisk: {
    blockExplorers: {
        readonly default: {
            readonly name: "Blockscout";
            readonly url: "https://blockscout.lisk.com";
            readonly apiUrl: "https://blockscout.lisk.com/api";
        };
    };
    blockTime: 2000;
    contracts: {
        readonly disputeGameFactory: {
            readonly 1: {
                readonly address: "0x0CF7D3706a27CCE2017aEB11E8a9c8b5388c282C";
            };
        };
        readonly multicall3: {
            readonly address: "0xA9d71E1dd7ca26F26e656E66d6AA81ed7f745bf0";
        };
        readonly l2OutputOracle: {
            readonly 1: {
                readonly address: "0x113cB99283AF242Da0A0C54347667edF531Aa7d6";
            };
        };
        readonly portal: {
            readonly 1: {
                readonly address: "0x26dB93F8b8b4f7016240af62F7730979d353f9A7";
            };
        };
        readonly l1StandardBridge: {
            readonly 1: {
                readonly address: "0x2658723Bf70c7667De6B25F99fcce13A16D25d08";
            };
        };
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
    ensTlds?: readonly string[] | undefined;
    id: 1135;
    name: "Lisk";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Ether";
        readonly symbol: "ETH";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.api.lisk.com"];
        };
    };
    sourceId: 1;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet?: boolean | undefined | undefined;
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
    serializers: {
        readonly transaction: typeof import("../index.js").serializeTransactionOpStack;
    };
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
    readonly network: "lisk";
};
//# sourceMappingURL=lisk.d.ts.map