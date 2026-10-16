export declare const snaxTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Snax Explorer";
            readonly url: "https://testnet-explorer.snaxchain.io";
            readonly apiUrl: "https://testnet-explorer.snaxchain.io/api";
        };
    };
    blockTime: 2000;
    contracts: {
        readonly disputeGameFactory: {
            readonly 11155111: {
                readonly address: "0x206a75d89d45F146C54020F132FF93bEDD09f55E";
            };
        };
        readonly l2OutputOracle: {
            readonly 11155111: {
                readonly address: "0x60e3A368a4cdCEf85ffB964e372726F56A46221e";
            };
        };
        readonly multicall3: {
            readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
        };
        readonly portal: {
            readonly 11155111: {
                readonly address: "0xb5afdd0E8dDF081Ef90e8A3e0c7b5798e66E954E";
            };
        };
        readonly l1StandardBridge: {
            readonly 11155111: {
                readonly address: "0xbd37E1a59D4C00C9A46F75018dffd84061bC5f74";
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
    id: 13001;
    name: "SnaxChain Testnet";
    nativeCurrency: {
        readonly name: "Sepolia Ether";
        readonly symbol: "ETH";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://testnet.snaxchain.io"];
        };
    };
    sourceId: 11155111;
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
    readonly network: "snaxchain-testnet";
};
//# sourceMappingURL=snaxTestnet.d.ts.map