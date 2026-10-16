export declare const celoSepolia: {
    blockExplorers: {
        readonly default: {
            readonly name: "Celo Sepolia Explorer";
            readonly url: "https://celo-sepolia.blockscout.com/";
            readonly apiUrl: "https://celo-sepolia.blockscout.com/api";
        };
    };
    blockTime: 1000;
    contracts: {
        readonly multicall3: {
            readonly address: "0xcA11bde05977b3631167028862bE2a173976CA11";
            readonly blockCreated: 1;
        };
        readonly portal: {
            readonly 11155111: {
                readonly address: "0x44ae3d41a335a7d05eb533029917aad35662dcc2";
                readonly blockCreated: 8825790;
            };
        };
        readonly disputeGameFactory: {
            readonly 11155111: {
                readonly address: "0x57c45d82d1a995f1e135b8d7edc0a6bb5211cfaa";
                readonly blockCreated: 8825790;
            };
        };
        readonly l1StandardBridge: {
            readonly 11155111: {
                readonly address: "0xec18a3c30131a0db4246e785355fbc16e2eaf408";
                readonly blockCreated: 8825790;
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
    id: 11142220;
    name: "Celo Sepolia Testnet";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "CELO";
        readonly symbol: "S-CELO";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://forno.celo-sepolia.celo-testnet.org"];
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
//# sourceMappingURL=celoSepolia.d.ts.map