import type { Address } from 'abitype';
import { Hex } from 'ox';
import { TokenId } from 'ox/tempo';
import type { Account } from '../../accounts/types.js';
import { type GetLogsErrorType } from '../../actions/public/getLogs.js';
import { type ReadContractReturnType } from '../../actions/public/readContract.js';
import { type SimulateContractReturnType } from '../../actions/public/simulateContract.js';
import * as internal_Token from '../../actions/token/internal.js';
import { type SendTransactionReturnType, sendTransaction } from '../../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../../actions/wallet/sendTransactionSync.js';
import type { Client } from '../../clients/createClient.js';
import type { Transport } from '../../clients/transports/createTransport.js';
import type { BaseErrorType } from '../../errors/base.js';
import type { Chain } from '../../types/chain.js';
import type { Log } from '../../types/log.js';
import type { Compute, OneOf } from '../../types/utils.js';
import { type ObserveErrorType } from '../../utils/observe.js';
import { type PollErrorType } from '../../utils/poll.js';
import * as Abis from '../Abis.js';
import type * as Errors from '../errors.js';
import { type GetVaultEngineChangedErrorType, type WaitForPrivateDepositTimeoutErrorType, type WaitForPrivateRedeemTimeoutErrorType } from '../errors.js';
import type { GetAccountParameter, ReadParameters, WriteParameters, WriteSyncParameters } from '../internal/types.js';
import { type CallParameters } from '../internal/utils.js';
import type { TransactionReceipt } from '../Transaction.js';
import * as zoneActions from './zone.js';
export * from './earn/deployment.js';
/** TIP-403 policy ID that allows every sender, recipient, and mint recipient. */
export declare const alwaysAllowPolicyId = 1n;
/** Admission-only TIP-403 policy attached to an Earn share token. */
export type ExitSafePolicy = {
    /** Compound policy attached to the Earn share token. */
    transferPolicyId: bigint;
    /** Sender policy. Must be {@link alwaysAllowPolicyId} so holders can exit. */
    senderPolicyId: bigint;
    /** Recipient eligibility policy. */
    recipientPolicyId: bigint;
    /** Mint-recipient eligibility policy. Must match `recipientPolicyId`. */
    mintRecipientPolicyId: bigint;
};
/** Receipts produced while configuring an exit-safe Earn policy. */
export type ExitSafePolicyReceipts = {
    /** Whitelist policy creation receipt. */
    eligibilityPolicy: TransactionReceipt;
    /** Compound policy creation receipt. */
    compoundPolicy: TransactionReceipt;
    /** Earn share token policy update receipt. */
    tokenPolicy: TransactionReceipt;
    /** Eligibility policy admin transfer receipt, when an administrator is provided. */
    policyAdmin?: TransactionReceipt | undefined;
};
/**
 * Creates and attaches an admission-only TIP-403 policy to an Earn share
 * token. Existing holders remain able to send shares while recipients and mint
 * recipients must belong to the same whitelist.
 *
 * The action submits three or four sequential transactions and is not atomic.
 * Use {@link validateExitSafePolicy} to verify the final state.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const account = privateKeyToAccount('0x...')
 * const client = createClient({
 *   account,
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { policy, receipts } =
 *   await Actions.earn.configureExitSafePolicy(client, {
 *     accessAdministrator: '0x...',
 *     initialMembers: ['0x...', '0x...'],
 *     shareToken: '0x...',
 *   })
 * ```
 *
 * @param client - Client authorized to change the Earn share token policy.
 * @param parameters - Share token, administrator, and initial members.
 * @returns The configured policy IDs and transaction receipts.
 */
export declare function configureExitSafePolicy<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: configureExitSafePolicy.Parameters<account>): Promise<configureExitSafePolicy.ReturnValue>;
export declare namespace configureExitSafePolicy {
    type Args = {
        /** Address that will administer recipient eligibility. */
        accessAdministrator: Address;
        /** Addresses initially eligible to receive or be minted Earn shares. */
        initialMembers: readonly Address[];
        /** Earn share token. */
        shareToken: Address;
    };
    type Parameters<account extends Account | undefined = Account | undefined> = GetAccountParameter<account> & Args;
    type ReturnValue = Compute<{
        /** Configured onchain policy IDs. */
        policy: ExitSafePolicy;
        /** Receipts for each configuration transaction. */
        receipts: ExitSafePolicyReceipts;
    }>;
    type ErrorType = BaseErrorType;
}
/**
 * Verifies that an Earn share token uses the expected exit-safe TIP-403
 * policy and that every required member can receive transfers and mints.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * await Actions.earn.validateExitSafePolicy(client, {
 *   accessAdministrator: '0x...',
 *   policy: {
 *     transferPolicyId: 3n,
 *     senderPolicyId: 1n,
 *     recipientPolicyId: 2n,
 *     mintRecipientPolicyId: 2n,
 *   },
 *   requiredMembers: ['0x...', '0x...'],
 *   shareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Expected policy, administrator, and required members.
 * @returns Nothing when the policy is valid.
 */
export declare function validateExitSafePolicy<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: validateExitSafePolicy.Parameters): Promise<validateExitSafePolicy.ReturnValue>;
export declare namespace validateExitSafePolicy {
    type Args = {
        /** Expected eligibility policy administrator. */
        accessAdministrator: Address;
        /** Expected exit-safe policy IDs. */
        policy: ExitSafePolicy;
        /** Addresses that must be eligible to receive or be minted Earn shares. */
        requiredMembers: readonly Address[];
        /** Earn share token. */
        shareToken: Address;
    };
    type Parameters = Omit<ReadParameters, 'account'> & Args;
    type ReturnValue = void;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Deposits assets into a vault and mints Earn shares to `recipient`. The
 * transaction includes the required asset approval.
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
 * const hash = await Actions.earn.deposit(client, {
 *   assetAmount: 100_000_000n,
 *   shareAmount: 99_900_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function deposit<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: deposit.Parameters<chain, account>): Promise<deposit.ReturnValue>;
export declare namespace deposit {
    type Args = {
        /** Assets to deposit; base units or `{ formatted, decimals? }` (asset decimals). */
        assetAmount: internal_Token.AmountInput;
        /** Earn share recipient. @default `account.address` */
        recipient?: Address | undefined;
        /** Vault address. */
        vault: Address;
    } & OneOf<{
        /** Minimum Earn share output to accept; must be greater than zero. */
        shareAmountMin: bigint;
    } | {
        /** Quoted Earn share output; floored by `slippageBps`. */
        shareAmount: bigint;
        /** Slippage tolerance in basis points under `shareAmount` (50 = 0.5%). */
        slippageBps: number;
    }>;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal Shared dispatch; reads the asset for the approval. */
    function inner<action extends typeof sendTransaction | typeof sendTransactionSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: deposit.Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a deposit call without an approval. Provide token decimals for
     * formatted inputs and an explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call<chain extends Chain | undefined>(...parameters: CallParameters<call.Args, Client<Transport, chain>>): {
        abi: [{
            readonly type: "function";
            readonly name: "deposit";
            readonly inputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "deposit";
    } & {
        args: readonly [assets: bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    namespace call {
        type Args = {
            /** Assets to deposit; base units or `{ formatted, decimals? }` (asset decimals). */
            assetAmount: internal_Token.AmountInput;
            /** Earn share recipient. */
            recipient: Address;
            /** Vault address. */
            vault: Address;
        } & OneOf<{
            /** Minimum Earn share output to accept. */
            shareAmountMin: bigint;
        } | {
            /** Quoted Earn share output; floored by `slippageBps`. */
            shareAmount: bigint;
            /** Slippage tolerance in basis points under `shareAmount` (50 = 0.5%). */
            slippageBps: number;
        }>;
    }
    /**
     * Defines the asset approval and deposit calls for atomic execution. Pass
     * `assetToken` and token decimals explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: call.Args & {
        /** Asset token approved for the deposit. */
        assetToken: TokenId.TokenIdOrAddress;
    }): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly type: "function";
            readonly name: "deposit";
            readonly inputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "deposit";
    } & {
        args: readonly [assets: bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
    /**
     * Extracts a `Deposited` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `Deposited` event.
     */
    function extractEvent(logs: Log[], parameters: {
        vault: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "MAX_REWARD_RATE_MULTIPLIER";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "absorbEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "accrueFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeAssets";
            readonly type: "uint256";
        }, {
            readonly name: "feeEarnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "anchorEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "anchorEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asset";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asyncJanitor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelOperatorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "minReceiverEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "contribute";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "convertEngineSharesToEarnShares";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "convertToEngineShares";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "deposit";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositVenueShares";
        readonly inputs: readonly [{
            readonly name: "venueShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositsPaused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "disableFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "distributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorFee";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorUpdateDelay";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint40";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnShare";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "emergencyGuardian";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engine";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineMigrationMode";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "executeDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeConfigId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "finalizeRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "asset_";
            readonly type: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "initialize";
        readonly inputs: readonly [{
            readonly name: "engine_";
            readonly type: "address";
        }, {
            readonly name: "earnShare_";
            readonly type: "address";
        }, {
            readonly name: "earnFees_";
            readonly type: "address";
        }, {
            readonly name: "operator_";
            readonly type: "address";
        }, {
            readonly name: "controlInit_";
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
            readonly name: "distributorInit_";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "distributor";
                readonly type: "address";
            }, {
                readonly name: "updateDelay";
                readonly type: "uint40";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "isAccountingAligned";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isFeeValuationFresh";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxManagedAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "migrateEngine";
        readonly inputs: readonly [{
            readonly name: "newEngine";
            readonly type: "address";
        }, {
            readonly name: "minNewEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "minAssetsRetained";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "newEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "normalizedRewardRate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "openRedeemRequestCount";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "operator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "recipient";
                readonly type: "address";
            }, {
                readonly name: "rateBps";
                readonly type: "uint16";
            }, {
                readonly name: "executableAt";
                readonly type: "uint40";
            }, {
                readonly name: "pending";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "requester";
                readonly type: "address";
            }, {
                readonly name: "burnedEarnShares";
                readonly type: "uint256";
            }, {
                readonly name: "engineShares";
                readonly type: "uint256";
            }, {
                readonly name: "open";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewWithdraw";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "rawEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "redeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "remainingDepositCapacity";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "requestRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "engineData";
            readonly type: "bytes";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "rewardRateBaseline";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "scheduleDistributorFeeUpdate";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setDepositsPaused";
        readonly inputs: readonly [{
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setEmergencyRoles";
        readonly inputs: readonly [{
            readonly name: "newGuardian";
            readonly type: "address";
        }, {
            readonly name: "newJanitor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setFeeConfig";
        readonly inputs: readonly [{
            readonly name: "config";
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
        }];
        readonly outputs: readonly [{
            readonly name: "configId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxManagedAssets";
        readonly inputs: readonly [{
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "surplusEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "transferDistributor";
        readonly inputs: readonly [{
            readonly name: "newDistributor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "transferOperator";
        readonly inputs: readonly [{
            readonly name: "newOperator";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "withdrawExact";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "maxEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "Contributed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DepositPauseChanged";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "paused";
            readonly type: "bool";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Deposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateScheduled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "executableAt";
            readonly type: "uint40";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdated";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "feeConfigId";
            readonly type: "uint64";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousDistributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EarnVaultInitialized";
        readonly inputs: readonly [{
            readonly name: "engine";
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
            readonly name: "operator";
            readonly type: "address";
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
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorUpdateDelay";
            readonly type: "uint40";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRecipient";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EmergencyRolesChanged";
        readonly inputs: readonly [{
            readonly name: "emergencyGuardian";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "asyncJanitor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineMigrated";
        readonly inputs: readonly [{
            readonly name: "oldEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "oldEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assetsMoved";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareShortfallReconciled";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "previousManagedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "observedRawEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "shortfallEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareSurplusAbsorbed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxManagedAssetsChanged";
        readonly inputs: readonly [{
            readonly name: "previousMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousOperator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemCancelled";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemFinalized";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemRequested";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "requester";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Redeemed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "VenueSharesDeposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "requestedVenueShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "WithdrewExact";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "ActiveSupplyWithoutBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "AlreadyInitialized";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DepositsPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotReady";
        readonly inputs: readonly [{
            readonly name: "executableAt";
            readonly type: "uint40";
        }];
    }, {
        readonly type: "error";
        readonly name: "DistributorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DuplicateRequest";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineAssetMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineCapabilityUnsupported";
        readonly inputs: readonly [{
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineEarnVaultMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineExitUnsupported";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExceedsMaxEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveConversionLoss";
        readonly inputs: readonly [{
            readonly name: "inputShares";
            readonly type: "uint256";
        }, {
            readonly name: "representedShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveMigrationClassificationError";
        readonly inputs: readonly [{
            readonly name: "expectedManagedAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualManagedAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "FeeValuationStale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FinalizedAssetMismatch";
        readonly inputs: readonly [{
            readonly name: "finalizedAsset";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "GlobalFeeDisableUnavailable";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InitialEarnShareSupplyNotZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InsufficientEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "available";
            readonly type: "uint256";
        }, {
            readonly name: "requested";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InsufficientOutput";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorFeeConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnDecimals";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEngineShareScale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MaxManagedAssetsExceeded";
        readonly inputs: readonly [{
            readonly name: "maximum";
            readonly type: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumAssetsNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEarnSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEarnShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEarnShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEngineSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEngineShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "NoEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEmergencyGuardianOrOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotRequesterOrJanitor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorMigrationDisabled";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "PendingRedeemsOpen";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ReentrantCall";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RequestNotOpen";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "ResidualBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RewardRateLimitExceeded";
        readonly inputs: readonly [{
            readonly name: "normalizedRate";
            readonly type: "uint256";
        }, {
            readonly name: "baselineRate";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "SameEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFalse";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAddress";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAmount";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumAssets";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEngineShares";
        readonly inputs: readonly [];
    }], "Deposited">;
    /**
     * Estimates gas for a deposit, assuming the vault has enough asset allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    function estimateGas<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: deposit.Parameters<chain, account>): Promise<bigint>;
    /**
     * Simulates a deposit, assuming the vault has enough asset allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    function simulate<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: deposit.Parameters<chain, account>): Promise<SimulateContractReturnType<typeof Abis.earnVault, 'deposit'>>;
}
/**
 * Deposits assets and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions, EarnShares } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { shareAmount } = await Actions.earn.depositSync(client, {
 *   assetAmount: 100_000_000n,
 *   shareAmountMin: EarnShares.minimumOutput(99_900_000n, 50),
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export declare function depositSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositSync.Parameters<chain, account>): Promise<depositSync.ReturnValue>;
export declare namespace depositSync {
    type Args = deposit.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = deposit.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<{
        /** Assets deposited. */
        assetAmount: bigint;
        /** Depositing caller. */
        caller: Address;
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Earn share recipient. */
        recipient: Address;
        /** Earn shares minted. */
        shareAmount: bigint;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Deposits venue shares into a vault and mints Earn shares to `recipient`.
 * The transaction includes the required venue share approval.
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
 * const hash = await Actions.earn.depositShares(client, {
 *   earnShareAmount: 499_000_000n,
 *   slippageBps: 30,
 *   vault: '0x...',
 *   venueShareAmount: 500_000_000n,
 *   venueShareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function depositShares<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositShares.Parameters<chain, account>): Promise<depositShares.ReturnValue>;
export declare namespace depositShares {
    type Args = {
        /** Venue shares to deposit, base units. */
        venueShareAmount: bigint;
        /** Earn share recipient. @default `account.address` */
        recipient?: Address | undefined;
        /** Vault address. */
        vault: Address;
        /** Venue share token approved for the deposit. */
        venueShareToken: Address;
    } & OneOf<{
        /** Minimum Earn share output to accept; must be greater than zero. */
        earnShareAmountMin: bigint;
    } | {
        /** Quoted Earn share output; floored by `slippageBps`. */
        earnShareAmount: bigint;
        /** Slippage tolerance in basis points under `earnShareAmount` (50 = 0.5%). */
        slippageBps: number;
    }>;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal Shared dispatch; reads the engine for the approval. */
    function inner<action extends typeof sendTransaction | typeof sendTransactionSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: depositShares.Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a venue share deposit call without an approval. Provide an
     * explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call<chain extends Chain | undefined>(...parameters: CallParameters<call.Args, Client<Transport, chain>>): {
        abi: [{
            readonly type: "function";
            readonly name: "depositVenueShares";
            readonly inputs: readonly [{
                readonly name: "venueShares";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "depositVenueShares";
    } & {
        args: readonly [bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    namespace call {
        type Args = {
            /** Venue shares to deposit, base units. */
            venueShareAmount: bigint;
            /** Earn share recipient. */
            recipient: Address;
            /** Vault address. */
            vault: Address;
        } & OneOf<{
            /** Minimum Earn share output to accept. */
            earnShareAmountMin: bigint;
        } | {
            /** Quoted Earn share output; floored by `slippageBps`. */
            earnShareAmount: bigint;
            /** Slippage tolerance in basis points under `earnShareAmount` (50 = 0.5%). */
            slippageBps: number;
        }>;
    }
    /**
     * Defines the venue share approval and deposit calls for atomic execution.
     * Pass the vault's current `engine` and `venueShareToken` explicitly.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: call.Args & {
        /** Current vault engine that pulls the venue shares. */
        engine: Address;
        /** Venue share token pulled by the engine. */
        venueShareToken: Address;
    }): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly type: "function";
            readonly name: "depositVenueShares";
            readonly inputs: readonly [{
                readonly name: "venueShares";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "depositVenueShares";
    } & {
        args: readonly [bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
    /**
     * Extracts a `VenueSharesDeposited` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `VenueSharesDeposited` event.
     */
    function extractEvent(logs: Log[], parameters: {
        vault: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "MAX_REWARD_RATE_MULTIPLIER";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "absorbEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "accrueFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeAssets";
            readonly type: "uint256";
        }, {
            readonly name: "feeEarnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "anchorEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "anchorEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asset";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asyncJanitor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelOperatorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "minReceiverEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "contribute";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "convertEngineSharesToEarnShares";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "convertToEngineShares";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "deposit";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositVenueShares";
        readonly inputs: readonly [{
            readonly name: "venueShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositsPaused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "disableFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "distributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorFee";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorUpdateDelay";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint40";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnShare";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "emergencyGuardian";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engine";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineMigrationMode";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "executeDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeConfigId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "finalizeRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "asset_";
            readonly type: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "initialize";
        readonly inputs: readonly [{
            readonly name: "engine_";
            readonly type: "address";
        }, {
            readonly name: "earnShare_";
            readonly type: "address";
        }, {
            readonly name: "earnFees_";
            readonly type: "address";
        }, {
            readonly name: "operator_";
            readonly type: "address";
        }, {
            readonly name: "controlInit_";
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
            readonly name: "distributorInit_";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "distributor";
                readonly type: "address";
            }, {
                readonly name: "updateDelay";
                readonly type: "uint40";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "isAccountingAligned";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isFeeValuationFresh";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxManagedAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "migrateEngine";
        readonly inputs: readonly [{
            readonly name: "newEngine";
            readonly type: "address";
        }, {
            readonly name: "minNewEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "minAssetsRetained";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "newEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "normalizedRewardRate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "openRedeemRequestCount";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "operator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "recipient";
                readonly type: "address";
            }, {
                readonly name: "rateBps";
                readonly type: "uint16";
            }, {
                readonly name: "executableAt";
                readonly type: "uint40";
            }, {
                readonly name: "pending";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "requester";
                readonly type: "address";
            }, {
                readonly name: "burnedEarnShares";
                readonly type: "uint256";
            }, {
                readonly name: "engineShares";
                readonly type: "uint256";
            }, {
                readonly name: "open";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewWithdraw";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "rawEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "redeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "remainingDepositCapacity";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "requestRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "engineData";
            readonly type: "bytes";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "rewardRateBaseline";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "scheduleDistributorFeeUpdate";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setDepositsPaused";
        readonly inputs: readonly [{
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setEmergencyRoles";
        readonly inputs: readonly [{
            readonly name: "newGuardian";
            readonly type: "address";
        }, {
            readonly name: "newJanitor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setFeeConfig";
        readonly inputs: readonly [{
            readonly name: "config";
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
        }];
        readonly outputs: readonly [{
            readonly name: "configId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxManagedAssets";
        readonly inputs: readonly [{
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "surplusEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "transferDistributor";
        readonly inputs: readonly [{
            readonly name: "newDistributor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "transferOperator";
        readonly inputs: readonly [{
            readonly name: "newOperator";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "withdrawExact";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "maxEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "Contributed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DepositPauseChanged";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "paused";
            readonly type: "bool";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Deposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateScheduled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "executableAt";
            readonly type: "uint40";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdated";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "feeConfigId";
            readonly type: "uint64";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousDistributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EarnVaultInitialized";
        readonly inputs: readonly [{
            readonly name: "engine";
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
            readonly name: "operator";
            readonly type: "address";
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
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorUpdateDelay";
            readonly type: "uint40";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRecipient";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EmergencyRolesChanged";
        readonly inputs: readonly [{
            readonly name: "emergencyGuardian";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "asyncJanitor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineMigrated";
        readonly inputs: readonly [{
            readonly name: "oldEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "oldEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assetsMoved";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareShortfallReconciled";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "previousManagedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "observedRawEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "shortfallEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareSurplusAbsorbed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxManagedAssetsChanged";
        readonly inputs: readonly [{
            readonly name: "previousMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousOperator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemCancelled";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemFinalized";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemRequested";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "requester";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Redeemed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "VenueSharesDeposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "requestedVenueShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "WithdrewExact";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "ActiveSupplyWithoutBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "AlreadyInitialized";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DepositsPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotReady";
        readonly inputs: readonly [{
            readonly name: "executableAt";
            readonly type: "uint40";
        }];
    }, {
        readonly type: "error";
        readonly name: "DistributorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DuplicateRequest";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineAssetMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineCapabilityUnsupported";
        readonly inputs: readonly [{
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineEarnVaultMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineExitUnsupported";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExceedsMaxEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveConversionLoss";
        readonly inputs: readonly [{
            readonly name: "inputShares";
            readonly type: "uint256";
        }, {
            readonly name: "representedShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveMigrationClassificationError";
        readonly inputs: readonly [{
            readonly name: "expectedManagedAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualManagedAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "FeeValuationStale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FinalizedAssetMismatch";
        readonly inputs: readonly [{
            readonly name: "finalizedAsset";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "GlobalFeeDisableUnavailable";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InitialEarnShareSupplyNotZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InsufficientEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "available";
            readonly type: "uint256";
        }, {
            readonly name: "requested";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InsufficientOutput";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorFeeConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnDecimals";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEngineShareScale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MaxManagedAssetsExceeded";
        readonly inputs: readonly [{
            readonly name: "maximum";
            readonly type: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumAssetsNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEarnSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEarnShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEarnShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEngineSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEngineShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "NoEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEmergencyGuardianOrOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotRequesterOrJanitor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorMigrationDisabled";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "PendingRedeemsOpen";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ReentrantCall";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RequestNotOpen";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "ResidualBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RewardRateLimitExceeded";
        readonly inputs: readonly [{
            readonly name: "normalizedRate";
            readonly type: "uint256";
        }, {
            readonly name: "baselineRate";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "SameEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFalse";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAddress";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAmount";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumAssets";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEngineShares";
        readonly inputs: readonly [];
    }], "VenueSharesDeposited">;
    /**
     * Estimates gas for a venue share deposit, assuming enough allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    function estimateGas<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositShares.Parameters<chain, account>): Promise<bigint>;
    /**
     * Simulates a venue share deposit, assuming enough allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    function simulate<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositShares.Parameters<chain, account>): Promise<SimulateContractReturnType<typeof Abis.earnVault, 'depositVenueShares'>>;
}
/**
 * Deposits venue shares and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions, EarnShares } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { earnShareAmount } = await Actions.earn.depositSharesSync(client, {
 *   earnShareAmount: 499_000_000n,
 *   slippageBps: 30,
 *   vault: '0x...',
 *   venueShareAmount: 500_000_000n,
 *   venueShareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export declare function depositSharesSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositSharesSync.Parameters<chain, account>): Promise<depositSharesSync.ReturnValue>;
export declare namespace depositSharesSync {
    type Args = depositShares.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = depositShares.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<{
        /** Depositing caller. */
        caller: Address;
        /** Earn shares minted. */
        earnShareAmount: bigint;
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Venue shares measured as received by the engine. */
        receivedVenueShareAmount: bigint;
        /** Earn share recipient. */
        recipient: Address;
        /** Venue shares requested for pull. */
        venueShareAmount: bigint;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Withdraws assets from a Zone and deposits them into a vault on the parent
 * chain. Use {@link privateDeposit.prepare} to build the encrypted callback.
 *
 * @example
 * ```ts
 * const prepared = await Actions.earn.privateDeposit.prepare(parentClient, {
 *   assetAmount: 100_000_000n,
 *   assetToken: '0x...',
 *   gateway: '0x...',
 *   recipient: '0x...',
 *   shareAmountMin: 99_500_000n,
 *   tempoRefundRecipient: '0x...',
 *   vault: '0x...',
 *   vaultAssetAmountMin: 99_000_000n,
 *   zoneId: 7,
 * })
 * const hash = await Actions.earn.privateDeposit(zoneClient, prepared)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Prepared deposit and transaction parameters.
 * @returns The transaction hash.
 */
export declare function privateDeposit<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: privateDeposit.Parameters<chain, account>): Promise<privateDeposit.ReturnValue>;
export declare namespace privateDeposit {
    type Args = prepare.ReturnValue;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = zoneActions.requestWithdrawal.ErrorType;
    /**
     * Builds an encrypted Zone withdrawal that deposits into the selected vault
     * and returns the resulting shares to the Zone.
     *
     * @param client - Parent-chain client.
     * @param parameters - Deposit intent and recovery parameters.
     * @returns The prepared withdrawal and correlation data.
     */
    function prepare<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: prepare.Parameters): Promise<prepare.ReturnValue>;
    namespace prepare {
        type Parameters = Omit<ReadParameters, 'account'> & Args;
        type Args = PrivatePreparationParameters & {
            /** Assets withdrawn from the Zone, base units. */
            assetAmount: bigint;
            /** Private asset withdrawn from the Zone. @default gateway private asset */
            assetToken?: Address | undefined;
            /** Minimum vault assets accepted after conversion. @default `assetAmount` */
            vaultAssetAmountMin?: bigint | undefined;
        } & MinimumShareAmountParameters;
        type ReturnValue = PreparedZoneRequest;
        type ErrorType = BaseErrorType;
    }
    /**
     * Defines the approval and Zone withdrawal calls for a prepared deposit.
     *
     * @param args - Prepared deposit arguments.
     * @returns The Zone withdrawal calls.
     */
    function calls(args: Args): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly name: "requestWithdrawal";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "token";
            }, {
                readonly type: "address";
                readonly name: "to";
            }, {
                readonly type: "uint128";
                readonly name: "amount";
            }, {
                readonly type: "bytes32";
                readonly name: "memo";
            }, {
                readonly type: "uint64";
                readonly name: "gasLimit";
            }, {
                readonly type: "address";
                readonly name: "zoneFallbackRecipient";
            }, {
                readonly type: "bytes";
                readonly name: "data";
            }, {
                readonly type: "bytes";
                readonly name: "revealTo";
            }];
            readonly outputs: readonly [];
        }];
        functionName: "requestWithdrawal";
    } & {
        args: readonly [token: `0x${string}`, to: `0x${string}`, amount: bigint, memo: `0x${string}`, gasLimit: bigint, `0x${string}`, data: `0x${string}`, `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
}
/**
 * Requests a private Zone deposit and waits for the Zone transaction receipt.
 * The receipt confirms withdrawal acceptance, not the parent-chain deposit.
 *
 * @param client - Zone client.
 * @param parameters - Prepared deposit and transaction parameters.
 * @returns The Zone transaction receipt and parent-chain withdrawal sender tag.
 */
export declare function privateDepositSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: privateDepositSync.Parameters<chain, account>): Promise<privateDepositSync.ReturnValue>;
export declare namespace privateDepositSync {
    type Args = privateDeposit.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = privateDeposit.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = zoneActions.requestWithdrawalSync.ReturnValue;
    type ErrorType = zoneActions.requestWithdrawalSync.ErrorType;
}
/**
 * Waits for a Zone gateway deposit to complete on the parent chain.
 *
 * @example
 * ```ts
 * const result = await Actions.earn.waitForPrivateDeposit(parentClient, {
 *   actionId: prepared.actionId,
 *   fromBlock: prepared.fromBlock,
 *   gateway: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Parent-chain client.
 * @param parameters - Prepared action correlation and polling parameters.
 * @returns The completed gateway deposit.
 */
export declare function waitForPrivateDeposit<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: waitForPrivateDeposit.Parameters): Promise<waitForPrivateDeposit.ReturnType>;
export declare namespace waitForPrivateDeposit {
    type Parameters = {
        /** Correlation id from {@link privateDeposit.prepare}. */
        actionId: Hex.Hex;
        /** Lower bound for the parent-chain log scan. */
        fromBlock: bigint;
        /** Zone gateway address. */
        gateway: Address;
        /** Polling frequency in milliseconds. @default `client.pollingInterval` */
        pollingInterval?: number | undefined;
        /** Timeout in milliseconds; `0` disables it. @default `60_000` */
        timeout?: number | undefined;
        /** Vault address. */
        vault: Address;
    };
    type ReturnType = {
        /** Correlation id for the completed deposit. */
        actionId: Hex.Hex;
        /** Tokens delivered to the gateway, base units. */
        inputAmount: bigint;
        /** Token delivered to the gateway. */
        inputToken: Address;
        /** Earn shares returned to the Zone. */
        shares: bigint;
        /** Parent-chain block containing the gateway event. */
        tempoBlockNumber: bigint;
        /** Vault assets deposited after any swap. */
        vaultAssets: bigint;
        /** Encrypted return deposit hash. */
        zoneDepositHash: Hex.Hex;
    };
    type ErrorType = GetLogsErrorType | ObserveErrorType | PollErrorType | WaitForPrivateDepositTimeoutErrorType | BaseErrorType;
}
/**
 * Gets the vault's active fee configuration, pending fees, and fee baselines.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const feeState = await Actions.earn.getFeeState(client, {
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The active fee configuration, pending fees, and baselines.
 */
export declare function getFeeState<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getFeeState.Parameters): Promise<getFeeState.ReturnValue>;
export declare namespace getFeeState {
    type Args = {
        /** Optional fee recipient whose claimable Earn shares are included. */
        recipient?: Address | undefined;
        /** Vault address. */
        vault: Address;
    };
    type Parameters = Omit<ReadParameters, 'account'> & Args;
    type ReturnValue = {
        /** Claimable fee shares for `recipient`; present when provided. */
        claimableShares?: bigint | undefined;
        /** Active fee configuration. */
        config: FeeConfig;
        /** Active fee configuration id (starts at `1`). */
        configId: bigint;
        /** Whether fees are configured and not emergency-disabled. */
        feesActive: boolean;
        /** Post-fee high-water mark per Earn share. */
        highWaterMark: bigint;
        /** Pending fee amounts. */
        preview: FeePreview;
        /** Excess-return fee target per Earn share. */
        targetBase: bigint;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/** Vault fee configuration. */
export type FeeConfig = {
    /** Optional excess-return fee over a growing target line. */
    excess: {
        /** Excess fee recipient. */
        account: Address;
        /** Annual target growth rate in basis points. */
        annualTargetRateBps: number;
        /** Whether the excess fee is active. */
        enabled: boolean;
        /** Rate applied above the target in basis points. */
        excessFeeRateBps: number;
    };
    /** Fixed fee recipients and their rates in basis points. */
    fixedFees: readonly {
        account: Address;
        rateBps: number;
    }[];
};
/** Pending vault fee amounts. */
export type FeePreview = {
    /** Assets backing active Earn shares. */
    activeAssets: bigint;
    /** Fee allocations in assets and Earn shares. */
    allocations: readonly {
        account: Address;
        feeAssets: bigint;
        feeShares: bigint;
    }[];
    /** Excess-return fee portion, asset units. */
    excessFeeAssets: bigint;
    /** Fixed fee portion, asset units. */
    fixedFeeAssets: bigint;
    /** Accrual above the high-water mark, asset units. */
    positiveAccrualAssets: bigint;
    /** Scaled asset value per Earn share after fees. */
    postFeeValuePerShare: bigint;
    /** Scaled asset value per Earn share before fees. */
    preFeeValuePerShare: bigint;
    /** Scaled excess-fee target per Earn share. */
    targetValuePerShare: bigint;
    /** Total fee liability, asset units. */
    totalFeeAssets: bigint;
    /** Earn shares minted to cover the total fee. */
    totalFeeShares: bigint;
};
/**
 * Gets an account's asset and Earn share balances, allowances, and current
 * share value. The value includes fees.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const position = await Actions.earn.getPosition(client, {
 *   account: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The asset and Earn share balances, allowances, and value.
 */
export declare function getPosition<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: getPosition.Parameters<account>): Promise<getPosition.ReturnValue>;
export declare namespace getPosition {
    type Args<account extends Account | undefined = Account | undefined> = GetAccountParameter<account> & {
        /** Vault address. */
        vault: Address;
    };
    type Parameters<account extends Account | undefined = Account | undefined> = Omit<ReadParameters, 'account'> & Args<account>;
    type ReturnValue = {
        /** Assets the vault may spend from the account. */
        assetAllowance: bigint;
        /** Asset balance held by the account. */
        assetBalance: bigint;
        /** Token accepted by the vault. */
        assetToken: Address;
        /** Earn shares the vault may spend from the account. */
        shareAllowance: bigint;
        /** Earn share balance held by the account. */
        shareBalance: bigint;
        /** Token representing Earn shares. */
        shareToken: Address;
        /** Current asset value of the Earn share balance, including fees. */
        value: bigint;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Gets the asset output for an exact Earn share input, including fees.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const assetAmount = await Actions.earn.getRedeemQuote(client, {
 *   shareAmount: 100_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The asset output, including fees.
 */
export declare function getRedeemQuote<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getRedeemQuote.Parameters): Promise<getRedeemQuote.ReturnValue>;
export declare namespace getRedeemQuote {
    type Args = {
        /** Exact Earn share input, base units. */
        shareAmount: bigint;
        /** Vault address. */
        vault: Address;
    };
    type Parameters = Omit<ReadParameters, 'account'> & Args;
    /** Asset output, including fees. */
    type ReturnValue = ReadContractReturnType<typeof Abis.earnVault, 'previewRedeem', never>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Defines a call to the vault's `previewRedeem` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`multicall`](https://viem.sh/docs/contract/multicall): batch the call with other contract reads
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     *
     * @example
     * ```ts
     * import { Actions } from 'viem/tempo'
     *
     * const call = Actions.earn.getRedeemQuote.call({
     *   shareAmount: 100_000_000n,
     *   vault: '0x...',
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "previewRedeem";
            readonly inputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "previewRedeem";
    } & {
        args: readonly [bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
}
/**
 * Gets the vault's addresses, configuration, accounting state, and supported
 * actions. Throws {@link GetVaultEngineChangedError} if its engine changes mid-read.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const vault = await Actions.earn.getVault(client, {
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The vault state and metadata.
 */
export declare function getVault<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getVault.Parameters): Promise<getVault.ReturnValue>;
export declare namespace getVault {
    type Args = {
        /** Vault address. */
        vault: Address;
    };
    type Parameters = Omit<ReadParameters, 'account'> & Args;
    type ReturnValue = {
        /** Token accepted by the vault. */
        assetToken: Address;
        /** Address allowed to cancel queued redemptions; zero when disabled. */
        asyncJanitor: Address;
        /** Actions supported by the current venue integration. */
        capabilities: {
            /** Queued redemptions. */
            asyncRedeem: boolean;
            /** Exact asset withdrawals. */
            exactWithdraw: boolean;
            /** Venue share deposits. */
            inKindDeposit: boolean;
            /** Immediate redemptions. */
            syncRedeem: boolean;
        };
        /** Whether new deposits are paused. */
        depositsPaused: boolean;
        /** Address allowed to pause deposits; zero when disabled. */
        emergencyGuardian: Address;
        /** Current venue integration. */
        engine: {
            /** Integration address. */
            address: Address;
            /** Engine display name. */
            name: string;
            /** Engine display symbol. */
            symbol: string;
            /** Asset value of the active backing. */
            totalAssets: bigint;
        };
        /** Whether only users may change the venue integration. */
        engineMigrationMode: 'operatorEnabled' | 'userOnly';
        /** Venue shares held for the vault. */
        engineShares: bigint;
        /** Whether fees are configured and not emergency-disabled. */
        feesActive: boolean;
        /** Whether Earn share supply matches its asset backing. */
        isSynced: boolean;
        /** Vault governance address. */
        operator: Address;
        /** Open queued redemptions. */
        pendingRedeemCount: bigint;
        /** Active Earn share supply. */
        shareSupply: bigint;
        /** Token representing Earn shares. */
        shareToken: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | GetVaultEngineChangedErrorType | BaseErrorType;
    /**
     * Defines the reads used by {@link getVault}. Pass the current engine and
     * fee contract addresses.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: Args & {
        engine: Address;
        fees: Address;
    }): readonly [{
        abi: [{
            readonly type: "function";
            readonly name: "asset";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "asset";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "engine";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "engine";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "earnShare";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "earnShare";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "operator";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "operator";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "emergencyGuardian";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "emergencyGuardian";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "asyncJanitor";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "asyncJanitor";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "engineMigrationMode";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "uint8";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "engineMigrationMode";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "depositsPaused";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "depositsPaused";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "engineShares";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "engineShares";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "totalEarnShares";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "totalEarnShares";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "isAccountingAligned";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "isAccountingAligned";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "openRedeemRequestCount";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "openRedeemRequestCount";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "feesActive";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "feesActive";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "totalAssets";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "totalAssets";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "name";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "string";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "name";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "symbol";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "string";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "symbol";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "supportsInterface";
            readonly inputs: readonly [{
                readonly name: "interfaceId";
                readonly type: "bytes4";
            }];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "supportsInterface";
    } & {
        args: readonly [interfaceId: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "supportsInterface";
            readonly inputs: readonly [{
                readonly name: "interfaceId";
                readonly type: "bytes4";
            }];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "supportsInterface";
    } & {
        args: readonly [interfaceId: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "supportsInterface";
            readonly inputs: readonly [{
                readonly name: "interfaceId";
                readonly type: "bytes4";
            }];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "supportsInterface";
    } & {
        args: readonly [interfaceId: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly type: "function";
            readonly name: "supportsInterface";
            readonly inputs: readonly [{
                readonly name: "interfaceId";
                readonly type: "bytes4";
            }];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "supportsInterface";
    } & {
        args: readonly [interfaceId: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }];
}
/**
 * Gets the Earn shares required for an exact asset output, including fees
 * and ceiling rounding.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const shareAmount = await Actions.earn.getWithdrawQuote(client, {
 *   assetAmount: 250_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The required Earn share input, ceiling-rounded.
 */
export declare function getWithdrawQuote<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getWithdrawQuote.Parameters): Promise<getWithdrawQuote.ReturnValue>;
export declare namespace getWithdrawQuote {
    type Args = {
        /** Exact asset output, base units. */
        assetAmount: bigint;
        /** Vault address. */
        vault: Address;
    };
    type Parameters = Omit<ReadParameters, 'account'> & Args;
    /** Required Earn share input, ceiling-rounded. */
    type ReturnValue = ReadContractReturnType<typeof Abis.earnVault, 'previewWithdraw', never>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Defines a call to the vault's `previewWithdraw` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`multicall`](https://viem.sh/docs/contract/multicall): batch the call with other contract reads
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     *
     * @example
     * ```ts
     * import { Actions } from 'viem/tempo'
     *
     * const call = Actions.earn.getWithdrawQuote.call({
     *   assetAmount: 250_000_000n,
     *   vault: '0x...',
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "previewWithdraw";
            readonly inputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "previewWithdraw";
    } & {
        args: readonly [assets: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
}
/**
 * Redeems Earn shares for assets sent to `recipient`. The transaction
 * includes the required Earn share approval.
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
 * const hash = await Actions.earn.redeem(client, {
 *   shareAmount: 100_000_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function redeem<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: redeem.Parameters<chain, account>): Promise<redeem.ReturnValue>;
export declare namespace redeem {
    type Args = {
        /** Earn shares to redeem; base units or `{ formatted, decimals? }`. */
        shareAmount: internal_Token.AmountInput;
        /** Asset recipient. @default `account.address` */
        recipient?: Address | undefined;
        /** Vault address. */
        vault: Address;
    } & OneOf<{
        /** Minimum asset output to accept; must be greater than zero. */
        assetAmountMin: bigint;
    } | {
        /** Slippage tolerance in basis points under a live {@link getRedeemQuote} (50 = 0.5%). */
        slippageBps: number;
    } | {
        /** Quoted asset output; floored by `slippageBps`. */
        assetAmount: bigint;
        /** Slippage tolerance in basis points under `assetAmount` (50 = 0.5%). */
        slippageBps: number;
    }>;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal Shared dispatch; reads the Earn share token for the approval. */
    function inner<action extends typeof sendTransaction | typeof sendTransactionSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: redeem.Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines a redeem call without an approval. Provide Earn share decimals
     * for formatted inputs and an explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call<chain extends Chain | undefined>(...parameters: CallParameters<call.Args, Client<Transport, chain>>): {
        abi: [{
            readonly type: "function";
            readonly name: "redeem";
            readonly inputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minAssets";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "redeem";
    } & {
        args: readonly [bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    namespace call {
        type Args = {
            /** Earn shares to redeem; base units or `{ formatted, decimals? }`. */
            shareAmount: internal_Token.AmountInput;
            /** Asset recipient. */
            recipient: Address;
            /** Vault address. */
            vault: Address;
        } & OneOf<{
            /** Minimum asset output to accept. */
            assetAmountMin: bigint;
        } | {
            /** Quoted asset output; floored by `slippageBps`. */
            assetAmount: bigint;
            /** Slippage tolerance in basis points under `assetAmount` (50 = 0.5%). */
            slippageBps: number;
        }>;
    }
    /**
     * Defines the Earn share approval and redeem calls for atomic execution.
     * Pass `shareToken` explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: call.Args & {
        /** Earn share token approved for the redemption. */
        shareToken: Address;
    }): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly type: "function";
            readonly name: "redeem";
            readonly inputs: readonly [{
                readonly name: "earnShares";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "minAssets";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "redeem";
    } & {
        args: readonly [bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
    /**
     * Extracts a `Redeemed` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `Redeemed` event.
     */
    function extractEvent(logs: Log[], parameters: {
        vault: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "MAX_REWARD_RATE_MULTIPLIER";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "absorbEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "accrueFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeAssets";
            readonly type: "uint256";
        }, {
            readonly name: "feeEarnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "anchorEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "anchorEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asset";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asyncJanitor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelOperatorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "minReceiverEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "contribute";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "convertEngineSharesToEarnShares";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "convertToEngineShares";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "deposit";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositVenueShares";
        readonly inputs: readonly [{
            readonly name: "venueShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositsPaused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "disableFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "distributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorFee";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorUpdateDelay";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint40";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnShare";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "emergencyGuardian";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engine";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineMigrationMode";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "executeDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeConfigId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "finalizeRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "asset_";
            readonly type: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "initialize";
        readonly inputs: readonly [{
            readonly name: "engine_";
            readonly type: "address";
        }, {
            readonly name: "earnShare_";
            readonly type: "address";
        }, {
            readonly name: "earnFees_";
            readonly type: "address";
        }, {
            readonly name: "operator_";
            readonly type: "address";
        }, {
            readonly name: "controlInit_";
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
            readonly name: "distributorInit_";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "distributor";
                readonly type: "address";
            }, {
                readonly name: "updateDelay";
                readonly type: "uint40";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "isAccountingAligned";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isFeeValuationFresh";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxManagedAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "migrateEngine";
        readonly inputs: readonly [{
            readonly name: "newEngine";
            readonly type: "address";
        }, {
            readonly name: "minNewEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "minAssetsRetained";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "newEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "normalizedRewardRate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "openRedeemRequestCount";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "operator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "recipient";
                readonly type: "address";
            }, {
                readonly name: "rateBps";
                readonly type: "uint16";
            }, {
                readonly name: "executableAt";
                readonly type: "uint40";
            }, {
                readonly name: "pending";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "requester";
                readonly type: "address";
            }, {
                readonly name: "burnedEarnShares";
                readonly type: "uint256";
            }, {
                readonly name: "engineShares";
                readonly type: "uint256";
            }, {
                readonly name: "open";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewWithdraw";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "rawEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "redeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "remainingDepositCapacity";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "requestRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "engineData";
            readonly type: "bytes";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "rewardRateBaseline";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "scheduleDistributorFeeUpdate";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setDepositsPaused";
        readonly inputs: readonly [{
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setEmergencyRoles";
        readonly inputs: readonly [{
            readonly name: "newGuardian";
            readonly type: "address";
        }, {
            readonly name: "newJanitor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setFeeConfig";
        readonly inputs: readonly [{
            readonly name: "config";
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
        }];
        readonly outputs: readonly [{
            readonly name: "configId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxManagedAssets";
        readonly inputs: readonly [{
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "surplusEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "transferDistributor";
        readonly inputs: readonly [{
            readonly name: "newDistributor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "transferOperator";
        readonly inputs: readonly [{
            readonly name: "newOperator";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "withdrawExact";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "maxEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "Contributed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DepositPauseChanged";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "paused";
            readonly type: "bool";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Deposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateScheduled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "executableAt";
            readonly type: "uint40";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdated";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "feeConfigId";
            readonly type: "uint64";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousDistributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EarnVaultInitialized";
        readonly inputs: readonly [{
            readonly name: "engine";
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
            readonly name: "operator";
            readonly type: "address";
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
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorUpdateDelay";
            readonly type: "uint40";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRecipient";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EmergencyRolesChanged";
        readonly inputs: readonly [{
            readonly name: "emergencyGuardian";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "asyncJanitor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineMigrated";
        readonly inputs: readonly [{
            readonly name: "oldEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "oldEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assetsMoved";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareShortfallReconciled";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "previousManagedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "observedRawEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "shortfallEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareSurplusAbsorbed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxManagedAssetsChanged";
        readonly inputs: readonly [{
            readonly name: "previousMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousOperator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemCancelled";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemFinalized";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemRequested";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "requester";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Redeemed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "VenueSharesDeposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "requestedVenueShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "WithdrewExact";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "ActiveSupplyWithoutBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "AlreadyInitialized";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DepositsPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotReady";
        readonly inputs: readonly [{
            readonly name: "executableAt";
            readonly type: "uint40";
        }];
    }, {
        readonly type: "error";
        readonly name: "DistributorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DuplicateRequest";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineAssetMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineCapabilityUnsupported";
        readonly inputs: readonly [{
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineEarnVaultMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineExitUnsupported";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExceedsMaxEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveConversionLoss";
        readonly inputs: readonly [{
            readonly name: "inputShares";
            readonly type: "uint256";
        }, {
            readonly name: "representedShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveMigrationClassificationError";
        readonly inputs: readonly [{
            readonly name: "expectedManagedAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualManagedAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "FeeValuationStale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FinalizedAssetMismatch";
        readonly inputs: readonly [{
            readonly name: "finalizedAsset";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "GlobalFeeDisableUnavailable";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InitialEarnShareSupplyNotZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InsufficientEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "available";
            readonly type: "uint256";
        }, {
            readonly name: "requested";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InsufficientOutput";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorFeeConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnDecimals";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEngineShareScale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MaxManagedAssetsExceeded";
        readonly inputs: readonly [{
            readonly name: "maximum";
            readonly type: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumAssetsNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEarnSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEarnShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEarnShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEngineSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEngineShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "NoEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEmergencyGuardianOrOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotRequesterOrJanitor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorMigrationDisabled";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "PendingRedeemsOpen";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ReentrantCall";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RequestNotOpen";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "ResidualBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RewardRateLimitExceeded";
        readonly inputs: readonly [{
            readonly name: "normalizedRate";
            readonly type: "uint256";
        }, {
            readonly name: "baselineRate";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "SameEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFalse";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAddress";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAmount";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumAssets";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEngineShares";
        readonly inputs: readonly [];
    }], "Redeemed">;
    /**
     * Estimates gas for a redemption, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    function estimateGas<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: redeem.Parameters<chain, account>): Promise<bigint>;
    /**
     * Simulates a redemption, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    function simulate<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: redeem.Parameters<chain, account>): Promise<SimulateContractReturnType<typeof Abis.earnVault, 'redeem'>>;
}
/**
 * Redeems Earn shares and returns the confirmed receipt and event data.
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
 * const { assetAmount } = await Actions.earn.redeemSync(client, {
 *   assetAmountMin: 99_500_000n,
 *   shareAmount: 100_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export declare function redeemSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: redeemSync.Parameters<chain, account>): Promise<redeemSync.ReturnValue>;
export declare namespace redeemSync {
    type Args = redeem.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = redeem.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<{
        /** Assets paid out. */
        assetAmount: bigint;
        /** Redeeming caller. */
        caller: Address;
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Asset recipient. */
        recipient: Address;
        /** Earn shares burned. */
        shareAmount: bigint;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Withdraws Earn shares from a Zone and redeems them on the parent chain. Use
 * {@link privateRedeem.prepare} to build the encrypted callback.
 *
 * @example
 * ```ts
 * const prepared = await Actions.earn.privateRedeem.prepare(parentClient, {
 *   gateway: '0x...',
 *   recipient: '0x...',
 *   shareAmount: 100_000_000n,
 *   slippageBps: 50,
 *   tempoRefundRecipient: '0x...',
 *   vault: '0x...',
 *   zoneId: 7,
 * })
 * const hash = await Actions.earn.privateRedeem(zoneClient, prepared)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Prepared redemption and transaction parameters.
 * @returns The transaction hash.
 */
export declare function privateRedeem<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: privateRedeem.Parameters<chain, account>): Promise<privateRedeem.ReturnValue>;
export declare namespace privateRedeem {
    type Args = prepare.ReturnValue;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = zoneActions.requestWithdrawal.ErrorType;
    /**
     * Builds an encrypted Zone withdrawal that redeems Earn shares and returns
     * the resulting assets to the Zone.
     *
     * @param client - Parent-chain client.
     * @param parameters - Redemption intent and recovery parameters.
     * @returns The prepared withdrawal and correlation data.
     */
    function prepare<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: prepare.Parameters): Promise<prepare.ReturnValue>;
    namespace prepare {
        type Parameters = Omit<ReadParameters, 'account'> & PrivatePreparationParameters & {
            /** Earn shares withdrawn from the Zone, base units. */
            shareAmount: bigint;
            /** Private asset returned to the Zone. Must match the gateway. @default gateway private asset */
            assetToken?: Address | undefined;
        } & OneOf<{
            /** Minimum assets returned to the Zone. */
            assetAmountMin: bigint;
        } | {
            /** Quoted assets returned to the Zone. */
            assetAmount: bigint;
            /** Slippage tolerance under `assetAmount` (50 = 0.5%). */
            slippageBps: number;
        } | {
            /** Slippage tolerance under a live vault quote (50 = 0.5%). */
            slippageBps: number;
        }>;
        type ReturnValue = PreparedZoneRequest;
        type ErrorType = BaseErrorType;
    }
    /**
     * Defines the approval and Zone withdrawal calls for a prepared redemption.
     *
     * @param args - Prepared redemption arguments.
     * @returns The Zone withdrawal calls.
     */
    function calls(args: Args): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly name: "requestWithdrawal";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "token";
            }, {
                readonly type: "address";
                readonly name: "to";
            }, {
                readonly type: "uint128";
                readonly name: "amount";
            }, {
                readonly type: "bytes32";
                readonly name: "memo";
            }, {
                readonly type: "uint64";
                readonly name: "gasLimit";
            }, {
                readonly type: "address";
                readonly name: "zoneFallbackRecipient";
            }, {
                readonly type: "bytes";
                readonly name: "data";
            }, {
                readonly type: "bytes";
                readonly name: "revealTo";
            }];
            readonly outputs: readonly [];
        }];
        functionName: "requestWithdrawal";
    } & {
        args: readonly [token: `0x${string}`, to: `0x${string}`, amount: bigint, memo: `0x${string}`, gasLimit: bigint, `0x${string}`, data: `0x${string}`, `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
}
/**
 * Requests a private Zone redemption and waits for the Zone transaction
 * receipt. The receipt confirms withdrawal acceptance, not redemption.
 *
 * @param client - Zone client.
 * @param parameters - Prepared redemption and transaction parameters.
 * @returns The Zone transaction receipt and parent-chain withdrawal sender tag.
 */
export declare function privateRedeemSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: privateRedeemSync.Parameters<chain, account>): Promise<privateRedeemSync.ReturnValue>;
export declare namespace privateRedeemSync {
    type Args = privateRedeem.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = privateRedeem.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = zoneActions.requestWithdrawalSync.ReturnValue;
    type ErrorType = zoneActions.requestWithdrawalSync.ErrorType;
}
/**
 * Waits for a Zone gateway redemption to complete on the parent chain.
 *
 * @example
 * ```ts
 * const result = await Actions.earn.waitForPrivateRedeem(parentClient, {
 *   actionId: prepared.actionId,
 *   fromBlock: prepared.fromBlock,
 *   gateway: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Parent-chain client.
 * @param parameters - Prepared action correlation and polling parameters.
 * @returns The completed gateway redemption.
 */
export declare function waitForPrivateRedeem<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: waitForPrivateRedeem.Parameters): Promise<waitForPrivateRedeem.ReturnType>;
export declare namespace waitForPrivateRedeem {
    type Parameters = {
        /** Correlation id from {@link privateRedeem.prepare}. */
        actionId: Hex.Hex;
        /** Lower bound for the parent-chain log scan. */
        fromBlock: bigint;
        /** Zone gateway address. */
        gateway: Address;
        /** Polling frequency in milliseconds. @default `client.pollingInterval` */
        pollingInterval?: number | undefined;
        /** Timeout in milliseconds; `0` disables it. @default `60_000` */
        timeout?: number | undefined;
        /** Vault address. */
        vault: Address;
    };
    type ReturnType = {
        /** Correlation id for the completed redemption. */
        actionId: Hex.Hex;
        /** Tokens returned to the Zone, base units. */
        outputAmount: bigint;
        /** Token returned to the Zone. */
        outputToken: Address;
        /** Earn shares redeemed. */
        shares: bigint;
        /** Parent-chain block containing the gateway event. */
        tempoBlockNumber: bigint;
        /** Vault assets produced before any swap. */
        vaultAssets: bigint;
        /** Encrypted return deposit hash. */
        zoneDepositHash: Hex.Hex;
    };
    type ErrorType = GetLogsErrorType | ObserveErrorType | PollErrorType | WaitForPrivateRedeemTimeoutErrorType | BaseErrorType;
}
/**
 * Withdraws an exact asset amount to `recipient`, up to the specified Earn
 * share limit. The transaction includes the required Earn share approval;
 * use {@link redeem} for a full exit.
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
 * const hash = await Actions.earn.withdrawExact(client, {
 *   assetAmount: 40_000_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export declare function withdrawExact<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: withdrawExact.Parameters<chain, account>): Promise<withdrawExact.ReturnValue>;
export declare namespace withdrawExact {
    type Args = {
        /** Exact assets to receive; base units or `{ formatted, decimals? }`. */
        assetAmount: internal_Token.AmountInput;
        /** Asset recipient. @default `account.address` */
        recipient?: Address | undefined;
        /** Vault address. */
        vault: Address;
    } & OneOf<{
        /** Maximum Earn share input to burn. */
        shareAmountMax: bigint;
    } | {
        /** Slippage headroom above a live {@link getWithdrawQuote}, ceiling-rounded (50 = 0.5%). */
        slippageBps: number;
    } | {
        /** Quoted Earn share input; raised by `slippageBps`. */
        shareAmount: bigint;
        /** Slippage tolerance in basis points over `shareAmount` (50 = 0.5%). */
        slippageBps: number;
    }>;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Args;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal Shared dispatch; reads the Earn share token for the approval. */
    function inner<action extends typeof sendTransaction | typeof sendTransactionSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: withdrawExact.Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Defines an exact withdrawal call without an approval. Provide asset
     * decimals and an explicit input limit because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call<chain extends Chain | undefined>(...parameters: CallParameters<call.Args, Client<Transport, chain>>): {
        abi: [{
            readonly type: "function";
            readonly name: "withdrawExact";
            readonly inputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "maxEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnSharesBurned";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "withdrawExact";
    } & {
        args: readonly [assets: bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    namespace call {
        type Args = {
            /** Exact assets to receive; base units or `{ formatted, decimals? }`. */
            assetAmount: internal_Token.AmountInput;
            /** Asset recipient. */
            recipient: Address;
            /** Vault address. */
            vault: Address;
        } & OneOf<{
            /** Maximum Earn share input to burn. */
            shareAmountMax: bigint;
        } | {
            /** Quoted Earn share input; raised by `slippageBps`. */
            shareAmount: bigint;
            /** Slippage tolerance in basis points over `shareAmount` (50 = 0.5%). */
            slippageBps: number;
        }>;
    }
    /**
     * Defines the Earn share approval and withdrawal calls for atomic
     * execution. Pass `shareToken` explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: call.Args & {
        /** Earn share token approved for the withdrawal. */
        shareToken: Address;
    }): (({
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly type: "function";
            readonly name: "withdrawExact";
            readonly inputs: readonly [{
                readonly name: "assets";
                readonly type: "uint256";
            }, {
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "maxEarnShares";
                readonly type: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "earnSharesBurned";
                readonly type: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "withdrawExact";
    } & {
        args: readonly [assets: bigint, receiver: `0x${string}`, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
    /**
     * Extracts a `WithdrewExact` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `WithdrewExact` event.
     */
    function extractEvent(logs: Log[], parameters: {
        vault: Address;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "MAX_REWARD_RATE_MULTIPLIER";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "absorbEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "acceptOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "accrueFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeAssets";
            readonly type: "uint256";
        }, {
            readonly name: "feeEarnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "anchorEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "anchorEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asset";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "asyncJanitor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelDistributorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelOperatorTransfer";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "cancelRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "minReceiverEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "contribute";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "convertEngineSharesToEarnShares";
        readonly inputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "convertToEngineShares";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "engineShares_";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "deposit";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositVenueShares";
        readonly inputs: readonly [{
            readonly name: "venueShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "depositsPaused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "disableFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "distributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorFee";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "distributorUpdateDelay";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint40";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnFees";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "earnShare";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "emergencyGuardian";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engine";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineMigrationMode";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "engineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "executeDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "feeConfigId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "finalizeRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }, {
            readonly name: "asset_";
            readonly type: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "initialize";
        readonly inputs: readonly [{
            readonly name: "engine_";
            readonly type: "address";
        }, {
            readonly name: "earnShare_";
            readonly type: "address";
        }, {
            readonly name: "earnFees_";
            readonly type: "address";
        }, {
            readonly name: "operator_";
            readonly type: "address";
        }, {
            readonly name: "controlInit_";
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
            readonly name: "distributorInit_";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "distributor";
                readonly type: "address";
            }, {
                readonly name: "updateDelay";
                readonly type: "uint40";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "isAccountingAligned";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isFeeValuationFresh";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxManagedAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "migrateEngine";
        readonly inputs: readonly [{
            readonly name: "newEngine";
            readonly type: "address";
        }, {
            readonly name: "minNewEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "minAssetsRetained";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "newEngineShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "normalizedRewardRate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "openRedeemRequestCount";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "operator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingDistributorFeeUpdate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "recipient";
                readonly type: "address";
            }, {
                readonly name: "rateBps";
                readonly type: "uint16";
            }, {
                readonly name: "executableAt";
                readonly type: "uint40";
            }, {
                readonly name: "pending";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingOperator";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingRedeem";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "receiver";
                readonly type: "address";
            }, {
                readonly name: "requester";
                readonly type: "address";
            }, {
                readonly name: "burnedEarnShares";
                readonly type: "uint256";
            }, {
                readonly name: "engineShares";
                readonly type: "uint256";
            }, {
                readonly name: "open";
                readonly type: "bool";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "previewWithdraw";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "rawEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "redeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "minAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "remainingDepositCapacity";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "requestRedeem";
        readonly inputs: readonly [{
            readonly name: "earnShares";
            readonly type: "uint256";
        }, {
            readonly name: "engineData";
            readonly type: "bytes";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "rewardRateBaseline";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "scheduleDistributorFeeUpdate";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setDepositsPaused";
        readonly inputs: readonly [{
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setEmergencyRoles";
        readonly inputs: readonly [{
            readonly name: "newGuardian";
            readonly type: "address";
        }, {
            readonly name: "newJanitor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setFeeConfig";
        readonly inputs: readonly [{
            readonly name: "config";
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
        }];
        readonly outputs: readonly [{
            readonly name: "configId";
            readonly type: "uint64";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxManagedAssets";
        readonly inputs: readonly [{
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "surplusEngineShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalAssets";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "totalEarnShares";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "transferDistributor";
        readonly inputs: readonly [{
            readonly name: "newDistributor";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "transferOperator";
        readonly inputs: readonly [{
            readonly name: "newOperator";
            readonly type: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "withdrawExact";
        readonly inputs: readonly [{
            readonly name: "assets";
            readonly type: "uint256";
        }, {
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly name: "maxEarnShares";
            readonly type: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "Contributed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DepositPauseChanged";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "paused";
            readonly type: "bool";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Deposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdateScheduled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "executableAt";
            readonly type: "uint40";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorFeeUpdated";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "rateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }, {
            readonly name: "feeConfigId";
            readonly type: "uint64";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "DistributorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousDistributor";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newDistributor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EarnVaultInitialized";
        readonly inputs: readonly [{
            readonly name: "engine";
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
            readonly name: "operator";
            readonly type: "address";
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
            readonly name: "distributor";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorUpdateDelay";
            readonly type: "uint40";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRecipient";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "distributorFeeRateBps";
            readonly type: "uint16";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EmergencyRolesChanged";
        readonly inputs: readonly [{
            readonly name: "emergencyGuardian";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "asyncJanitor";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineMigrated";
        readonly inputs: readonly [{
            readonly name: "oldEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newEngine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "oldEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assetsMoved";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareShortfallReconciled";
        readonly inputs: readonly [{
            readonly name: "engine";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "previousManagedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "observedRawEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "shortfallEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "totalEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "EngineShareSurplusAbsorbed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "engineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "anchorEarnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxManagedAssetsChanged";
        readonly inputs: readonly [{
            readonly name: "previousMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "newMaxManagedAssets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferCancelled";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferStarted";
        readonly inputs: readonly [{
            readonly name: "operator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "pendingOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OperatorTransferred";
        readonly inputs: readonly [{
            readonly name: "previousOperator";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "newOperator";
            readonly type: "address";
            readonly indexed: true;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemCancelled";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemFinalized";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "asset";
            readonly type: "address";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RedeemRequested";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
            readonly indexed: true;
        }, {
            readonly name: "requester";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Redeemed";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "VenueSharesDeposited";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "requestedVenueShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "receivedEngineShares";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnShares";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "WithdrewExact";
        readonly inputs: readonly [{
            readonly name: "caller";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
        }, {
            readonly name: "assets";
            readonly type: "uint256";
            readonly indexed: false;
        }, {
            readonly name: "earnSharesBurned";
            readonly type: "uint256";
            readonly indexed: false;
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "ActiveSupplyWithoutBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "AlreadyInitialized";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DepositsPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DistributorFeeUpdateNotReady";
        readonly inputs: readonly [{
            readonly name: "executableAt";
            readonly type: "uint40";
        }];
    }, {
        readonly type: "error";
        readonly name: "DistributorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DuplicateRequest";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineAssetMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineCapabilityUnsupported";
        readonly inputs: readonly [{
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
    }, {
        readonly type: "error";
        readonly name: "EngineEarnVaultMismatch";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "EngineExitUnsupported";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExceedsMaxEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveConversionLoss";
        readonly inputs: readonly [{
            readonly name: "inputShares";
            readonly type: "uint256";
        }, {
            readonly name: "representedShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "ExcessiveMigrationClassificationError";
        readonly inputs: readonly [{
            readonly name: "expectedManagedAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualManagedAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "FeeValuationStale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FinalizedAssetMismatch";
        readonly inputs: readonly [{
            readonly name: "finalizedAsset";
            readonly type: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "GlobalFeeDisableUnavailable";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InitialEarnShareSupplyNotZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InsufficientEngineShareSurplus";
        readonly inputs: readonly [{
            readonly name: "available";
            readonly type: "uint256";
        }, {
            readonly name: "requested";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InsufficientOutput";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidDistributorFeeConfiguration";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEarnDecimals";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidEngineShareScale";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MaxManagedAssetsExceeded";
        readonly inputs: readonly [{
            readonly name: "maximum";
            readonly type: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumAssetsNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumAssets";
            readonly type: "uint256";
        }, {
            readonly name: "actualAssets";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEarnSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEarnShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEarnShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "MinimumEngineSharesNotMet";
        readonly inputs: readonly [{
            readonly name: "minimumEngineShares";
            readonly type: "uint256";
        }, {
            readonly name: "actualEngineShares";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "NoEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEmergencyGuardianOrOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingDistributor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotRequesterOrJanitor";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorMigrationDisabled";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OperatorTransferNotPending";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "PendingRedeemsOpen";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ReentrantCall";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RequestNotOpen";
        readonly inputs: readonly [{
            readonly name: "requestId";
            readonly type: "bytes32";
        }];
    }, {
        readonly type: "error";
        readonly name: "ResidualBacking";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "RewardRateLimitExceeded";
        readonly inputs: readonly [{
            readonly name: "normalizedRate";
            readonly type: "uint256";
        }, {
            readonly name: "baselineRate";
            readonly type: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "SameEngine";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFailed";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TokenCallFalse";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAddress";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroAmount";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumAssets";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEarnShares";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMinimumEngineShares";
        readonly inputs: readonly [];
    }], "WithdrewExact">;
    /**
     * Estimates gas for an exact withdrawal, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    function estimateGas<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: withdrawExact.Parameters<chain, account>): Promise<bigint>;
    /**
     * Simulates an exact withdrawal, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    function simulate<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: withdrawExact.Parameters<chain, account>): Promise<SimulateContractReturnType<typeof Abis.earnVault, 'withdrawExact'>>;
}
/**
 * Withdraws an exact asset amount and returns the confirmed receipt and event data.
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
 * const { shareAmount } = await Actions.earn.withdrawExactSync(client, {
 *   assetAmount: 40_000_000n,
 *   shareAmountMax: 40_200_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export declare function withdrawExactSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: withdrawExactSync.Parameters<chain, account>): Promise<withdrawExactSync.ReturnValue>;
export declare namespace withdrawExactSync {
    type Args = withdrawExact.Args;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = withdrawExact.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type ReturnValue = Compute<{
        /** Exact assets received. */
        assetAmount: bigint;
        /** Withdrawing caller. */
        caller: Address;
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Asset recipient. */
        recipient: Address;
        /** Earn shares burned. */
        shareAmount: bigint;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
type MinimumShareAmountParameters = OneOf<{
    /** Minimum Earn shares returned to the Zone. */
    shareAmountMin: bigint;
} | {
    /** Quoted Earn shares returned to the Zone. */
    shareAmount: bigint;
    /** Slippage tolerance under `shareAmount` (50 = 0.5%). */
    slippageBps: number;
}>;
type PrivatePreparationParameters = {
    /** Optional caller-supplied correlation id. @default Random bytes32 */
    actionId?: Hex.Hex | undefined;
    /** Gas reserved for the parent-chain callback. @default `10_000_000n` */
    callbackGas?: bigint | undefined;
    /** Public recipient if the parent-chain callback fails. @default `tempoRefundRecipient` */
    fallbackRecipient?: Address | undefined;
    /** Zone gateway address. */
    gateway: Address;
    /** Source Zone portal on the parent chain. @default Derived from `zoneId` */
    portalAddress?: Address | undefined;
    /** Encrypted recipient for the returned tokens. */
    recipient: Address;
    /** Optional memo encrypted with the returned Zone deposit. */
    returnMemo?: Hex.Hex | undefined;
    /** Refund recipient on the parent chain if the return deposit bounces. */
    tempoRefundRecipient: Address;
    /** Vault address. */
    vault: Address;
    /** Optional memo attached to the Zone withdrawal. */
    withdrawalMemo?: Hex.Hex | undefined;
    /** Source Zone receiving the output. */
    zoneId: number;
};
type PreparedZoneRequest = {
    /** Correlation id for the matching wait action. */
    actionId: Hex.Hex;
    /** Withdrawal amount, passed through to the Zone action. */
    amount: bigint;
    /** Gas reserved for the parent-chain callback. */
    callbackGas: bigint;
    /** Parent chain containing the gateway. */
    chainId: number;
    /** Encoded gateway callback. */
    data: Hex.Hex;
    /** Public recipient if the parent-chain callback fails. */
    fallbackRecipient: Address;
    /** Parent-chain block before the withdrawal is submitted. */
    fromBlock: bigint;
    /** Optional memo attached to the Zone withdrawal. */
    memo?: Hex.Hex | undefined;
    /** Zone gateway receiving the withdrawal. */
    to: Address;
    /** Token withdrawn from the Zone. */
    token: Address;
    /** Zone containing the withdrawn tokens. */
    zoneId: number;
};
//# sourceMappingURL=earn.d.ts.map