import * as Address from './Address.js';
import * as Errors from './Errors.js';
import * as Frame from './Frame.js';
import * as FrameSignature from './FrameSignature.js';
import * as Hash from './Hash.js';
import * as Hex from './Hex.js';
import * as FrameNonce from './internal/frameNonce.js';
import type { Assign, Compute, PartialBy } from './internal/types.js';
import * as Rlp from './Rlp.js';
/**
 * An EIP-8141 transaction containing independently budgeted call frames.
 *
 * Omitted `nonceKeys` preserves the original EIP-8141 encoding. Supplying keys,
 * including `[0n]`, selects EIP-8250 encoding and changes the signing hash.
 */
export type TxEnvelopeEip8141 = {
    /** Versioned blob hashes. @default [] */
    blobVersionedHashes?: readonly Hex.Hex[] | undefined;
    /** Chain ID. Use bigint for IDs beyond the safe integer range. */
    chainId: number | bigint;
    /** Frames to execute, in order. */
    frames: readonly Frame.Frame[];
    /** Maximum fee per blob gas, in wei. @default 0n */
    maxFeePerBlobGas?: bigint | undefined;
    /** Maximum fee per gas, in wei. @default 0n */
    maxFeePerGas?: bigint | undefined;
    /** Maximum priority fee per gas, in wei. @default 0n */
    maxPriorityFeePerGas?: bigint | undefined;
    /** Sender nonce or shared sequence. With `nonceKeys`, the sequence must be less than 2^64 - 1. @default 0n */
    nonce?: bigint | undefined;
    /** EIP-8250 domains: 1–16 strictly increasing uint256 keys. `[0n]` selects the legacy account nonce; zero cannot accompany other keys. */
    nonceKeys?: readonly bigint[] | undefined;
    /** Account authorizing execution. */
    sender: Address.Address;
    /** PeerDAS sidecars. Excluded from transaction and signing hashes. */
    sidecars?: {
        blobs: readonly Hex.Hex[];
        cellProofs: readonly Hex.Hex[];
        commitments: readonly Hex.Hex[];
    } | undefined;
    /** Signature entries, including unsigned placeholders before signing. @default [] */
    signatures?: readonly FrameSignature.FrameSignature[] | undefined;
    /** Transaction type. */
    type: Type;
};
/** JSON-RPC representation of an EIP-8141 envelope. */
export type Rpc = {
    /** Versioned blob hashes. */
    blobVersionedHashes: readonly Hex.Hex[];
    /** Chain ID. */
    chainId: Hex.Hex;
    /** Frames in execution order. */
    frames: readonly Frame.Rpc[];
    /** Account authorizing execution. */
    from: Address.Address;
    /** Maximum fee per blob gas. */
    maxFeePerBlobGas: Hex.Hex;
    /** Maximum fee per gas. */
    maxFeePerGas: Hex.Hex;
    /** Maximum priority fee per gas. */
    maxPriorityFeePerGas: Hex.Hex;
    /** Sender nonce or shared EIP-8250 sequence. */
    nonce: Hex.Hex;
    /** EIP-8250 domains. Omitted for the original EIP-8141 encoding. */
    nonceKeys?: readonly Hex.Hex[] | undefined;
    /** Frame signature entries. */
    signatures: readonly FrameSignature.Rpc[];
    /** RPC transaction type. */
    type: '0x6';
};
/** Serialized EIP-8141 transaction envelope. */
export type Serialized = `${SerializedType}${string}`;
/** Serialized EIP-8141 transaction type prefix. */
export declare const serializedType: "0x06";
/** Serialized EIP-8141 transaction type. */
export type SerializedType = typeof serializedType;
/** EIP-8141 transaction type. */
export declare const type: "eip8141";
/** EIP-8141 transaction type identifier. */
export type Type = typeof type;
/**
 * Asserts that an EIP-8141 envelope satisfies structural transaction constraints.
 *
 * Accepts unsigned signature entries for construction. Does not verify signatures,
 * account authorization, balances, or blob proofs.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * TxEnvelopeEip8141.assert({
 *   chainId: 1,
 *   frames: [{ executionGas: 50_000n, mode: 'verify' }],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to assert.
 */
export declare function assert(envelope: PartialBy<TxEnvelopeEip8141, 'type'>): void;
export declare namespace assert {
    type ErrorType = InvalidError | FrameNonce.InvalidError | Frame.assert.ErrorType | FrameSignature.toTuple.ErrorType | Address.assert.ErrorType | Errors.GlobalErrorType;
}
/**
 * Deserializes an EIP-8141 transaction body or PeerDAS network wrapper.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 *
 * const serialized = TxEnvelopeEip8141.serialize(envelope)
 * const decoded = TxEnvelopeEip8141.deserialize(serialized)
 * ```
 *
 * @param serialized - Serialized transaction or network wrapper.
 * @returns The transaction envelope.
 */
export declare function deserialize(serialized: Serialized): TxEnvelopeEip8141;
export declare namespace deserialize {
    type ErrorType = assert.ErrorType | Hex.slice.ErrorType | Rlp.toHex.ErrorType | serialize.ErrorType | Errors.GlobalErrorType;
}
/**
 * Creates an EIP-8141 transaction envelope from an object or serialized transaction.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [
 *     {
 *       executionGas: 50_000n,
 *       flags: 'approveExecutionAndPayment',
 *       mode: 'verify'
 *     }
 *   ],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - An envelope object or serialized transaction.
 * @returns The envelope with its transaction type.
 */
export declare function from<const envelope extends PartialBy<TxEnvelopeEip8141, 'type'> | Serialized>(envelope: envelope): from.ReturnType<envelope>;
export declare namespace from {
    type ReturnType<envelope extends PartialBy<TxEnvelopeEip8141, 'type'> | Serialized> = envelope extends Serialized ? TxEnvelopeEip8141 : Compute<Assign<envelope, {
        readonly type: Type;
    }>>;
    type ErrorType = assert.ErrorType | deserialize.ErrorType | Errors.GlobalErrorType;
}
/**
 * Converts an RPC envelope to an EIP-8141 envelope without losing chain ID precision.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const rpc = TxEnvelopeEip8141.toRpc(
 *   TxEnvelopeEip8141.from({
 *     chainId: 1,
 *     frames: [Frame.from({})],
 *     sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 *   })
 * )
 * const envelope = TxEnvelopeEip8141.fromRpc(rpc)
 * ```
 *
 * @param envelope - The value to convert.
 * @returns The converted value.
 */
export declare function fromRpc(envelope: Rpc): TxEnvelopeEip8141;
export declare namespace fromRpc {
    type ErrorType = FrameNonce.InvalidError | from.ErrorType | Frame.fromRpc.ErrorType | FrameSignature.fromRpc.ErrorType | Hex.toBigInt.ErrorType;
}
/**
 * Converts an EIP-8141 envelope to RPC fields. Sidecars are excluded.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * const rpc = TxEnvelopeEip8141.toRpc(envelope)
 * ```
 *
 * @param envelope - The value to convert.
 * @returns The converted value.
 */
export declare function toRpc(envelope: toRpc.Input): Rpc;
export declare namespace toRpc {
    type Input = Omit<TxEnvelopeEip8141, 'chainId' | 'frames' | 'maxFeePerBlobGas' | 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'nonce' | 'nonceKeys' | 'type'> & {
        chainId: Hex.Hex | bigint | number;
        frames: readonly Frame.toRpc.Input[];
        maxFeePerBlobGas?: Hex.Hex | bigint | number | undefined;
        maxFeePerGas?: Hex.Hex | bigint | number | undefined;
        maxPriorityFeePerGas?: Hex.Hex | bigint | number | undefined;
        nonce?: Hex.Hex | bigint | number | undefined;
        nonceKeys?: readonly (Hex.Hex | bigint | number)[] | undefined;
        type?: Type | undefined;
    };
    type ErrorType = FrameNonce.InvalidError | Frame.toRpc.ErrorType | FrameSignature.toRpc.ErrorType | Hex.fromNumber.ErrorType;
}
/**
 * Returns the canonical signing payload of an EIP-8141 envelope.
 *
 * Elides signature bytes only for entries with an empty payload. Explicit-payload
 * signatures remain committed. The envelope is not mutated.
 *
 * @example
 * ### Signing
 *
 * ```ts twoslash
 * import {
 *   Address,
 *   FrameSignature,
 *   Secp256k1,
 *   TxEnvelopeEip8141
 * } from 'ox'
 *
 * const privateKey = Secp256k1.randomPrivateKey()
 * const sender = Address.fromPublicKey(
 *   Secp256k1.getPublicKey({ privateKey })
 * )
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [
 *     {
 *       executionGas: 50_000n,
 *       flags: 'approveExecutionAndPayment',
 *       mode: 'verify'
 *     }
 *   ],
 *   sender,
 *   signatures: [FrameSignature.from({ scheme: 'secp256k1' })]
 * })
 *
 * const payload = TxEnvelopeEip8141.getSignPayload(envelope)
 * const signature = Secp256k1.sign({ payload, privateKey })
 * const signed = TxEnvelopeEip8141.from({
 *   ...envelope,
 *   signatures: [
 *     FrameSignature.from({ scheme: 'secp256k1', signature })
 *   ]
 * })
 * ```
 *
 * @param envelope - The transaction envelope to sign.
 * @returns The canonical signing digest.
 */
export declare function getSignPayload(envelope: PartialBy<TxEnvelopeEip8141, 'type'>): Hex.Hex;
export declare namespace getSignPayload {
    type ErrorType = hash.ErrorType;
}
/**
 * Hashes an EIP-8141 transaction, excluding its blob sidecars.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const hash = TxEnvelopeEip8141.hash({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to hash.
 * @param options - Hashing options.
 * @returns The transaction hash or signing digest.
 */
export declare function hash(envelope: PartialBy<TxEnvelopeEip8141, 'type'>, options?: hash.Options): Hex.Hex;
export declare namespace hash {
    type Options = {
        /** Whether to compute the canonical signing digest. @default false */
        presign?: boolean | undefined;
    };
    type ErrorType = assert.ErrorType | Hash.keccak256.ErrorType | Rlp.fromHex.ErrorType | Errors.GlobalErrorType;
}
/**
 * Serializes an EIP-8141 envelope, including a PeerDAS wrapper when sidecars exist.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [{ executionGas: 50_000n, mode: 'sender' }],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * const serialized = TxEnvelopeEip8141.serialize(envelope)
 * ```
 *
 * @param envelope - The transaction envelope to serialize.
 * @returns The serialized transaction.
 */
export declare function serialize(envelope: PartialBy<TxEnvelopeEip8141, 'type'>): Serialized;
export declare namespace serialize {
    type ErrorType = assert.ErrorType | Rlp.fromHex.ErrorType | Hex.concat.ErrorType | Errors.GlobalErrorType;
}
/**
 * Returns whether an EIP-8141 envelope satisfies structural constraints.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const valid = TxEnvelopeEip8141.validate({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to validate.
 * @returns Whether the envelope is structurally valid.
 */
export declare function validate(envelope: PartialBy<TxEnvelopeEip8141, 'type'>): boolean;
export declare namespace validate {
    type ErrorType = Errors.GlobalErrorType;
}
/** Thrown when an EIP-8141 envelope is structurally invalid. */
export declare class InvalidError extends Errors.BaseError {
    readonly name = "TxEnvelopeEip8141.InvalidError";
}
//# sourceMappingURL=TxEnvelopeEip8141.d.ts.map