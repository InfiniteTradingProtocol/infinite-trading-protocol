import * as Address from '../core/Address.js';
import * as Errors from '../core/Errors.js';
import * as Hash from '../core/Hash.js';
import * as Hex from '../core/Hex.js';
import * as AccountConfig from './AccountConfig.js';
import * as KeyAuthorization_ from './KeyAuthorization.js';
import * as SignatureEnvelope from './SignatureEnvelope.js';
import * as TxEnvelopeTempo from './TxEnvelopeTempo.js';
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
export function getHash(options) {
    const { account, config } = options;
    const payload = options.type === 'transaction'
        ? TxEnvelopeTempo.getSignPayload(TxEnvelopeTempo.deserialize(options.transaction))
        : KeyAuthorization_.getSignPayload(KeyAuthorization_.deserialize(options.keyAuthorization));
    return AccountConfig.getSignPayload({
        account,
        config,
        payload,
    });
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
export async function selectApprovals(options) {
    const { account, approvals, hash } = options;
    if (!Address.validate(account) || Hex.toBigInt(account) === 0n)
        throw new InvalidApprovalError({ reason: 'account is invalid' });
    if (!Hash.validate(hash))
        throw new InvalidApprovalError({ reason: 'hash is invalid' });
    const config = AccountConfig.from(options.config);
    return selectApprovals_internal({
        account,
        approvals,
        config,
        hash,
    });
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
export function serializeKeyAuthorization(keyAuthorization, options) {
    const authorization = KeyAuthorization_.deserialize(keyAuthorization);
    if (authorization.signature)
        throw new InvalidOperationError({
            reason: 'keyAuthorization must not contain a signature',
        });
    if (KeyAuthorization_.serialize(authorization).toLowerCase() !==
        keyAuthorization.toLowerCase())
        throw new InvalidOperationError({
            reason: 'keyAuthorization is not canonically serialized',
        });
    const config = AccountConfig.from(options.config);
    const signatures = SignatureEnvelope.sortApprovals({
        account: options.account,
        config,
        payload: KeyAuthorization_.getSignPayload(authorization),
        signatures: options.approvals.map((approval) => assertApproval(options.account, approval, config)),
    });
    return KeyAuthorization_.serialize(KeyAuthorization_.from(authorization, {
        signature: SignatureEnvelope.from({
            account: options.account,
            config,
            signatures,
        }),
    }));
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
export function serializeTransaction(operation, options) {
    const value = from(operation);
    const envelope = TxEnvelopeTempo.deserialize(value.transaction);
    const approvals = options.approvals.map((approval) => assertApproval(value.account, approval, value.config));
    assertRetainedApprovals(value, approvals);
    const signatures = SignatureEnvelope.sortApprovals({
        account: value.account,
        config: value.config,
        payload: TxEnvelopeTempo.getSignPayload(envelope),
        signatures: approvals,
    });
    const signature = SignatureEnvelope.from({
        account: value.account,
        config: value.config,
        signatures,
    });
    return TxEnvelopeTempo.serialize(envelope, value.transaction.startsWith(TxEnvelopeTempo.feePayerMagic)
        ? {
            format: 'feePayer',
            sender: envelope.from,
            signature,
        }
        : { signature });
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
export function from(operation) {
    try {
        const config = AccountConfig.from(operation.config);
        if (typeof config.threshold !== 'number' ||
            config.owners.some((owner) => typeof owner.weight !== 'number'))
            throw new InvalidOperationError({
                reason: 'config threshold and owner weights must be numbers',
            });
        const value = { ...operation, config };
        assertBase(value, config);
        if (value.type === 'transaction')
            assertTransaction(value);
        else if (value.type === 'keyAuthorization')
            assertKeyAuthorization(value, config);
        else
            throw new InvalidOperationError({ reason: 'unknown operation type' });
        return value;
    }
    catch (cause) {
        if (cause instanceof InvalidOperationError)
            throw cause;
        throw new InvalidOperationError({ cause });
    }
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
export function fromRpc(operation) {
    try {
        const version = operation.config?.version;
        if (typeof version !== 'string' || !Hex.validate(version))
            throw new InvalidOperationError({
                reason: 'config.version must be a hexadecimal quantity',
            });
        const version_ = Hex.toBigInt(version);
        if (Hex.fromNumber(version_) !== version)
            throw new InvalidOperationError({
                reason: 'config.version must use canonical quantity encoding',
            });
        return from({
            ...operation,
            config: AccountConfig.fromRpc(operation.config),
        });
    }
    catch (cause) {
        if (cause instanceof InvalidOperationError)
            throw cause;
        throw new InvalidOperationError({ cause });
    }
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
export function toRpc(operation) {
    const value = from(operation);
    return {
        ...value,
        config: AccountConfig.toRpc(value.config),
    };
}
/**
 * Validates and selects approvals recursively.
 *
 * @internal
 */
async function selectApprovals_internal(options) {
    const owners = new Map(options.config.owners.map((owner) => [
        owner.owner.toLowerCase(),
        { address: owner.owner, weight: Number(owner.weight) },
    ]));
    const groups = new Map();
    for (const serialized of options.approvals) {
        const signature = SignatureEnvelope.from(serialized);
        if (signature.type === 'keychain' || signature.type === 'configurable')
            throw new InvalidApprovalError({
                reason: 'only primitive signatures can approve an account operation',
            });
        const address = SignatureEnvelope.extractAddress({
            payload: options.hash,
            signature,
        });
        const owner = owners.get(address.toLowerCase());
        if (!owner)
            throw new InvalidApprovalError({
                reason: `signature is from non-owner ${address}`,
            });
        const key = address.toLowerCase();
        const group = groups.get(key);
        if (group)
            group.signatures.push(signature);
        else
            groups.set(key, {
                address: owner.address,
                signatures: [signature],
                weight: owner.weight,
            });
    }
    const valid = [];
    const retained = [];
    for (const group of groups.values()) {
        const signatures = group.signatures.map((signature) => {
            if (!SignatureEnvelope.verify(signature, {
                address: group.address,
                payload: options.hash,
            }))
                throw new InvalidApprovalError({
                    reason: `signature from owner ${group.address} is invalid`,
                });
            return SignatureEnvelope.serialize(signature);
        });
        const signature = signatures.sort(compareHex)[0];
        valid.push({
            address: group.address,
            signature,
            weight: group.weight,
        });
        retained.push({ address: group.address, signature });
    }
    const ranked = valid.sort((a, b) => b.weight - a.weight || compareApprovalAddress(a, b));
    const selected = [];
    let weight = 0;
    for (const approval of ranked.slice(0, AccountConfig.maxSignatures)) {
        if (weight >= Number(options.config.threshold))
            break;
        selected.push(approval);
        weight += approval.weight;
    }
    selected.sort(compareApprovalAddress);
    return {
        approvals: retained
            .sort(compareApprovalAddress)
            .map((approval) => approval.signature),
        selectedApprovals: selected.map((approval) => approval.signature),
        signatureCount: selected.length,
        threshold: Number(options.config.threshold),
        weight,
    };
}
/**
 * Orders approval records by owner address.
 *
 * @internal
 */
function compareApprovalAddress(a, b) {
    const addressA = Hex.toBigInt(a.address);
    const addressB = Hex.toBigInt(b.address);
    return addressA < addressB ? -1 : addressA > addressB ? 1 : 0;
}
/**
 * Orders hexadecimal data bytewise.
 *
 * @internal
 */
function compareHex(a, b) {
    const hexA = a.toLowerCase();
    const hexB = b.toLowerCase();
    return hexA < hexB ? -1 : hexA > hexB ? 1 : 0;
}
/**
 * Validates fields shared by every operation.
 *
 * @internal
 */
function assertBase(operation, config) {
    if (!Address.validate(operation.account))
        throw new InvalidOperationError({ reason: 'account is invalid' });
    if (Hex.toBigInt(operation.account) === 0n)
        throw new InvalidOperationError({ reason: 'account cannot be zero' });
    if (!Hash.validate(operation.hash))
        throw new InvalidOperationError({ reason: 'hash is invalid' });
    assertInteger(operation.createdAt, 'createdAt');
    assertInteger(operation.updatedAt, 'updatedAt');
    if (operation.updatedAt < operation.createdAt)
        throw new InvalidOperationError({
            reason: 'updatedAt cannot precede createdAt',
        });
    assertInteger(operation.signatureCount, 'signatureCount');
    assertInteger(operation.threshold, 'threshold');
    assertInteger(operation.weight, 'weight');
    if (operation.threshold !== Number(config.threshold))
        throw new InvalidOperationError({
            reason: 'threshold must equal config.threshold',
        });
    if (operation.weight > 0xff)
        throw new InvalidOperationError({ reason: 'weight exceeds u8 max' });
    if (operation.signatureCount > AccountConfig.maxSignatures)
        throw new InvalidOperationError({ reason: 'too many selected signatures' });
    if (!Array.isArray(operation.approvals))
        throw new InvalidOperationError({ reason: 'approvals must be an array' });
    if (operation.approvals.length > config.owners.length)
        throw new InvalidOperationError({ reason: 'too many retained approvals' });
    if (operation.signatureCount > operation.approvals.length)
        throw new InvalidOperationError({
            reason: 'signatureCount exceeds retained approvals',
        });
    if ((operation.signatureCount === 0) !== (operation.weight === 0))
        throw new InvalidOperationError({
            reason: 'signatureCount and weight must both be zero or nonzero',
        });
    const owners = new Map(config.owners.map((owner) => [
        owner.owner.toLowerCase(),
        Number(owner.weight),
    ]));
    const approvalWeights = [];
    const seen = new Set();
    for (const approval of operation.approvals) {
        if (typeof approval !== 'string' ||
            !Hex.validate(approval, { strict: true }))
            throw new InvalidOperationError({ reason: 'approval is invalid' });
        const signature = assertApproval(operation.account, approval, config);
        const address = SignatureEnvelope.extractAddress({
            payload: operation.hash,
            signature,
        });
        const key = address.toLowerCase();
        const weight = owners.get(key);
        if (weight === undefined)
            throw new InvalidOperationError({
                reason: 'approval is from a non-owner',
            });
        if (seen.has(key))
            throw new InvalidOperationError({
                reason: operation.type === 'keyAuthorization'
                    ? 'key authorization contains duplicate owner approvals'
                    : 'duplicate owner approval',
            });
        seen.add(key);
        approvalWeights.push(weight);
    }
    if (!isWeightReachable(approvalWeights, operation.signatureCount, operation.weight))
        throw new InvalidOperationError({
            reason: 'weight is not reachable by signatureCount retained owner approvals',
        });
}
/**
 * Validates a transaction operation and its state-specific fields.
 *
 * @internal
 */
function assertTransaction(operation) {
    if ('keyAuthorization' in operation &&
        operation.keyAuthorization !== undefined)
        throw new InvalidOperationError({
            reason: 'transaction operations cannot contain keyAuthorization',
        });
    const expiresAt = operation.expiresAt;
    const submissionId = operation.submissionId;
    const transactionHash = operation.transactionHash;
    if (operation.status === 'pending') {
        if (expiresAt !== undefined ||
            submissionId !== undefined ||
            transactionHash !== undefined)
            throw new InvalidOperationError({
                reason: 'pending transactions cannot contain submission fields',
            });
    }
    else if (operation.status === 'submitting') {
        assertInteger(expiresAt, 'expiresAt');
        if (!Hash.validate(submissionId ?? ''))
            throw new InvalidOperationError({ reason: 'submissionId is invalid' });
        if (submissionId.toLowerCase() === operation.hash.toLowerCase())
            throw new InvalidOperationError({
                reason: 'submissionId must differ from the operation hash',
            });
        if (transactionHash !== undefined)
            throw new InvalidOperationError({
                reason: 'submitting transactions cannot contain transactionHash',
            });
    }
    else if (operation.status === 'success') {
        if (!Hash.validate(transactionHash ?? ''))
            throw new InvalidOperationError({ reason: 'transactionHash is invalid' });
        if (expiresAt !== undefined || submissionId !== undefined)
            throw new InvalidOperationError({
                reason: 'successful transactions cannot contain submission fields',
            });
    }
    else
        throw new InvalidOperationError({ reason: 'invalid transaction status' });
    if (operation.status !== 'pending' &&
        (operation.weight < operation.threshold || operation.signatureCount === 0))
        throw new InvalidOperationError({
            reason: 'submitted transactions must have quorum',
        });
    if (typeof operation.transaction !== 'string')
        throw new InvalidOperationError({ reason: 'transaction is invalid' });
    const transaction = TxEnvelopeTempo.deserialize(operation.transaction);
    if (transaction.signature)
        throw new InvalidOperationError({
            reason: 'transaction must not contain an outer sender signature',
        });
    if (transaction.from &&
        transaction.from.toLowerCase() !== operation.account.toLowerCase())
        throw new InvalidOperationError({
            reason: 'transaction sender does not match the operation account',
        });
    assertOperationHash(operation, TxEnvelopeTempo.getSignPayload(transaction));
    const feePayer = operation.transaction.startsWith(TxEnvelopeTempo.feePayerMagic);
    const serialized = TxEnvelopeTempo.serialize(transaction, feePayer
        ? transaction.from
            ? { format: 'feePayer', sender: transaction.from }
            : { format: 'feePayer' }
        : {});
    if (serialized.toLowerCase() !== operation.transaction.toLowerCase())
        throw new InvalidOperationError({
            reason: 'transaction is not canonically serialized',
        });
}
/**
 * Validates a key authorization operation and its serialized payload.
 *
 * @internal
 */
function assertKeyAuthorization(operation, config) {
    const transactionFields = operation;
    if (transactionFields.expiresAt !== undefined ||
        transactionFields.submissionId !== undefined ||
        transactionFields.transaction !== undefined ||
        transactionFields.transactionHash !== undefined)
        throw new InvalidOperationError({
            reason: 'key authorization operations cannot contain transaction fields',
        });
    if (operation.status !== 'pending' && operation.status !== 'success')
        throw new InvalidOperationError({
            reason: 'invalid key authorization status',
        });
    if (operation.status === 'success' &&
        (operation.weight < operation.threshold || operation.signatureCount === 0))
        throw new InvalidOperationError({
            reason: 'successful key authorizations must have quorum',
        });
    if (operation.status === 'pending' && operation.weight >= operation.threshold)
        throw new InvalidOperationError({
            reason: 'pending key authorizations cannot have quorum',
        });
    if (typeof operation.keyAuthorization !== 'string')
        throw new InvalidOperationError({ reason: 'keyAuthorization is invalid' });
    const authorization = KeyAuthorization_.deserialize(operation.keyAuthorization);
    if (!authorization.account ||
        authorization.account.toLowerCase() !== operation.account.toLowerCase())
        throw new InvalidOperationError({
            reason: 'key authorization account does not match the operation account',
        });
    const signature = authorization.signature;
    if (operation.status === 'pending' && signature)
        throw new InvalidOperationError({
            reason: 'pending key authorizations must be unsigned',
        });
    if (operation.status === 'success') {
        if (signature?.type !== 'configurable')
            throw new InvalidOperationError({
                reason: 'successful key authorizations require a configurable account signature',
            });
        if (signature.account.toLowerCase() !== operation.account.toLowerCase())
            throw new InvalidOperationError({
                reason: 'key authorization signature account does not match',
            });
        if (signature.signatures.length !== operation.signatureCount)
            throw new InvalidOperationError({
                reason: 'key authorization signatureCount does not match its signature',
            });
        assertSelectedApprovals(operation, signature.signatures, authorization);
        if (!sameConfig(signature.config, config))
            throw new InvalidOperationError({
                reason: 'key authorization config does not match',
            });
    }
    assertOperationHash(operation, KeyAuthorization_.getSignPayload(authorization));
    if (KeyAuthorization_.serialize(authorization).toLowerCase() !==
        operation.keyAuthorization.toLowerCase())
        throw new InvalidOperationError({
            reason: 'keyAuthorization is not canonically serialized',
        });
}
/**
 * Validates a retained signature in the root owner's approval context.
 *
 * @internal
 */
function assertApproval(account, serialized, config) {
    const approval = SignatureEnvelope.deserialize(serialized);
    if (approval.type === 'keychain' || approval.type === 'configurable')
        throw new InvalidOperationError({
            reason: 'only primitive owner approvals are allowed',
        });
    SignatureEnvelope.assert({
        account,
        config,
        signatures: [approval],
        type: 'configurable',
    });
    if (SignatureEnvelope.serialize(approval).toLowerCase() !==
        serialized.toLowerCase())
        throw new InvalidOperationError({ reason: 'approval is not canonical' });
    return approval;
}
/**
 * Checks that selected transaction approvals are retained by the operation.
 *
 * @internal
 */
function assertRetainedApprovals(operation, selected) {
    const retained = operation.approvals.map((approval) => SignatureEnvelope.deserialize(approval));
    for (const approval of selected) {
        const index = retained.findIndex((candidate) => SignatureEnvelope.serialize(candidate).toLowerCase() ===
            SignatureEnvelope.serialize(approval).toLowerCase());
        if (index === -1)
            throw new InvalidOperationError({
                reason: 'transaction signature is not a retained approval',
            });
        retained.splice(index, 1);
    }
}
/**
 * Checks that a successful key authorization uses retained approvals in canonical order.
 *
 * @internal
 */
function assertSelectedApprovals(operation, selected, authorization) {
    const retained = operation.approvals.map((approval) => SignatureEnvelope.deserialize(approval));
    for (const approval of selected) {
        const index = retained.findIndex((candidate) => SignatureEnvelope.serialize(candidate).toLowerCase() ===
            SignatureEnvelope.serialize(approval).toLowerCase());
        if (index === -1)
            throw new InvalidOperationError({
                reason: 'key authorization signature is not a retained approval',
            });
        retained.splice(index, 1);
    }
    const digest = AccountConfig.getSignPayload({
        account: operation.account,
        config: operation.config,
        payload: KeyAuthorization_.getSignPayload(authorization),
    });
    const addresses = selected.map((signature) => SignatureEnvelope.extractAddress({ payload: digest, signature }));
    for (let index = 1; index < addresses.length; index++) {
        const previous = Hex.toBigInt(addresses[index - 1]);
        const current = Hex.toBigInt(addresses[index]);
        if (previous === current)
            throw new InvalidOperationError({
                reason: 'key authorization contains duplicate owner approvals',
            });
        if (previous > current)
            throw new InvalidOperationError({
                reason: 'key authorization approvals are not canonically ordered',
            });
    }
}
/**
 * Checks whether exactly `signatureCount` retained owners can produce `weight`.
 *
 * @internal
 */
function isWeightReachable(weights, signatureCount, weight) {
    const reachable = Array.from({ length: signatureCount + 1 }, () => new Set());
    reachable[0].add(0);
    for (const ownerWeight of weights)
        for (let count = signatureCount; count > 0; count--)
            for (const current of reachable[count - 1])
                reachable[count].add(current + ownerWeight);
    return reachable[signatureCount].has(weight);
}
/**
 * Validates the deterministic operation hash.
 *
 * @internal
 */
function assertOperationHash(operation, payload) {
    const hash = AccountConfig.getSignPayload({
        account: operation.account,
        config: operation.config,
        payload,
    });
    if (hash.toLowerCase() !== operation.hash.toLowerCase())
        throw new InvalidOperationError({
            reason: 'hash does not match the operation payload',
        });
}
/**
 * Validates a nonnegative safe integer field.
 *
 * @internal
 */
function assertInteger(value, field) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        throw new InvalidOperationError({
            reason: `${field} must be a nonnegative safe integer`,
        });
}
/**
 * Compares normalized account configurations.
 *
 * @internal
 */
function sameConfig(a, b) {
    const configA = AccountConfig.from(a);
    const configB = AccountConfig.from(b);
    return (Hex.isEqual(configA.salt ?? AccountConfig.zeroSalt, configB.salt ?? AccountConfig.zeroSalt) &&
        configA.threshold === configB.threshold &&
        configA.version === configB.version &&
        configA.owners.length === configB.owners.length &&
        configA.owners.every((owner, index) => {
            const other = configB.owners[index];
            return (Address.isEqual(owner.owner, other.owner) &&
                owner.weight === other.weight);
        }));
}
/** Thrown when an account operation owner approval is invalid. */
export class InvalidApprovalError extends Errors.BaseError {
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
    constructor(options = {}) {
        super(options.reason
            ? `Invalid operation approval: ${options.reason}.`
            : 'Invalid operation approval.', { cause: options.cause });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'AccountOperation.InvalidApprovalError'
        });
    }
}
/** Thrown when an account operation is malformed or internally inconsistent. */
export class InvalidOperationError extends Errors.BaseError {
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
    constructor(options = {}) {
        super(options.reason
            ? `Invalid account operation: ${options.reason}.`
            : 'Invalid account operation.', { cause: options.cause });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'AccountOperation.InvalidOperationError'
        });
    }
}
//# sourceMappingURL=AccountOperation.js.map