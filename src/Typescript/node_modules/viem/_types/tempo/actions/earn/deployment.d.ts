import type { Address } from 'abitype';
import { Hex } from 'ox';
import type { Account } from '../../../accounts/types.js';
import { type WriteContractReturnType, writeContract } from '../../../actions/wallet/writeContract.js';
import { writeContractSync } from '../../../actions/wallet/writeContractSync.js';
import type { Client } from '../../../clients/createClient.js';
import type { Transport } from '../../../clients/transports/createTransport.js';
import { BaseError, type BaseErrorType } from '../../../errors/base.js';
import type { Chain } from '../../../types/chain.js';
import type { GetEventArgs } from '../../../types/contract.js';
import type { Log } from '../../../types/log.js';
import type { Compute } from '../../../types/utils.js';
import * as Abis from '../../Abis.js';
import type * as Errors from '../../errors.js';
import type { WriteParameters, WriteSyncParameters } from '../../internal/types.js';
import type { TransactionReceipt } from '../../Transaction.js';
/** @experimental Factory addresses for one reviewed Tempo Earn release. */
export type EarnFactoryAddresses = {
    /** `ERC4626EngineFactory` address. */
    erc4626Engine: Address;
    /** `EarnFactory` address from the same release. */
    earn: Address;
};
/** @experimental Deployment-fixed engine migration policy. */
export type EngineMigrationMode = 'operatorEnabled' | 'userOnly';
/** @experimental Initial controls for an Earn vault. */
export type EarnVaultControls = {
    /** Request-cancellation liveness seat. @default zero address */
    asyncJanitor?: Address | undefined;
    /** Fast pause-only seat. @default zero address */
    emergencyGuardian?: Address | undefined;
    /** Maximum actively managed assets. Zero means unlimited. @default 0 */
    maxManagedAssets?: bigint | undefined;
    /** Whole-pool migration policy. @default 'userOnly' */
    migrationMode?: EngineMigrationMode | undefined;
};
/** @experimental Optional protected fee-distributor configuration. */
export type EarnDistributorConfiguration = {
    /**
     * Distributor address. The first entry in `fees.fixedFees` is its protected
     * fee.
     */
    distributor: Address;
    /** Delay before a distributor fee update can execute, in seconds. */
    updateDelay: number;
};
/** @experimental Initial Earn fee configuration. Omit to deploy fee-free. */
export type EarnFeeConfiguration = {
    /** Optional fee on returns above an annual target. */
    excess?: {
        /** Fee recipient. */
        account: Address;
        /** Annual target rate in basis points. */
        annualTargetRateBps: number;
        /** Rate charged above the target in basis points. */
        rateBps: number;
    } | undefined;
    /**
     * Fixed fee recipients and rates, limited to four entries. When a
     * distributor is enabled, the first entry is its protected fee and the
     * remaining entries are operator-controlled.
     */
    fixedFees?: readonly {
        /** Fee recipient. */
        account: Address;
        /** Fee rate in basis points. */
        rateBps: number;
    }[] | undefined;
};
/**
 * Deploys a deterministic ERC-4626 Earn engine.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.earn.createErc4626Engine(client, {
 *   deploymentId: '0x...',
 *   factory: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function createErc4626Engine<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: createErc4626Engine.Parameters<chain, account>): Promise<createErc4626Engine.ReturnValue>;
export declare namespace createErc4626Engine {
    type Args = {
        /** Stable deterministic deployment identifier. */
        deploymentId: Hex.Hex;
        /** Reviewed `ERC4626EngineFactory` address. */
        factory: Address;
        /** Optional engine name override. Empty derives the venue name. */
        name?: string | undefined;
        /** Final engine owner. */
        owner: Address;
        /** Optional engine symbol override. Empty derives the venue symbol. */
        symbol?: string | undefined;
        /** ERC-4626 venue address. */
        venue: Address;
    };
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = Omit<WriteParameters<chain, account>, 'owner'> & Omit<Args, 'owner'> & {
        /** Final engine owner. @default `account.address` */
        owner?: Account | Address | undefined;
    };
    type ReturnValue = WriteContractReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal */
    function inner<action extends typeof writeContract | typeof writeContractSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a call to `ERC4626EngineFactory.deploy`.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.createErc4626Engine.call({
     *     deploymentId: '0x...',
     *     factory: '0x...',
     *     owner: '0x...',
     *     venue: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "deploy";
            readonly inputs: readonly [{
                readonly name: "deploymentId";
                readonly type: "bytes32";
            }, {
                readonly name: "vault";
                readonly type: "address";
            }, {
                readonly name: "owner";
                readonly type: "address";
            }, {
                readonly name: "nameOverride";
                readonly type: "string";
            }, {
                readonly name: "symbolOverride";
                readonly type: "string";
            }];
            readonly outputs: readonly [{
                readonly name: "engine";
                readonly type: "address";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "deploy";
    } & {
        args: readonly [`0x${string}`, vault: `0x${string}`, owner: `0x${string}`, string, string];
    } & {
        address: Address;
    } & {
        data: import("../../../index.js").Hex;
        to: Address;
    };
    /**
     * Predicts the deterministic engine address.
     *
     * @param client - Client.
     * @param args - Engine deployment arguments.
     * @returns The predicted engine address.
     */
    function predict<chain extends Chain | undefined>(client: Client<Transport, chain>, args: Args): Promise<`0x${string}`>;
    /**
     * Extracts the `ERC4626EngineDeployed` event from factory logs.
     *
     * @param logs - The logs.
     * @param parameters - Factory address used to filter the logs.
     * @returns The deployment event.
     */
    function extractEvent(logs: Log[], parameters: {
        factory: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "function";
        readonly name: "ENGINE_SALT_DOMAIN";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "computeEngineSalt";
        readonly inputs: readonly [{
            readonly name: "deploymentId";
            readonly type: "bytes32";
        }, {
            readonly name: "vault";
            readonly type: "address";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "nameOverride";
            readonly type: "string";
        }, {
            readonly name: "symbolOverride";
            readonly type: "string";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
    }, {
        readonly type: "function";
        readonly name: "deploy";
        readonly inputs: readonly [{
            readonly name: "deploymentId";
            readonly type: "bytes32";
        }, {
            readonly name: "vault";
            readonly type: "address";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "nameOverride";
            readonly type: "string";
        }, {
            readonly name: "symbolOverride";
            readonly type: "string";
        }];
        readonly outputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "predictEngine";
        readonly inputs: readonly [{
            readonly name: "deploymentId";
            readonly type: "bytes32";
        }, {
            readonly name: "vault";
            readonly type: "address";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "nameOverride";
            readonly type: "string";
        }, {
            readonly name: "symbolOverride";
            readonly type: "string";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "event";
        readonly name: "ERC4626EngineDeployed";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "vault";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "owner";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "deploymentId";
            readonly type: "bytes32";
            readonly indexed: false;
        }, {
            readonly name: "engineSalt";
            readonly type: "bytes32";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "EmptyDeploymentId";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineAlreadyExists";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "FactoryCannotBeFinalOwner";
        readonly inputs: readonly [];
    }], "ERC4626EngineDeployed">;
}
/**
 * Deploys an ERC-4626 engine and waits for confirmation.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const result = await Actions.earn.createErc4626EngineSync(client, {
 *   deploymentId: '0x...',
 *   factory: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The receipt and deployed engine metadata.
 */
export declare function createErc4626EngineSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: createErc4626EngineSync.Parameters<chain, account>): Promise<createErc4626EngineSync.ReturnValue>;
export declare namespace createErc4626EngineSync {
    type Args = createErc4626Engine.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = createErc4626Engine.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<GetEventArgs<typeof Abis.erc4626EngineFactory, 'ERC4626EngineDeployed', {
        IndexedOnly: false;
        Required: true;
    }> & {
        receipt: TransactionReceipt;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Creates an EarnShare, EarnVault, and EarnFees stack around an unbound engine.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const hash = await Actions.earn.createStack(client, {
 *   deploymentId: '0x...',
 *   engine: '0x...',
 *   factory: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function createStack<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: createStack.Parameters<chain, account>): Promise<createStack.ReturnValue>;
export declare namespace createStack {
    type Args = {
        /** Initial Earn vault controls. */
        controls?: EarnVaultControls | undefined;
        /** Stable deterministic deployment identifier. */
        deploymentId: Hex.Hex;
        /** Optional protected fee distributor. */
        distributor?: EarnDistributorConfiguration | undefined;
        /** Engine address. */
        engine: Address;
        /** Reviewed `EarnFactory` address. */
        factory: Address;
        /** Initial fee configuration. Omit for fee-free deployment. */
        fees?: EarnFeeConfiguration | undefined;
        /** Final stack owner and operator. */
        owner: Address;
        /** Existing simple whitelist policy. Zero selects always-allow. @default 0 */
        transferPolicyId?: bigint | undefined;
    };
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = Omit<WriteParameters<chain, account>, 'owner'> & Omit<Args, 'owner'> & {
        /** Final stack owner and operator. @default `account.address` */
        owner?: Account | Address | undefined;
    };
    type ReturnValue = WriteContractReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal */
    function inner<action extends typeof writeContract | typeof writeContractSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a call to `EarnFactory.deploy`.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.createStack.call({
     *     deploymentId: '0x...',
     *     engine: '0x...',
     *     factory: '0x...',
     *     owner: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "deploy";
            readonly inputs: readonly [{
                readonly name: "params";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "deploymentId";
                    readonly type: "bytes32";
                }, {
                    readonly name: "engine";
                    readonly type: "address";
                }, {
                    readonly name: "owner";
                    readonly type: "address";
                }, {
                    readonly name: "controls";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "emergencyGuardian";
                        readonly type: "address";
                    }, {
                        readonly name: "asyncJanitor";
                        readonly type: "address";
                    }, {
                        readonly name: "maxManagedAssets";
                        readonly type: "uint256";
                    }, {
                        readonly name: "migrationMode";
                        readonly type: "uint8";
                    }];
                }, {
                    readonly name: "distributorConfig";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "distributor";
                        readonly type: "address";
                    }, {
                        readonly name: "updateDelay";
                        readonly type: "uint40";
                    }];
                }, {
                    readonly name: "fees";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "fixedFeeCount";
                        readonly type: "uint8";
                    }, {
                        readonly name: "fixedFees";
                        readonly type: "tuple[4]";
                        readonly components: readonly [{
                            readonly name: "account";
                            readonly type: "address";
                        }, {
                            readonly name: "rateBps";
                            readonly type: "uint16";
                        }];
                    }, {
                        readonly name: "excess";
                        readonly type: "tuple";
                        readonly components: readonly [{
                            readonly name: "enabled";
                            readonly type: "bool";
                        }, {
                            readonly name: "account";
                            readonly type: "address";
                        }, {
                            readonly name: "annualTargetRateBps";
                            readonly type: "uint16";
                        }, {
                            readonly name: "excessFeeRateBps";
                            readonly type: "uint16";
                        }];
                    }];
                }, {
                    readonly name: "transferPolicyId";
                    readonly type: "uint64";
                }];
            }];
            readonly outputs: readonly [{
                readonly name: "earnShare";
                readonly type: "address";
            }, {
                readonly name: "earnVault";
                readonly type: "address";
            }, {
                readonly name: "earnFees";
                readonly type: "address";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "deploy";
    } & {
        args: readonly [params: {
            deploymentId: `0x${string}`;
            engine: `0x${string}`;
            owner: `0x${string}`;
            controls: {
                emergencyGuardian: `0x${string}`;
                asyncJanitor: `0x${string}`;
                maxManagedAssets: bigint;
                migrationMode: number;
            };
            distributorConfig: {
                distributor: `0x${string}`;
                updateDelay: number;
            };
            fees: {
                fixedFeeCount: number;
                fixedFees: readonly [{
                    account: `0x${string}`;
                    rateBps: number;
                }, {
                    account: `0x${string}`;
                    rateBps: number;
                }, {
                    account: `0x${string}`;
                    rateBps: number;
                }, {
                    account: `0x${string}`;
                    rateBps: number;
                }];
                excess: {
                    enabled: boolean;
                    account: `0x${string}`;
                    annualTargetRateBps: number;
                    excessFeeRateBps: number;
                };
            };
            transferPolicyId: bigint;
        }];
    } & {
        address: Address;
    } & {
        data: import("../../../index.js").Hex;
        to: Address;
    };
    /**
     * Predicts the deterministic EarnShare and EarnFees addresses.
     *
     * @param client - Client.
     * @param args - Stack deployment arguments.
     * @returns The predicted EarnShare and EarnFees addresses.
     */
    function predict<chain extends Chain | undefined>(client: Client<Transport, chain>, args: Args): Promise<{
        earnFees: `0x${string}`;
        earnShare: `0x${string}`;
    }>;
    /**
     * Extracts the `EarnStackDeployed` event from factory logs.
     *
     * @param logs - The logs.
     * @param parameters - Factory address used to filter the logs.
     * @returns The deployment event.
     */
    function extractEvent(logs: Log[], parameters: {
        factory: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [{
            readonly name: "tip20Factory_";
            readonly type: "address";
        }, {
            readonly name: "earnVaultImplementation_";
            readonly type: "address";
        }, {
            readonly name: "earnFeesImplementation_";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "DEFAULT_ADMIN_ROLE";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "EARN_SHARE_SALT_DOMAIN";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "FEES_SALT_DOMAIN";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "computeEarnShareSalt";
        readonly inputs: readonly [{
            readonly name: "params";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "deploymentId";
                readonly type: "bytes32";
            }, {
                readonly name: "engine";
                readonly type: "address";
            }, {
                readonly name: "owner";
                readonly type: "address";
            }, {
                readonly name: "controls";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "emergencyGuardian";
                    readonly type: "address";
                }, {
                    readonly name: "asyncJanitor";
                    readonly type: "address";
                }, {
                    readonly name: "maxManagedAssets";
                    readonly type: "uint256";
                }, {
                    readonly name: "migrationMode";
                    readonly type: "uint8";
                }];
            }, {
                readonly name: "distributorConfig";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "distributor";
                    readonly type: "address";
                }, {
                    readonly name: "updateDelay";
                    readonly type: "uint40";
                }];
            }, {
                readonly name: "fees";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "fixedFeeCount";
                    readonly type: "uint8";
                }, {
                    readonly name: "fixedFees";
                    readonly type: "tuple[4]";
                    readonly components: readonly [{
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "rateBps";
                        readonly type: "uint16";
                    }];
                }, {
                    readonly name: "excess";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "enabled";
                        readonly type: "bool";
                    }, {
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "annualTargetRateBps";
                        readonly type: "uint16";
                    }, {
                        readonly name: "excessFeeRateBps";
                        readonly type: "uint16";
                    }];
                }];
            }, {
                readonly name: "transferPolicyId";
                readonly type: "uint64";
            }];
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
    }, {
        readonly type: "function";
        readonly name: "deploy";
        readonly inputs: readonly [{
            readonly name: "params";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "deploymentId";
                readonly type: "bytes32";
            }, {
                readonly name: "engine";
                readonly type: "address";
            }, {
                readonly name: "owner";
                readonly type: "address";
            }, {
                readonly name: "controls";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "emergencyGuardian";
                    readonly type: "address";
                }, {
                    readonly name: "asyncJanitor";
                    readonly type: "address";
                }, {
                    readonly name: "maxManagedAssets";
                    readonly type: "uint256";
                }, {
                    readonly name: "migrationMode";
                    readonly type: "uint8";
                }];
            }, {
                readonly name: "distributorConfig";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "distributor";
                    readonly type: "address";
                }, {
                    readonly name: "updateDelay";
                    readonly type: "uint40";
                }];
            }, {
                readonly name: "fees";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "fixedFeeCount";
                    readonly type: "uint8";
                }, {
                    readonly name: "fixedFees";
                    readonly type: "tuple[4]";
                    readonly components: readonly [{
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "rateBps";
                        readonly type: "uint16";
                    }];
                }, {
                    readonly name: "excess";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "enabled";
                        readonly type: "bool";
                    }, {
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "annualTargetRateBps";
                        readonly type: "uint16";
                    }, {
                        readonly name: "excessFeeRateBps";
                        readonly type: "uint16";
                    }];
                }];
            }, {
                readonly name: "transferPolicyId";
                readonly type: "uint64";
            }];
        }];
        readonly outputs: readonly [{
            readonly name: "earnShare";
            readonly type: "address";
        }, {
            readonly name: "earnVault";
            readonly type: "address";
        }, {
            readonly name: "earnFees";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "earnFeesImplementation";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnVaultImplementation";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "predictEarnFees";
        readonly inputs: readonly [{
            readonly name: "params";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "deploymentId";
                readonly type: "bytes32";
            }, {
                readonly name: "engine";
                readonly type: "address";
            }, {
                readonly name: "owner";
                readonly type: "address";
            }, {
                readonly name: "controls";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "emergencyGuardian";
                    readonly type: "address";
                }, {
                    readonly name: "asyncJanitor";
                    readonly type: "address";
                }, {
                    readonly name: "maxManagedAssets";
                    readonly type: "uint256";
                }, {
                    readonly name: "migrationMode";
                    readonly type: "uint8";
                }];
            }, {
                readonly name: "distributorConfig";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "distributor";
                    readonly type: "address";
                }, {
                    readonly name: "updateDelay";
                    readonly type: "uint40";
                }];
            }, {
                readonly name: "fees";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "fixedFeeCount";
                    readonly type: "uint8";
                }, {
                    readonly name: "fixedFees";
                    readonly type: "tuple[4]";
                    readonly components: readonly [{
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "rateBps";
                        readonly type: "uint16";
                    }];
                }, {
                    readonly name: "excess";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "enabled";
                        readonly type: "bool";
                    }, {
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "annualTargetRateBps";
                        readonly type: "uint16";
                    }, {
                        readonly name: "excessFeeRateBps";
                        readonly type: "uint16";
                    }];
                }];
            }, {
                readonly name: "transferPolicyId";
                readonly type: "uint64";
            }];
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "predictEarnShare";
        readonly inputs: readonly [{
            readonly name: "params";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "deploymentId";
                readonly type: "bytes32";
            }, {
                readonly name: "engine";
                readonly type: "address";
            }, {
                readonly name: "owner";
                readonly type: "address";
            }, {
                readonly name: "controls";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "emergencyGuardian";
                    readonly type: "address";
                }, {
                    readonly name: "asyncJanitor";
                    readonly type: "address";
                }, {
                    readonly name: "maxManagedAssets";
                    readonly type: "uint256";
                }, {
                    readonly name: "migrationMode";
                    readonly type: "uint8";
                }];
            }, {
                readonly name: "distributorConfig";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "distributor";
                    readonly type: "address";
                }, {
                    readonly name: "updateDelay";
                    readonly type: "uint40";
                }];
            }, {
                readonly name: "fees";
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly name: "fixedFeeCount";
                    readonly type: "uint8";
                }, {
                    readonly name: "fixedFees";
                    readonly type: "tuple[4]";
                    readonly components: readonly [{
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "rateBps";
                        readonly type: "uint16";
                    }];
                }, {
                    readonly name: "excess";
                    readonly type: "tuple";
                    readonly components: readonly [{
                        readonly name: "enabled";
                        readonly type: "bool";
                    }, {
                        readonly name: "account";
                        readonly type: "address";
                    }, {
                        readonly name: "annualTargetRateBps";
                        readonly type: "uint16";
                    }, {
                        readonly name: "excessFeeRateBps";
                        readonly type: "uint16";
                    }];
                }];
            }, {
                readonly name: "transferPolicyId";
                readonly type: "uint64";
            }];
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "tip20Factory";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "event";
        readonly name: "EarnStackDeployed";
        readonly inputs: readonly [{
            readonly name: "earnVault";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShare";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnFees";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "owner";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "deploymentId";
            readonly type: "bytes32";
            readonly indexed: false;
        }, {
            readonly name: "emergencyGuardian";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "asyncJanitor";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "maxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "migrationMode";
            readonly type: "uint8";
            readonly indexed: false;
        }, {
            readonly name: "transferPolicyId";
            readonly type: "uint64";
            readonly indexed: false;
        }, {
            readonly name: "earnShareSalt";
            readonly type: "bytes32";
            readonly indexed: false;
        }, {
            readonly name: "controlConfigHash";
            readonly type: "bytes32";
            readonly indexed: false;
        }, {
            readonly name: "feeConfigHash";
            readonly type: "bytes32";
            readonly indexed: false;
        }, {
            readonly name: "earnFeesSalt";
            readonly type: "bytes32";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "AdminRelinquishmentFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EarnShareAlreadyExists";
        readonly inputs: readonly [{
            readonly name: "earnShare";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "EarnShareSupplyNotZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EmptyDeploymentId";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EmptyEarnShareMetadata";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineAlreadyBound";
        readonly inputs: readonly [{
            readonly name: "earnVault";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "FactoryCannotBeFinalOwner";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FailedDeployment";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InsufficientBalance";
        readonly inputs: readonly [{
            readonly name: "balance";
            readonly type: "uint256";
        }, {
            readonly name: "needed";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorConfig";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnFeesImplementation";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnVaultImplementation";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidTransferPolicy";
        readonly inputs: readonly [{
            readonly name: "policyId";
            readonly type: "uint64";
        }];
    }, {
        readonly type: "error";
        readonly name: "IssuerGrantFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TransferPolicyMismatch";
        readonly inputs: readonly [{
            readonly name: "expected";
            readonly type: "uint64";
        }, {
            readonly name: "actual";
            readonly type: "uint64";
        }];
    }, {
        readonly type: "error";
        readonly name: "UnsupportedTransferPolicy";
        readonly inputs: readonly [{
            readonly name: "policyId";
            readonly type: "uint64";
        }, {
            readonly name: "policyType";
            readonly type: "uint8";
        }];
    }, {
        readonly type: "error";
        readonly name: "ZeroAddress";
        readonly inputs: readonly [];
    }], "EarnStackDeployed">;
}
/**
 * Creates an Earn core stack and waits for confirmation.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const result = await Actions.earn.createStackSync(client, {
 *   deploymentId: '0x...',
 *   engine: '0x...',
 *   factory: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The receipt and deployed stack addresses.
 */
export declare function createStackSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: createStackSync.Parameters<chain, account>): Promise<createStackSync.ReturnValue>;
export declare namespace createStackSync {
    type Args = createStack.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = createStack.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<GetEventArgs<typeof Abis.earnFactory, 'EarnStackDeployed', {
        IndexedOnly: false;
        Required: true;
    }> & {
        receipt: TransactionReceipt;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Permanently binds an engine to its EarnVault.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const hash = await Actions.earn.bindEngine(client, {
 *   engine: '0x...',
 *   finalOwner: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client controlled by the final engine owner.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function bindEngine<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: bindEngine.Parameters<chain, account>): Promise<bindEngine.ReturnValue>;
export declare namespace bindEngine {
    type Args = {
        /** Engine address. */
        engine: Address;
        /** Address that will own the initialized engine. Omit to retain the current owner. */
        finalOwner?: Address | undefined;
        /** Factory-created EarnVault address. */
        vault: Address;
    };
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = WriteContractReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal */
    function inner<action extends typeof writeContract | typeof writeContractSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a call to `initializeEarnVault` on an Earn engine.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.bindEngine.call({
     *     engine: '0x...',
     *     finalOwner: '0x...',
     *     vault: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "initializeEarnVault";
            readonly inputs: readonly [{
                readonly name: "earnVault_";
                readonly type: "address";
            }, {
                readonly name: "finalOwner_";
                readonly type: "address";
            }];
            readonly outputs: readonly [];
            readonly stateMutability: "nonpayable";
        } | {
            readonly type: "function";
            readonly name: "initializeEarnVault";
            readonly inputs: readonly [{
                readonly name: "earnVault_";
                readonly type: "address";
            }];
            readonly outputs: readonly [];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "initializeEarnVault";
    } & {
        args: readonly [`0x${string}`, `0x${string}`] | readonly [`0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../../index.js").Hex;
        to: Address;
    };
    /**
     * Extracts the `EarnVaultInitialized` event from engine logs.
     *
     * @param logs - The logs.
     * @param parameters - Engine address used to filter the logs.
     * @returns The initialization event.
     */
    function extractEvent(logs: Log[], parameters: {
        engine: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "function";
        readonly name: "initializeEarnVault";
        readonly inputs: readonly [{
            readonly name: "earnVault_";
            readonly type: "address";
        }, {
            readonly name: "finalOwner_";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "initializeEarnVault";
        readonly inputs: readonly [{
            readonly name: "earnVault_";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "EarnVaultInitialized";
        readonly inputs: readonly [{
            readonly name: "earnVault";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }], "EarnVaultInitialized">;
}
/**
 * Binds an engine and waits for confirmation.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const result = await Actions.earn.bindEngineSync(client, {
 *   engine: '0x...',
 *   finalOwner: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client controlled by the final engine owner.
 * @param parameters - Parameters.
 * @returns The receipt and bound addresses.
 */
export declare function bindEngineSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: bindEngineSync.Parameters<chain, account>): Promise<bindEngineSync.ReturnValue>;
export declare namespace bindEngineSync {
    type Args = bindEngine.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = bindEngine.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = {
        /** Engine address. */
        engine: Address;
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Bound EarnVault address. */
        vault: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
export type DeployErc4626StackErrorType = DeployErc4626StackError & {
    name: 'DeployErc4626StackError';
};
/**
 * Error thrown after a partially completed Earn stack deployment.
 *
 * @experimental
 */
export declare class DeployErc4626StackError extends BaseError {
    receipts: deployErc4626StackSync.Receipts;
    stage: deployErc4626StackSync.Stage;
    state: deployErc4626StackSync.State;
    constructor(cause: Error, parameters: {
        receipts: deployErc4626StackSync.Receipts;
        stage: deployErc4626StackSync.Stage;
        state: deployErc4626StackSync.State;
    });
}
/**
 * Deploys and binds a complete ERC-4626 Earn stack through sequential,
 * resumable transactions.
 *
 * @experimental
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const result = await Actions.earn.deployErc4626StackSync(client, {
 *   deploymentId: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The deployed addresses and receipts created by this run.
 */
export declare function deployErc4626StackSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: deployErc4626StackSync.Parameters<chain, account>): Promise<deployErc4626StackSync.ReturnValue>;
export declare namespace deployErc4626StackSync {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = Omit<WriteParameters<chain, account>, 'gas' | 'keyAuthorization' | 'nonce' | 'owner' | 'throwOnReceiptRevert'> & WriteSyncParameters<chain, account> & {
        /** Account used only for the final owner binding. */
        bindingAccount?: Account | Address | undefined;
        /** Initial Earn vault controls. */
        controls?: EarnVaultControls | undefined;
        /** Stable deterministic deployment identifier. */
        deploymentId: Hex.Hex;
        /** Optional protected fee distributor. */
        distributor?: EarnDistributorConfiguration | undefined;
        /** Reviewed factory pair from one Earn release. @default `client.chain.contracts` */
        factories?: EarnFactoryAddresses | undefined;
        /** Initial fee configuration. Omit for fee-free deployment. */
        fees?: EarnFeeConfiguration | undefined;
        /** First block to search for a prior factory deployment event. */
        fromBlock?: bigint | undefined;
        /** Optional engine name override. */
        name?: string | undefined;
        /** Final stack owner and operator. @default `account.address` */
        owner?: Account | Address | undefined;
        /** Previously persisted deployment state. */
        resume?: State | undefined;
        /** Optional engine symbol override. */
        symbol?: string | undefined;
        /** Existing simple whitelist policy. Zero selects always-allow. */
        transferPolicyId?: bigint | undefined;
        /** ERC-4626 venue address. */
        venue: Address;
    };
    type Stage = 'binding' | 'engine' | 'stack';
    type State = {
        deploymentId: Hex.Hex;
        earnShare?: Address | undefined;
        engine: Address;
        fees?: Address | undefined;
        vault?: Address | undefined;
    };
    type Receipts = {
        binding?: TransactionReceipt | undefined;
        engine?: TransactionReceipt | undefined;
        stack?: TransactionReceipt | undefined;
    };
    type ReturnValue = {
        deploymentId: Hex.Hex;
        earnShare: Address;
        engine: Address;
        fees: Address;
        receipts: Receipts;
        vault: Address;
    };
    type ErrorType = DeployErc4626StackErrorType | BaseErrorType;
}
//# sourceMappingURL=deployment.d.ts.map