import type { Address } from 'abitype';
import * as Hex from 'ox/Hex';
import * as PublicKey from 'ox/PublicKey';
import { TokenId, ZoneRpcAuthentication } from 'ox/tempo';
import type { Account } from '../../accounts/types.js';
import { type MulticallErrorType, type MulticallParameters } from '../../actions/public/multicall.js';
import { type ReadContractErrorType } from '../../actions/public/readContract.js';
import { type PrepareTransactionRequestErrorType, type PrepareTransactionRequestRequest, type PrepareTransactionRequestReturnType } from '../../actions/wallet/prepareTransactionRequest.js';
import { type SendTransactionReturnType } from '../../actions/wallet/sendTransaction.js';
import type { Client } from '../../clients/createClient.js';
import type { Transport } from '../../clients/transports/createTransport.js';
import type { BaseErrorType } from '../../errors/base.js';
import type { Chain, GetChainParameter } from '../../types/chain.js';
import type { Compute, IsUndefined, MaybeRequired, UnionOmit } from '../../types/utils.js';
import type { RequestErrorType } from '../../utils/buildRequest.js';
import { type ObserveErrorType } from '../../utils/observe.js';
import { type PollErrorType } from '../../utils/poll.js';
import type * as Errors from '../errors.js';
import { type WaitForTempoBlockTimeoutErrorType } from '../errors.js';
import type { GetAccountParameter, ReadParameters, WriteParameters, WriteSyncParameters } from '../internal/types.js';
import * as Store from '../Store.js';
import type { TransactionReceipt } from '../Transaction.js';
export type EncryptedPayload = {
    ciphertext: Hex.Hex;
    ephemeralPubkeyX: Hex.Hex;
    ephemeralPubkeyYParity: number;
    nonce: Hex.Hex;
    tag: Hex.Hex;
};
export type PreparedEncryptedDeposit = {
    /** Amount of tokens to deposit. */
    amount: bigint;
    /** Parent chain ID (e.g. `42431` for moderato). */
    chainId: number;
    /** Encrypted deposit payload. */
    encrypted: EncryptedPayload;
    /** Encryption key index from the portal contract. */
    keyIndex: bigint;
    /** Zone portal address on the parent chain. */
    portalAddress: Address;
    /** Address that will call the Zone portal. */
    sender: Address;
    /** Refund recipient on the parent chain if the deposit bounces. */
    tempoRefundRecipient: Address;
    /** Token address or ID to deposit. */
    token: TokenId.TokenIdOrAddress;
    /** Zone ID (e.g. `7`). */
    zoneId: number;
};
export type PreparedEncryptedDepositRecipient = {
    /** Parent chain ID (e.g. `42431` for moderato). */
    chainId: number;
    /** Encrypted recipient and memo payload. */
    encrypted: EncryptedPayload;
    /** Encryption key index from the portal contract. */
    keyIndex: bigint;
    /** Zone portal address on the parent chain. */
    portalAddress: Address;
    /** Address that will call the Zone portal. */
    sender: Address;
    /** Zone ID (e.g. `7`). */
    zoneId: number;
};
/**
 * Deposits tokens into a zone on the parent Tempo chain.
 * Batches approve and deposit into a single transaction.
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
 * const hash = await Actions.zone.deposit(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Deposit parameters.
 * @returns The transaction hash.
 */
export declare function deposit<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: deposit.Parameters<chain, account>): Promise<deposit.ReturnValue>;
export declare namespace deposit {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Omit<Args, 'recipient' | 'tempoRefundRecipient'> & {
        /** Recipient address in the zone. @default `account.address` */
        recipient?: Address | undefined;
        /** Refund recipient on the parent chain. @default `account.address` */
        tempoRefundRecipient?: Address | undefined;
    };
    type Args = {
        /** Amount of tokens to deposit. */
        amount: bigint;
        /** Optional deposit memo. @default `0x00...00` */
        memo?: Hex.Hex | undefined;
        /** Zone portal address. @default derived from `zoneId`. */
        portalAddress?: Address | undefined;
        /** Recipient address in the zone. */
        recipient: Address;
        /** Refund recipient on the parent chain if the deposit bounces. */
        tempoRefundRecipient: Address;
        /** Token address or ID to deposit. */
        token: TokenId.TokenIdOrAddress;
        /** Zone ID (e.g. `7`). */
        zoneId: number;
    };
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Defines the calls to approve and deposit tokens into a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
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
            readonly name: "deposit";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "token";
            }, {
                readonly type: "uint128";
                readonly name: "amount";
            }, {
                readonly type: "uint256";
                readonly name: "keyIndex";
            }, {
                readonly type: "tuple";
                readonly name: "encrypted";
                readonly components: readonly [{
                    readonly type: "bytes32";
                    readonly name: "ephemeralPubkeyX";
                }, {
                    readonly type: "uint8";
                    readonly name: "ephemeralPubkeyYParity";
                }, {
                    readonly type: "bytes";
                    readonly name: "ciphertext";
                }, {
                    readonly type: "bytes12";
                    readonly name: "nonce";
                }, {
                    readonly type: "bytes16";
                    readonly name: "tag";
                }];
            }, {
                readonly type: "address";
                readonly name: "tempoRefundRecipient";
            }];
            readonly outputs: readonly [{
                readonly type: "bytes32";
                readonly name: "newCurrentDepositQueueHash";
            }];
        } | {
            readonly name: "deposit";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "_token";
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
                readonly type: "address";
                readonly name: "tempoRefundRecipient";
            }];
            readonly outputs: readonly [{
                readonly type: "bytes32";
            }];
        }];
        functionName: "deposit";
    } & {
        args: readonly [token: `0x${string}`, amount: bigint, bigint, {
            ephemeralPubkeyX: `0x${string}`;
            ephemeralPubkeyYParity: number;
            ciphertext: `0x${string}`;
            nonce: `0x${string}`;
            tag: `0x${string}`;
        }, `0x${string}`] | readonly [_token: `0x${string}`, to: `0x${string}`, amount: bigint, memo: `0x${string}`, `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
}
/**
 * Deposits tokens into a zone on the parent Tempo chain and waits for the
 * transaction receipt.
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
 * const result = await Actions.zone.depositSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Deposit parameters.
 * @returns The transaction receipt.
 */
export declare function depositSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: depositSync.Parameters<chain, account>): Promise<depositSync.ReturnValue>;
export declare namespace depositSync {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = deposit.Parameters<chain, account>;
    type Args = deposit.Args;
    type ReturnValue = Compute<{
        /** Transaction receipt. */
        receipt: TransactionReceipt;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Gets the active sequencer encryption key for a zone.
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
 * const { keyIndex, publicKey } = await Actions.zone.getEncryptionKey(client, {
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Public client connected to the parent Tempo chain.
 * @param parameters - Zone encryption key parameters.
 * @returns The active encryption key and its zero-based index.
 */
export declare function getEncryptionKey<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getEncryptionKey.Parameters): Promise<getEncryptionKey.ReturnValue>;
export declare namespace getEncryptionKey {
    type Parameters = UnionOmit<MulticallParameters, 'allowFailure' | 'account' | 'batchSize' | 'contracts' | 'deployless' | 'multicallAddress'> & Args & {
        /** Account used for the contract reads. */
        account?: Account | Address | undefined;
    };
    type Args = {
        /** Zone portal address. @default derived from `zoneId`. */
        portalAddress?: Address | undefined;
        /** Zone ID (e.g. `7`). */
        zoneId: number;
    };
    type ReturnValue = Compute<{
        /** Zero-based encryption key index. */
        keyIndex: bigint;
        /** Active sequencer encryption public key. */
        publicKey: {
            /** SEC1 compressed public key prefix. */
            prefix: 2 | 3;
            x: Hex.Hex;
        };
    }>;
    type ErrorType = MulticallErrorType | PublicKey.assert.ErrorType | BaseErrorType;
    /**
     * Defines calls to the encryption key count and active sequencer key.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: {
        portalAddress: Address;
    }): readonly [{
        abi: [{
            readonly name: "encryptionKeyCount";
            readonly type: "function";
            readonly stateMutability: "view";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly type: "uint256";
            }];
        }];
        functionName: "encryptionKeyCount";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, {
        abi: [{
            readonly name: "sequencerEncryptionKey";
            readonly type: "function";
            readonly stateMutability: "view";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly type: "bytes32";
                readonly name: "x";
            }, {
                readonly type: "uint8";
                readonly name: "yParity";
            }];
        }];
        functionName: "sequencerEncryptionKey";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }];
}
/**
 * Gets metadata and configuration for a zone portal.
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
 * const info = await Actions.zone.getPortalInfo(client, {
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Public client connected to the parent Tempo chain.
 * @param parameters - Zone portal parameters.
 * @returns The portal metadata and configuration.
 */
export declare function getPortalInfo<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: getPortalInfo.Parameters): Promise<getPortalInfo.ReturnValue>;
export declare namespace getPortalInfo {
    type Parameters = ReadParameters & Args;
    type Args = {
        /** Zone portal address. @default derived from `zoneId`. */
        portalAddress?: Address | undefined;
        /** Zone ID (e.g. `7`). */
        zoneId: number;
    };
    type ReturnValue = Compute<{
        /** Portal governance admin. */
        admin: Address;
        /** Tokens enabled for deposits into the zone. */
        enabledTokens: readonly Address[];
        /** Zone messenger assigned to the portal. */
        messenger: Address;
        /** Timestamp when the current emergency pause expires. */
        pauseExpiry: bigint;
        /** Whether the portal is paused. */
        paused: boolean;
        /** Pending governance admin. */
        pendingAdmin: Address;
        /** Active sequencer addresses. */
        sequencers: readonly Address[];
        /** Version of the active sequencer set. */
        sequencerSetVersion: bigint;
        /** Number of sequencers required to attest to a settlement. */
        sequencerThreshold: number;
        /** Settlement verifier assigned to the portal. */
        verifier: Address;
    }>;
    type ErrorType = ReadContractErrorType | BaseErrorType;
}
/**
 * Deposits tokens into a zone on the parent Tempo chain with encrypted
 * recipient and memo. Batches approve and depositEncrypted into a single
 * transaction.
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
 * const hash = await Actions.zone.encryptedDeposit(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Encrypted deposit parameters.
 * @returns The transaction hash.
 */
export declare function encryptedDeposit<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: encryptedDeposit.Parameters<chain, account>): Promise<encryptedDeposit.ReturnValue>;
export declare namespace encryptedDeposit {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & ((Omit<Args, 'chainId' | 'encrypted' | 'keyIndex' | 'recipient' | 'tempoRefundRecipient'> & {
        /** Recipient address in the zone. @default `account.address` */
        recipient?: Address | undefined;
        /** Refund recipient on the parent chain. @default `account.address` */
        tempoRefundRecipient?: Address | undefined;
    }) | PreparedEncryptedDeposit);
    type Args = {
        /** Amount of tokens to deposit. */
        amount: bigint;
        /** Parent chain ID (e.g. `42431` for moderato). */
        chainId: number;
        /** Encrypted deposit payload. */
        encrypted: EncryptedPayload;
        /** Encryption key index from the portal contract. */
        keyIndex: bigint;
        /** Optional deposit memo. @default `0x00...00` */
        memo?: Hex.Hex | undefined;
        /** Zone portal address. @default derived from `zoneId`. */
        portalAddress?: Address | undefined;
        /** Recipient address in the zone. */
        recipient: Address;
        /** Refund recipient on the parent chain if the deposit bounces. */
        tempoRefundRecipient: Address;
        /** Token address or ID to deposit. */
        token: TokenId.TokenIdOrAddress;
        /** Zone ID (e.g. `7`). */
        zoneId: number;
    };
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Prepares an encrypted deposit instruction without broadcasting it.
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
     * const prepared = await Actions.zone.encryptedDeposit.prepare(client, {
     *   token: '0x20c0...0001',
     *   amount: 1_000_000n,
     *   recipient: '0x...',
     *   sender: '0x...',
     *   tempoRefundRecipient: '0x...',
     *   zoneId: 7,
     * })
     * ```
     *
     * @param client - Public client connected to the parent Tempo chain.
     * @param parameters - Encrypted deposit preparation parameters.
     * @returns A prepared encrypted deposit instruction.
     */
    function prepare<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: prepare.Parameters<account>): Promise<prepare.ReturnValue>;
    namespace prepare {
        type Parameters<account extends Account | undefined = Account | undefined> = ReadParameters & Omit<Args, 'sender'> & MaybeRequired<{
            /** Address that will call the Zone portal. @default `client.account.address` */
            sender?: Address | undefined;
        }, IsUndefined<account>>;
        type Args = {
            /** Amount of tokens to deposit. */
            amount: bigint;
            /** Optional deposit memo. @default `0x00...00` */
            memo?: Hex.Hex | undefined;
            /** Zone portal address. @default derived from `zoneId`. */
            portalAddress?: Address | undefined;
            /** Recipient address in the zone. */
            recipient: Address;
            /** Address that will call the Zone portal. */
            sender: Address;
            /** Refund recipient on the parent chain if the deposit bounces. */
            tempoRefundRecipient: Address;
            /** Token address or ID to deposit. */
            token: TokenId.TokenIdOrAddress;
            /** Zone ID (e.g. `7`). */
            zoneId: number;
        };
        type ReturnValue = PreparedEncryptedDeposit;
        type ErrorType = getEncryptionKey.ErrorType | BaseErrorType;
    }
    /**
     * Prepares encrypted Zone recipient instructions without constructing a token
     * deposit.
     *
     * Use this when another contract or service controls the token movement and
     * only needs the ZonePortal `keyIndex` and encrypted recipient payload.
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
     * const recipient = await Actions.zone.encryptedDeposit.prepareRecipient(client, {
     *   recipient: '0x...',
     *   sender: '0x...',
     *   zoneId: 7,
     * })
     * ```
     *
     * @param client - Public client connected to the parent Tempo chain.
     * @param parameters - Encrypted recipient preparation parameters.
     * @returns Prepared encrypted recipient instructions.
     */
    function prepareRecipient<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: prepareRecipient.Parameters<account>): Promise<prepareRecipient.ReturnValue>;
    namespace prepareRecipient {
        type Parameters<account extends Account | undefined = Account | undefined> = ReadParameters & Omit<Args, 'sender'> & MaybeRequired<{
            /** Address that will call the Zone portal. @default `client.account.address` */
            sender?: Address | undefined;
        }, IsUndefined<account>>;
        type Args = {
            /** Optional deposit memo. @default `0x00...00` */
            memo?: Hex.Hex | undefined;
            /** Zone portal address. @default derived from `zoneId`. */
            portalAddress?: Address | undefined;
            /** Recipient address in the zone. */
            recipient: Address;
            /** Address that will call the Zone portal. */
            sender: Address;
            /** Zone ID (e.g. `7`). */
            zoneId: number;
        };
        type ReturnValue = PreparedEncryptedDepositRecipient;
        type ErrorType = getEncryptionKey.ErrorType | BaseErrorType;
    }
    /**
     * Defines the calls to approve and deposit tokens into a zone (encrypted).
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args: Args | PreparedEncryptedDeposit): (({
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
            readonly name: "depositEncrypted";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "token";
            }, {
                readonly type: "uint128";
                readonly name: "amount";
            }, {
                readonly type: "uint256";
                readonly name: "keyIndex";
            }, {
                readonly type: "tuple";
                readonly name: "encrypted";
                readonly components: readonly [{
                    readonly type: "bytes32";
                    readonly name: "ephemeralPubkeyX";
                }, {
                    readonly type: "uint8";
                    readonly name: "ephemeralPubkeyYParity";
                }, {
                    readonly type: "bytes";
                    readonly name: "ciphertext";
                }, {
                    readonly type: "bytes12";
                    readonly name: "nonce";
                }, {
                    readonly type: "bytes16";
                    readonly name: "tag";
                }];
            }, {
                readonly type: "address";
                readonly name: "tempoRefundRecipient";
            }];
            readonly outputs: readonly [{
                readonly type: "bytes32";
                readonly name: "newCurrentDepositQueueHash";
            }];
        }];
        functionName: "depositEncrypted";
    } & {
        args: readonly [token: `0x${string}`, amount: bigint, bigint, {
            ephemeralPubkeyX: `0x${string}`;
            ephemeralPubkeyYParity: number;
            ciphertext: `0x${string}`;
            nonce: `0x${string}`;
            tag: `0x${string}`;
        }, `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }))[];
}
/**
 * Deposits tokens into a zone on the parent Tempo chain with encrypted
 * recipient and memo, and waits for the transaction receipt.
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
 * const result = await Actions.zone.encryptedDepositSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Encrypted deposit parameters.
 * @returns The transaction receipt.
 */
export declare function encryptedDepositSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: encryptedDepositSync.Parameters<chain, account>): Promise<encryptedDepositSync.ReturnValue>;
export declare namespace encryptedDepositSync {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = encryptedDeposit.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type Args = encryptedDeposit.Args;
    type ReturnValue = Compute<{
        /** Transaction receipt. */
        receipt: TransactionReceipt;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Returns the authenticated account address and authorization token expiry.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.getAuthorizationTokenInfo(client)
 * ```
 *
 * @param client - Zone client.
 * @returns Authorization token info.
 */
export declare function getAuthorizationTokenInfo<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>): Promise<getAuthorizationTokenInfo.ReturnType>;
export declare namespace getAuthorizationTokenInfo {
    type RpcReturnType = {
        account: Address;
        expiresAt: Hex.Hex;
    };
    type ReturnType = {
        account: Address;
        expiresAt: bigint;
    };
    type ErrorType = RequestErrorType | BaseErrorType;
}
/**
 * Returns the fee required for a withdrawal from a zone, given a callback gas
 * limit.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const fee = await Actions.zone.getWithdrawalFee(client)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Optional callback gas limit parameter.
 * @returns The withdrawal fee as a bigint.
 */
export declare function getWithdrawalFee<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters?: getWithdrawalFee.Parameters): Promise<getWithdrawalFee.ReturnType>;
export declare namespace getWithdrawalFee {
    type Parameters = ReadParameters & {
        /** Gas limit reserved for the withdrawal callback on the parent chain. @default `0n` */
        callbackGas?: bigint | undefined;
    };
    type ReturnType = bigint;
    type ErrorType = Errors.ExecutionErrorType | RequestErrorType | BaseErrorType;
}
/**
 * Returns the current zone metadata.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.getZoneInfo(client)
 * ```
 *
 * @param client - Zone client.
 * @returns Zone metadata.
 */
export declare function getZoneInfo<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>): Promise<getZoneInfo.ReturnType>;
export declare namespace getZoneInfo {
    type RpcReturnType = {
        /** Zone chain ID. */
        chainId: Hex.Hex;
        /** Latest Tempo block imported by the zone. */
        tempoBlockNumber?: Hex.Hex | undefined;
        /** Zone ID. */
        zoneId: Hex.Hex;
        /** Enabled zone token addresses. */
        zoneTokens: readonly Address[];
    } & ({
        /** Active sequencer addresses. */
        sequencers: readonly Address[];
    } | {
        /** Active sequencer address. */
        sequencer: Address;
    });
    type ReturnType = {
        /** Zone chain ID. */
        chainId: number;
        /** Active sequencer addresses. */
        sequencers: readonly Address[];
        /** Latest Tempo block imported by the zone. */
        tempoBlockNumber: bigint;
        /** Zone ID. */
        zoneId: number;
        /** Enabled zone token addresses. */
        zoneTokens: readonly Address[];
    };
    type ErrorType = RequestErrorType | BaseErrorType;
}
/**
 * Waits for a zone to import a Tempo block.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.waitForTempoBlock(client, {
 *   tempoBlockNumber: 42n,
 * })
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Tempo block number and polling options.
 * @returns Zone metadata after the block has been imported.
 */
export declare function waitForTempoBlock<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: waitForTempoBlock.Parameters): Promise<waitForTempoBlock.ReturnType>;
export declare namespace waitForTempoBlock {
    type Parameters = {
        /** Polling frequency in milliseconds. @default `client.pollingInterval` */
        pollingInterval?: number | undefined;
        /** Tempo block number to wait for. */
        tempoBlockNumber: bigint;
        /** Timeout in milliseconds. @default `60_000` */
        timeout?: number | undefined;
    };
    type ReturnType = getZoneInfo.ReturnType;
    type ErrorType = getZoneInfo.ErrorType | ObserveErrorType | PollErrorType | WaitForTempoBlockTimeoutErrorType;
}
/**
 * Requests a withdrawal from a zone to the parent Tempo chain via the
 * ZoneOutbox contract.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.zone.requestWithdrawal(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Withdrawal parameters.
 * @returns The transaction hash.
 */
export declare function requestWithdrawal<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: requestWithdrawal.Parameters<chain, account>): Promise<requestWithdrawal.ReturnValue>;
export declare namespace requestWithdrawal {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Omit<Args, 'to'> & {
        /** Recipient address on the parent Tempo chain. @default `account.address` */
        to?: Address | undefined;
    };
    type Args = {
        /** Amount of tokens to withdraw. */
        amount: bigint;
        /** Gas limit reserved for the withdrawal callback on the parent chain. @default `0n` */
        callbackGas?: bigint | undefined;
        /** Optional callback data for the recipient. @default `'0x'` */
        data?: Hex.Hex | undefined;
        /** Fallback address if callback fails. @default `to` */
        fallbackRecipient?: Address | undefined;
        /** Optional withdrawal memo. @default `0x00...00` */
        memo?: Hex.Hex | undefined;
        /** Recipient address on the parent Tempo chain. */
        to: Address;
        /** Token address or ID to withdraw. */
        token: TokenId.TokenIdOrAddress;
    };
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Defines the calls to approve and request a withdrawal from a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
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
    /**
     * Prepares a zone withdrawal transaction request without broadcasting it.
     *
     * Use this to inspect or modify the populated ZoneOutbox transaction request
     * and its maximum transaction fee before submitting a withdrawal.
     *
     * @example
     * ```ts
     * import { createClient } from 'viem'
     * import { Actions, http, Zone } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: Zone.a,
     *   transport: http(),
     * })
     *
     * const prepared = await Actions.zone.requestWithdrawal.prepare(client, {
     *   token: '0x20c0...0001',
     *   amount: 1_000_000n,
     *   to: '0x...',
     * })
     *
     * console.log(prepared.maxFee)
     * console.log(prepared.request.gas)
     * ```
     *
     * @param client - Zone client.
     * @param parameters - Withdrawal preparation parameters.
     * @returns The prepared transaction request, maximum fee, and withdrawal details.
     */
    function prepare<chain extends Chain | undefined, account extends Account | undefined, chainOverride extends Chain | undefined = undefined, accountOverride extends Account | Address | undefined = undefined>(client: Client<Transport, chain, account>, parameters: prepare.Parameters<chain, account, chainOverride, accountOverride>): Promise<prepare.ReturnType<chain, account, chainOverride, accountOverride>>;
    namespace prepare {
        type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined, chainOverride extends Chain | undefined = Chain | undefined, accountOverride extends Account | Address | undefined = Account | Address | undefined> = UnionOmit<WriteParameters<chain, account>, 'account' | 'chain' | 'throwOnReceiptRevert'> & GetAccountParameter<account, accountOverride, false> & GetChainParameter<chain, chainOverride> & PrepareArgs;
        type PrepareArgs = Omit<Args, 'to'> & {
            /** Recipient address on the parent Tempo chain. @default `account.address` */
            to?: Address | undefined;
        };
        type ReturnType<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined, chainOverride extends Chain | undefined = Chain | undefined, accountOverride extends Account | Address | undefined = Account | Address | undefined> = Compute<{
            /** Amount of tokens to withdraw. */
            amount: bigint;
            /** Gas limit reserved for the callback on the parent chain. */
            callbackGas: bigint;
            /** Callback data for the recipient. */
            data: Hex.Hex;
            /** Fallback address if the callback fails. */
            fallbackRecipient: Address;
            /** Maximum Zone transaction fee in fee-token base units. */
            maxFee: bigint;
            /** Withdrawal memo. */
            memo: Hex.Hex;
            /** Prepared Zone transaction request. */
            request: PrepareTransactionRequestReturnType<chain, account, chainOverride, accountOverride, PrepareTransactionRequestRequest<chain, chainOverride> & {
                calls: WithdrawalCalls;
            }>;
            /** Recipient address on the parent Tempo chain. */
            to: Address;
            /** Token address or ID to withdraw. */
            token: TokenId.TokenIdOrAddress;
        }>;
        type ErrorType = PrepareTransactionRequestErrorType | BaseErrorType;
    }
}
type WithdrawalCalls = ReturnType<typeof requestWithdrawal.calls>;
/**
 * Requests a withdrawal from a zone to the parent Tempo chain and waits for
 * the transaction receipt.
 *
 * @example
 * ```ts
 * import { createClient, createPublicClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Abis, Actions, Addresses, http as zoneHttp, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: zoneHttp(),
 * })
 *
 * const { receipt, senderTag } =
 *   await Actions.zone.requestWithdrawalSync(client, {
 *     amount: 1_000_000n,
 *     token: '0x20c0...0001',
 *   })
 *
 * // `senderTag` identifies the indexed WithdrawalProcessed event emitted on
 * // the parent Tempo chain after the withdrawal is processed.
 * const tempoClient = createPublicClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const [withdrawal] = await tempoClient.getContractEvents({
 *   address: Addresses.zonePortal(Zone.a.id),
 *   abi: Abis.zonePortal,
 *   eventName: 'WithdrawalProcessed',
 *   args: { senderTag },
 *   fromBlock: 0n,
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Withdrawal parameters.
 * @returns The transaction receipt and sender tag for the parent-chain withdrawal event.
 */
export declare function requestWithdrawalSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: requestWithdrawalSync.Parameters<chain, account>): Promise<requestWithdrawalSync.ReturnValue>;
export declare namespace requestWithdrawalSync {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = requestWithdrawal.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type Args = requestWithdrawal.Args;
    type ReturnValue = Compute<{
        /** Transaction receipt. */
        receipt: TransactionReceipt;
        /** Sender tag identifying the indexed parent-chain `WithdrawalProcessed` event. */
        senderTag: Hex.Hex;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Requests a verifiable withdrawal from a zone to the parent Tempo chain via
 * the ZoneOutbox contract. Includes a `revealTo` public key so the sequencer
 * can encrypt the withdrawal details.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.zone.requestVerifiableWithdrawal(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   revealTo: '0x02abc...def',
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Verifiable withdrawal parameters.
 * @returns The transaction hash.
 */
export declare function requestVerifiableWithdrawal<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: requestVerifiableWithdrawal.Parameters<chain, account>): Promise<requestVerifiableWithdrawal.ReturnValue>;
export declare namespace requestVerifiableWithdrawal {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & Omit<Args, 'to'> & {
        /** Recipient address on the parent Tempo chain. @default `account.address` */
        to?: Address | undefined;
    };
    type Args = requestWithdrawal.Args & {
        /** 33-byte compressed secp256k1 public key for encrypted reveal. */
        revealTo: Hex.Hex;
    };
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /**
     * Defines the calls to approve and request a verifiable withdrawal from a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
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
 * Requests a verifiable withdrawal from a zone to the parent Tempo chain and
 * waits for the transaction receipt.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const result = await Actions.zone.requestVerifiableWithdrawalSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   revealTo: '0x02abc...def',
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Verifiable withdrawal parameters.
 * @returns The transaction receipt.
 */
export declare function requestVerifiableWithdrawalSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: requestVerifiableWithdrawalSync.Parameters<chain, account>): Promise<requestVerifiableWithdrawalSync.ReturnValue>;
export declare namespace requestVerifiableWithdrawalSync {
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = requestVerifiableWithdrawal.Parameters<chain, account> & WriteSyncParameters<chain, account>;
    type Args = requestVerifiableWithdrawal.Args;
    type ReturnValue = Compute<{
        /** Transaction receipt. */
        receipt: TransactionReceipt;
    }>;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Signs a zone authorization token and stores it for the zone HTTP transport.
 *
 * The `zoneId` is derived from `ZoneId.fromChainId(chain.id)` and can be overridden.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const result = await Actions.zone.signAuthorizationToken(client)
 * ```
 *
 * @param client - Zone wallet client.
 * @param parameters - Options including optional store override.
 * @returns The authentication object and serialized token.
 */
export declare function signAuthorizationToken<chain extends Chain | undefined, account extends Account | undefined, accountOverride extends Account | Address | undefined = undefined>(client: Client<Transport, chain, account>, parameters?: signAuthorizationToken.Parameters<account, accountOverride>): Promise<signAuthorizationToken.ReturnType>;
export declare namespace signAuthorizationToken {
    type Parameters<account extends Account | undefined = Account | undefined, accountOverride extends Account | Address | undefined = Account | Address | undefined> = GetAccountParameter<account, accountOverride> & {
        /** Chain override. @default `client.chain`. */
        chain?: Chain | undefined;
        /** Token expiry as a unix timestamp (seconds). @default `issuedAt + 86_400`. */
        expiresAt?: number | undefined;
        /** Token issue time as a unix timestamp (seconds). @default `Date.now() / 1000`. */
        issuedAt?: number | undefined;
        /** Store used to persist the token. @default sessionStorage (web) or memory (server). */
        store?: Store.Store | undefined;
        /** Zone ID to scope the token to (`0` for unscoped). @default derived from `chain.id`. */
        zoneId?: number | undefined;
    };
    type ReturnType = {
        authentication: ZoneRpcAuthentication.ZoneRpcAuthentication;
        token: Hex.Hex;
    };
    type ErrorType = BaseErrorType;
}
export {};
//# sourceMappingURL=zone.d.ts.map