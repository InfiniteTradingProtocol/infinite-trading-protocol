export declare const celoAlfajores: {
    blockExplorers: {
        readonly default: {
            readonly name: "Celo Alfajores Explorer";
            readonly url: "https://celo-alfajores.blockscout.com";
            readonly apiUrl: "https://celo-alfajores.blockscout.com/api";
        };
    };
    blockTime: 1000;
    contracts: {
        readonly multicall3: {
            readonly address: "0xcA11bde05977b3631167028862bE2a173976CA11";
            readonly blockCreated: 14569001;
        };
        readonly portal: {
            readonly 17000: {
                readonly address: "0x82527353927d8D069b3B452904c942dA149BA381";
                readonly blockCreated: 2411324;
            };
        };
        readonly disputeGameFactory: {
            readonly 17000: {
                readonly address: "0xE28AAdcd9883746c0e5068F58f9ea06027b214cb";
                readonly blockCreated: 2411324;
            };
        };
        readonly l2OutputOracle: {
            readonly 17000: {
                readonly address: "0x4a2635e9e4f6e45817b1D402ac4904c1d1752438";
                readonly blockCreated: 2411324;
            };
        };
        readonly l1StandardBridge: {
            readonly 17000: {
                readonly address: "0xD1B0E0581973c9eB7f886967A606b9441A897037";
                readonly blockCreated: 2411324;
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
    id: 44787;
    name: "Alfajores";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "CELO";
        readonly symbol: "A-CELO";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://alfajores-forno.celo-testnet.org"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees: import("../../index.js").ChainFees<{
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcBlock, action?: string | undefined) => import("../index.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcTransaction, action?: string | undefined) => import("../index.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloTransactionRequest, action?: string | undefined) => import("../index.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
        };
    }>;
    formatters: {
        readonly block: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcBlock, action?: string | undefined) => import("../index.js").CeloBlock;
            type: "block";
        };
        readonly transaction: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloRpcTransaction, action?: string | undefined) => import("../index.js").CeloTransaction;
            type: "transaction";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: import("../index.js").CeloTransactionRequest, action?: string | undefined) => import("../index.js").CeloRpcTransactionRequest;
            type: "transactionRequest";
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
        readonly transaction: typeof import("../index.js").serializeTransactionCelo;
    };
    verifyHash?: ((client: import("../../index.js").Client, parameters: import("../../index.js").VerifyHashActionParameters) => Promise<import("../../index.js").VerifyHashActionReturnType>) | undefined;
};
//# sourceMappingURL=celoAlfajores.d.ts.map