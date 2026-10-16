import * as Address from '../core/Address.js';
import * as Errors from '../core/Errors.js';
import * as Hex from '../core/Hex.js';
import * as AccountConfig from './AccountConfig.js';
import * as KeyAuthorization_ from './KeyAuthorization.js';
import * as SignatureEnvelope from './SignatureEnvelope.js';
import * as TxEnvelopeTempo from './TxEnvelopeTempo.js';
/** Fields shared by every account operation. */
export type Base<quantity = bigint> = {
    /** Root configurable account. */
    account: Address.Address;
    /** Every retained serialized owner approval. */
    approvals: readonly Hex.Hex[];
    /** Root configuration used to verify approvals. */
    config: AccountConfig.Config<quantity>;
    /** Unix creation time in milliseconds. */
    createdAt: number;
    /** Deterministic account operation hash. */
    hash: Hex.Hex;
    /** Number of approvals selected for quorum evaluation. */
    signatureCount: number;
    /** Required root owner weight. */
    threshold: number;
    /** Unix time of the last update in milliseconds. */
    updatedAt: number;
    /** Root owner weight reached by the selected approvals. */
    weight: number;
};
/** Account transaction approval operation. */
export type TransactionOperation<quantity = bigint> = Base<quantity> & {
    /** Time when another relay may reclaim the submission lease. */
    expiresAt?: number | undefined;
    /** Current operation state. */
    status: 'pending' | 'submitting' | 'success';
    /** Fencing token owned by the current submitter. */
    submissionId?: Hex.Hex | undefined;
    /** Canonical serialized Tempo envelope without its outer sender signature. */
    transaction: Hex.Hex;
    /** Hash returned after the downstream submitter accepts the transaction. */
    transactionHash?: Hex.Hex | undefined;
    /** Operation kind. */
    type: 'transaction';
};
/** Account key authorization approval operation. */
export type KeyAuthorizationOperation<quantity = bigint> = Base<quantity> & {
    /** Canonical serialized key authorization. */
    keyAuthorization: Hex.Hex;
    /** Current operation state. */
    status: 'pending' | 'success';
    /** Operation kind. */
    type: 'keyAuthorization';
};
/** Transaction or key authorization account operation. */
export type Operation<quantity = bigint> = TransactionOperation<quantity> | KeyAuthorizationOperation<quantity>;
/** JSON-RPC account transaction operation. */
export type TransactionRpc = TransactionOperation<Hex.Hex>;
/** JSON-RPC account key authorization operation. */
export type KeyAuthorizationRpc = KeyAuthorizationOperation<Hex.Hex>;
/** JSON-RPC account operation. */
export type Rpc = Operation<Hex.Hex>;
/**
 * Derives the deterministic hash for an account operation.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const hash = AccountOperation.getHash({
 *   account,
 *   config,
 *   transaction,
 *   type: 'transaction',
 * })
 * ```
 *
 * @param options - Operation payload and account identity.
 * @returns The operation hash signed by each owner.
 */
export declare function getHash(options: getHash.Options): Hex.Hex;
export declare namespace getHash {
    /** Parameters for `getHash`. */
    type Options = {
        /** Root configurable account. */
        account: Address.Address;
        /** Complete root account configuration witness. */
        config: AccountConfig.Config;
    } & ({
        /** Canonical serialized key authorization. */
        keyAuthorization: Hex.Hex;
        /** Operation kind. */
        type: 'keyAuthorization';
    } | {
        /** Canonical serialized Tempo envelope without its outer sender signature. */
        transaction: Hex.Hex;
        /** Operation kind. */
        type: 'transaction';
    });
    /** Error type for `getHash`. */
    type ErrorType = KeyAuthorization_.deserialize.ErrorType | KeyAuthorization_.getSignPayload.ErrorType | AccountConfig.getSignPayload.ErrorType | TxEnvelopeTempo.deserialize.ErrorType | TxEnvelopeTempo.getSignPayload.ErrorType | Errors.GlobalErrorType;
}
/**
 * Validates, deduplicates, and selects owner approvals for an operation.
 *
 * The function retains one canonical approval per owner. It selects the
 * smallest deterministic quorum by owner weight, then orders the selected
 * approvals by owner address for serialization. The caller supplies the
 * account and config; the chain validates their factory-derived identity.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const selection = await AccountOperation.selectApprovals({
 *   account,
 *   approvals,
 *   config,
 *   hash,
 * })
 * ```
 *
 * @param options - Approval selection parameters.
 * @returns The retained approvals and deterministic quorum selection.
 */
export declare function selectApprovals(options: selectApprovals.Options): Promise<selectApprovals.ReturnValue>;
export declare namespace selectApprovals {
    /** Parameters for `selectApprovals`. */
    type Options = {
        /** Root configurable account. */
        account: Address.Address;
        /** Serialized primitive owner approvals. */
        approvals: readonly SignatureEnvelope.Serialized[];
        /** Current root account configuration. */
        config: AccountConfig.Config;
        /** Deterministic operation hash approved by root owners. */
        hash: Hex.Hex;
    };
    /** Result of validating and selecting approvals. */
    type ReturnValue = {
        /** Every retained approval, ordered by owner address. */
        approvals: readonly SignatureEnvelope.Serialized[];
        /** Number of approvals selected for quorum evaluation. */
        signatureCount: number;
        /** Approvals selected for serialization, ordered by owner address. */
        selectedApprovals: readonly SignatureEnvelope.Serialized[];
        /** Required owner weight. */
        threshold: number;
        /** Owner weight reached by the selected approvals. */
        weight: number;
    };
    /** Error type for `selectApprovals`. */
    type ErrorType = InvalidApprovalError | AccountConfig.assert.ErrorType | AccountConfig.getSignPayload.ErrorType | SignatureEnvelope.CoercionError | SignatureEnvelope.extractAddress.ErrorType | SignatureEnvelope.serialize.ErrorType | SignatureEnvelope.VerificationError | Errors.GlobalErrorType;
}
/**
 * Serializes a key authorization with selected owner approvals.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const authorization = AccountOperation.serializeKeyAuthorization(
 *   keyAuthorization,
 *   {
 *     account,
 *     approvals: selection.selectedApprovals,
 *     config,
 *   },
 * )
 * ```
 *
 * @param keyAuthorization - Canonical serialized unsigned key authorization.
 * @param options - Configurable account, config, and selected approvals.
 * @returns The signed serialized key authorization.
 */
export declare function serializeKeyAuthorization(keyAuthorization: Hex.Hex, options: serializeKeyAuthorization.Options): Hex.Hex;
export declare namespace serializeKeyAuthorization {
    /** Options for `serializeKeyAuthorization`. */
    type Options = {
        /** Root configurable account. */
        account: Address.Address;
        /** Selected serialized owner approvals. */
        approvals: readonly SignatureEnvelope.Serialized[];
        /** Complete applicable root account config. */
        config: AccountConfig.Config;
    };
    /** Error type for `serializeKeyAuthorization`. */
    type ErrorType = InvalidOperationError | KeyAuthorization_.deserialize.ErrorType | KeyAuthorization_.from.ErrorType | KeyAuthorization_.getSignPayload.ErrorType | KeyAuthorization_.serialize.ErrorType | AccountConfig.assert.ErrorType | SignatureEnvelope.assert.ErrorType | SignatureEnvelope.InvalidSerializedError | SignatureEnvelope.sortApprovals.ErrorType | Errors.GlobalErrorType;
}
/**
 * Serializes an account transaction operation with selected owner approvals.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const transaction = AccountOperation.serializeTransaction(operation, {
 *   approvals: selection.selectedApprovals,
 * })
 * ```
 *
 * @param operation - Account transaction operation.
 * @param options - Transaction serialization options.
 * @returns The signed serialized Tempo transaction.
 */
export declare function serializeTransaction(operation: TransactionOperation, options: serializeTransaction.Options): TxEnvelopeTempo.Serialized;
export declare namespace serializeTransaction {
    /** Options for `serializeTransaction`. */
    type Options = {
        /** Selected retained approvals to attach to the transaction. */
        approvals: readonly SignatureEnvelope.Serialized[];
    };
    /** Error type for `serializeTransaction`. */
    type ErrorType = from.ErrorType | InvalidOperationError | SignatureEnvelope.sortApprovals.ErrorType | TxEnvelopeTempo.deserialize.ErrorType | TxEnvelopeTempo.getSignPayload.ErrorType | TxEnvelopeTempo.serialize.ErrorType | Errors.GlobalErrorType;
}
/**
 * Validates and normalizes an account operation.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const operation = AccountOperation.from(value)
 * ```
 *
 * @param operation - Account operation.
 * @returns The validated operation.
 */
export declare function from<const operation extends Operation>(operation: operation): from.ReturnValue<operation>;
export declare namespace from {
    /** Return type for `from`. */
    type ReturnValue<operation extends Operation> = operation extends TransactionOperation ? TransactionOperation : KeyAuthorizationOperation;
    /** Error type for `from`. */
    type ErrorType = InvalidOperationError | Errors.GlobalErrorType;
}
/**
 * Converts a JSON-RPC account operation to its domain representation.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const operation = AccountOperation.fromRpc(value)
 * ```
 *
 * @param operation - JSON-RPC account operation.
 * @returns The validated operation.
 */
export declare function fromRpc<const operation extends Rpc>(operation: operation): fromRpc.ReturnValue<operation>;
export declare namespace fromRpc {
    /** Return type for `fromRpc`. */
    type ReturnValue<operation extends Rpc> = operation extends TransactionRpc ? TransactionOperation : KeyAuthorizationOperation;
    /** Error type for `fromRpc`. */
    type ErrorType = InvalidOperationError | Errors.GlobalErrorType;
}
/**
 * Converts an account operation to its JSON-RPC representation.
 *
 * @example
 * ```ts twoslash
 * // @noErrors
 * import { AccountOperation } from 'ox/tempo'
 *
 * const operationRpc = AccountOperation.toRpc(operation)
 * ```
 *
 * @param operation - Account operation.
 * @returns The JSON-RPC operation.
 */
export declare function toRpc<const operation extends Operation>(operation: operation): toRpc.ReturnValue<operation>;
export declare namespace toRpc {
    /** Return type for `toRpc`. */
    type ReturnValue<operation extends Operation> = operation extends TransactionOperation ? TransactionRpc : KeyAuthorizationRpc;
    /** Error type for `toRpc`. */
    type ErrorType = from.ErrorType | AccountConfig.toRpc.ErrorType;
}
/** Thrown when an account operation owner approval is invalid. */
export declare class InvalidApprovalError extends Errors.BaseError<Error | undefined> {
    readonly name = "AccountOperation.InvalidApprovalError";
    /**
     * Creates an invalid operation approval error.
     *
     * @example
     * ```ts twoslash
     * import { AccountOperation } from 'ox/tempo'
     *
     * throw new AccountOperation.InvalidApprovalError({
     *   reason: 'signature is from a non-owner',
     * })
     * ```
     *
     * @param options - Error options.
     */
    constructor(options?: InvalidApprovalError.Options);
}
export declare namespace InvalidApprovalError {
    /** Error construction options. */
    type Options = {
        /** Underlying error. */
        cause?: unknown | undefined;
        /** Validation failure. */
        reason?: string | undefined;
    };
}
/** Thrown when an account operation is malformed or internally inconsistent. */
export declare class InvalidOperationError extends Errors.BaseError<Error | undefined> {
    readonly name = "AccountOperation.InvalidOperationError";
    /**
     * Creates an invalid account operation error.
     *
     * @example
     * ```ts twoslash
     * import { AccountOperation } from 'ox/tempo'
     *
     * throw new AccountOperation.InvalidOperationError({
     *   reason: 'hash does not match the operation payload',
     * })
     * ```
     *
     * @param options - Error options.
     */
    constructor(options?: InvalidOperationError.Options);
}
export declare namespace InvalidOperationError {
    /** Error construction options. */
    type Options = {
        /** Underlying error. */
        cause?: unknown | undefined;
        /** Validation failure. */
        reason?: string | undefined;
    };
}
//# sourceMappingURL=AccountOperation.d.ts.map