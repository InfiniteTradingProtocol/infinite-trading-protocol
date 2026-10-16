export declare const fraxtalTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "fraxscan testnet";
            readonly url: "https://holesky.fraxscan.com";
            readonly apiUrl: "https://api-holesky.fraxscan.com/api";
        };
    };
    blockTime: 2000;
    contracts: {
        readonly l2OutputOracle: {
            readonly 17000: {
                readonly address: "0x715EA64DA13F4d0831ece4Ad3E8c1aa013167F32";
            };
        };
        readonly multicall3: {
            readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
        };
        readonly portal: {
            readonly 17000: {
                readonly address: "0xB9c64BfA498d5b9a8398Ed6f46eb76d90dE5505d";
                readonly blockCreated: 318416;
            };
        };
        readonly l1StandardBridge: {
            readonly 17000: {
                readonly address: "0x0BaafC217162f64930909aD9f2B27125121d6332";
                readonly blockCreated: 318416;
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
    id: 2522;
    name: "Fraxtal Testnet";
    nativeCurrency: {
        readonly name: "Frax";
        readonly symbol: "FRAX";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.testnet.frax.com"];
        };
    };
    sourceId: 17000;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
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
//# sourceMappingURL=fraxtalTestnet.d.ts.map