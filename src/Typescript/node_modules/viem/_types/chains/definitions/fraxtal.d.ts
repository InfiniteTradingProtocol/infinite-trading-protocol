export declare const fraxtal: {
    blockExplorers: {
        readonly default: {
            readonly name: "fraxscan";
            readonly url: "https://fraxscan.com";
            readonly apiUrl: "https://api.fraxscan.com/api";
        };
    };
    blockTime: 2000;
    contracts: {
        readonly l2OutputOracle: {
            readonly 1: {
                readonly address: "0x66CC916Ed5C6C2FA97014f7D1cD141528Ae171e4";
            };
        };
        readonly multicall3: {
            readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
        };
        readonly portal: {
            readonly 1: {
                readonly address: "0x36cb65c1967A0Fb0EEE11569C51C2f2aA1Ca6f6D";
                readonly blockCreated: 19135323;
            };
        };
        readonly l1StandardBridge: {
            readonly 1: {
                readonly address: "0x34C0bD5877A5Ee7099D0f5688D65F4bB9158BDE2";
                readonly blockCreated: 19135323;
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
    id: 252;
    name: "Fraxtal";
    nativeCurrency: {
        readonly name: "Frax";
        readonly symbol: "FRAX";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.frax.com"];
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
};
//# sourceMappingURL=fraxtal.d.ts.map