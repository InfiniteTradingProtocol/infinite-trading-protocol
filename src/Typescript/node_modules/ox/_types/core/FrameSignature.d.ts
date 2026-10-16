import * as Address from './Address.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import type { Compute, UnionPartialBy } from './internal/types.js';
import * as PublicKey from './PublicKey.js';
import * as Signature from './Signature.js';
/** Signature schemes supported by EIP-8141. */
export declare const schemes: {
    readonly arbitrary: 0;
    readonly p256: 2;
    readonly secp256k1: 1;
};
/** A supported numeric or named frame signature scheme. */
export type Scheme = keyof typeof schemes | (typeof schemes)[keyof typeof schemes];
/** Contract-defined signature bytes. */
export type Arbitrary = {
    /** Explicit nonzero digest. Omit or use empty bytes for the transaction signing hash. */
    payload?: Hex.Hex | undefined;
    /** Contract-defined verification scheme. */
    scheme: 0 | 'arbitrary';
    /** Opaque witness bytes. */
    signature: Hex.Hex;
    /** Arbitrary signatures have no signer metadata. */
    signer?: undefined;
};
/** A secp256k1 signature entry. */
export type Secp256k1 = {
    /** Explicit nonzero digest. Omit or use empty bytes for the transaction signing hash. */
    payload?: Hex.Hex | undefined;
    /** secp256k1 verification scheme. */
    scheme: 1 | 'secp256k1';
    /** Recovered signature or `Signature.toHex` bytes. Omit or use `0x` for an unsigned entry. */
    signature?: Hex.Hex | Signature.Signature | undefined;
    /** Signer address. Omit to use the transaction sender. */
    signer?: Address.Address | undefined;
};
/** A P-256 signature entry. */
export type P256 = {
    /** Explicit nonzero digest. Omit or use empty bytes for the transaction signing hash. */
    payload?: Hex.Hex | undefined;
    /** P-256 verification scheme. */
    scheme: 2 | 'p256';
    /** Signer address. Omit to use the transaction sender. */
    signer?: Address.Address | undefined;
} & ({
    /** Uncompressed P-256 public key. */
    publicKey: PublicKey.PublicKey;
    /** P-256 signature or `Signature.toHex` bytes. */
    signature: Hex.Hex | Signature.Signature<false>;
} | {
    /** Public key, if already known. Empty wire signatures do not retain it. */
    publicKey?: PublicKey.PublicKey | undefined;
    /** Omit or use `0x` for an unsigned entry. */
    signature?: '0x' | undefined;
});
/** An EIP-8141 signature entry. Empty payload selects the transaction signing hash. */
export type FrameSignature = Arbitrary | Secp256k1 | P256;
/** JSON-RPC representation of a frame signature. */
export type Rpc = {
    /** Explicit digest, or empty bytes for the transaction signing hash. */
    msg?: Hex.Hex | undefined;
    /** Signature verification scheme. */
    scheme: '0x0' | '0x1' | '0x2';
    /** Encoded signature bytes. */
    signature?: Hex.Hex | undefined;
    /** Signer address; absent for the transaction sender. */
    signer?: Address.Address | '0x' | undefined;
};
/** RLP-ready signature entry. The payload occupies the specification's `msg` field. */
export type Tuple = readonly [
    scheme: Hex.Hex,
    signer: Hex.Hex,
    payload: Hex.Hex,
    signature: Hex.Hex
];
/**
 * Asserts that a {@link ox#FrameSignature.FrameSignature} is structurally valid.
 *
 * Checks metadata, signature scalars, and public key shape without verifying
 * authorization.
 *
 * @example
 * ### Basic Usage
 *
 * Unsigned protocol entries are accepted by default.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * FrameSignature.assert({
 *   payload: '0x',
 *   scheme: 'secp256k1'
 * })
 * ```
 *
 * @example
 * ### Requiring a Signature
 *
 * Set `signed` to require a protocol signature.
 *
 * ```ts twoslash
 * import { FrameSignature, Hash, Secp256k1 } from 'ox'
 *
 * const payload = Hash.keccak256('0xdeadbeef')
 * const privateKey = Secp256k1.randomPrivateKey()
 * const signature = Secp256k1.sign({ payload, privateKey })
 *
 * const entry = FrameSignature.from({
 *   payload,
 *   scheme: 'secp256k1',
 *   signature
 * })
 *
 * FrameSignature.assert(entry, { signed: true })
 * ```
 *
 * @param entry - The signature entry to assert.
 * @param options - Validation options.
 */
export declare function assert(entry: FrameSignature, options?: assert.Options): void;
export declare namespace assert {
    type Options = {
        /**
         * Require a protocol signature. Does not perform cryptographic verification.
         * @default false
         */
        signed?: boolean | undefined;
    };
    type ErrorType = InvalidError | Address.assert.ErrorType | Hex.assert.ErrorType | Hex.toBigInt.ErrorType | PublicKey.assert.ErrorType | Signature.assert.ErrorType | Signature.fromHex.ErrorType | Errors.GlobalErrorType;
}
/**
 * Coerces a value into a {@link ox#FrameSignature.FrameSignature}.
 *
 * Accepts arbitrary signature bytes or a signature entry. Protocol signatures accept
 * structured objects or `Signature.toHex` bytes. P-256 entries still require a public key. Omitted
 * `scheme` and `payload` default to `'arbitrary'` and `'0x'`, respectively.
 * An empty payload selects the canonical transaction signing hash; an explicit
 * payload must be a nonzero 32-byte digest.
 *
 * @example
 * ### From Hex
 *
 * Wrap arbitrary witness bytes for contract-defined verification.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.from('0xaabb')
 * // @log: { payload: '0x', scheme: 'arbitrary', signature: '0xaabb' }
 * ```
 *
 * @example
 * ### Secp256k1
 *
 * Wrap a signature over an explicit digest, retaining the same payload in the entry.
 *
 * ```ts twoslash
 * import { FrameSignature, Hash, Secp256k1 } from 'ox'
 *
 * const payload = Hash.keccak256('0xdeadbeef')
 * const privateKey = Secp256k1.randomPrivateKey()
 * const signature = Secp256k1.sign({ payload, privateKey })
 *
 * const entry = FrameSignature.from({
 *   payload,
 *   scheme: 'secp256k1',
 *   signature
 * })
 * ```
 *
 * @example
 * ### P256
 *
 * Include the public key with a P-256 signature over an explicit digest.
 *
 * ```ts twoslash
 * import { FrameSignature, Hash, P256 } from 'ox'
 *
 * const { privateKey, publicKey } = P256.createKeyPair()
 * const payload = Hash.keccak256('0xdeadbeef')
 * const signature = P256.sign({ payload, privateKey })
 *
 * const entry = FrameSignature.from({
 *   payload,
 *   publicKey,
 *   scheme: 'p256',
 *   signature
 * })
 * ```
 *
 * @example
 * ### Unsigned Entries
 *
 * Omit the signature to prepare a protocol entry before signing the transaction.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.from({ scheme: 'secp256k1' })
 * // @log: { payload: '0x', scheme: 'secp256k1' }
 * ```
 *
 * @param entry - Arbitrary signature bytes or a structured signature entry.
 * @returns The validated entry, preserving supplied signature and scheme types.
 */
export declare function from<const entry extends from.Input>(entry: entry | from.Input): from.ReturnType<entry>;
export declare namespace from {
    type Input = Hex.Hex | UnionPartialBy<Arbitrary, 'scheme' | 'payload'> | UnionPartialBy<Secp256k1 | P256, 'payload'>;
    type ReturnType<entry extends Input = Input> = entry extends Hex.Hex ? {
        payload: '0x';
        scheme: 'arbitrary';
        signature: entry;
    } : entry extends Input ? Compute<Omit<entry, 'scheme' | 'payload'> & {
        payload: entry extends {
            payload: infer payload extends Hex.Hex;
        } ? payload : 'payload' extends keyof entry ? Exclude<entry['payload'], undefined> | '0x' : '0x';
        scheme: entry extends {
            scheme: infer scheme extends Scheme;
        } ? scheme : 'scheme' extends keyof entry ? Exclude<entry['scheme'], undefined> | 'arbitrary' : 'arbitrary';
    }> : never;
    type ErrorType = assert.ErrorType;
}
/**
 * Converts an RPC signature entry to a structured frame signature.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.fromRpc({
 *   msg: '0x',
 *   scheme: '0x0',
 *   signature: '0xdeadbeef'
 * })
 * ```
 *
 * @param entry - The value to convert.
 * @returns The converted value.
 */
export declare function fromRpc(entry: Rpc): FrameSignature;
export declare namespace fromRpc {
    type ErrorType = fromTuple.ErrorType | Hex.fromNumber.ErrorType | Hex.toNumber.ErrorType;
}
/**
 * Converts a structured frame signature to its RPC representation.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.from('0xdeadbeef')
 * const rpc = FrameSignature.toRpc(entry)
 * ```
 *
 * @param entry - The value to convert.
 * @returns The converted value.
 */
export declare function toRpc(entry: FrameSignature): Rpc;
export declare namespace toRpc {
    type ErrorType = toTuple.ErrorType | Hex.toNumber.ErrorType;
}
/**
 * Converts a {@link ox#FrameSignature.Tuple} to a structured
 * {@link ox#FrameSignature.FrameSignature}.
 *
 * Returns a named scheme and unpacks protocol signatures. Empty protocol signatures
 * become unsigned entries. Rejects noncanonical encodings.
 *
 * @example
 * ### Basic Usage
 *
 * Decode an arbitrary signature tuple.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.fromTuple([
 *   '0x',
 *   '0x',
 *   '0x',
 *   '0xaabb'
 * ])
 * // @log: { payload: '0x', scheme: 'arbitrary', signature: '0xaabb' }
 * ```
 *
 * @param tuple - The signature tuple to convert.
 * @returns The decoded signature entry.
 */
export declare function fromTuple(tuple: Tuple): FrameSignature;
export declare namespace fromTuple {
    type ErrorType = assert.ErrorType | Hex.slice.ErrorType | Hex.toNumber.ErrorType | Hex.toBytes.ErrorType | Hex.toBigInt.ErrorType;
}
/**
 * Converts a {@link ox#FrameSignature.FrameSignature} to its RLP-ready
 * {@link ox#FrameSignature.Tuple}.
 *
 * Encodes numeric scheme identifiers and packs protocol signatures without mutating
 * the entry. Omitted protocol signatures become empty bytes.
 *
 * @example
 * ### Basic Usage
 *
 * Encode arbitrary witness bytes with the default scheme and payload.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.from('0xaabb')
 * const tuple = FrameSignature.toTuple(entry)
 * // @log: ['0x', '0x', '0x', '0xaabb']
 * ```
 *
 * @param entry - The signature entry to convert.
 * @returns The encoded signature tuple.
 */
export declare function toTuple(entry: FrameSignature): Tuple;
export declare namespace toTuple {
    type ErrorType = assert.ErrorType | Hex.fromNumber.ErrorType | Hex.fromBytes.ErrorType | Hex.concat.ErrorType;
}
/**
 * Returns whether a {@link ox#FrameSignature.FrameSignature} is structurally valid.
 *
 * Performs the same checks as {@link ox#FrameSignature.(assert:function)}, returning
 * `false` instead of throwing. Does not verify that the signature authorizes a payload.
 *
 * @example
 * ### Basic Usage
 *
 * Require a signature when checking a protocol entry.
 *
 * ```ts twoslash
 * import { FrameSignature } from 'ox'
 *
 * const entry = FrameSignature.from({ scheme: 'secp256k1' })
 * const valid = FrameSignature.validate(entry, {
 *   signed: true
 * })
 * // @log: false
 * ```
 *
 * @param entry - The signature entry to validate.
 * @param options - Validation options.
 * @returns Whether the entry is structurally valid.
 */
export declare function validate(entry: FrameSignature, options?: assert.Options): boolean;
export declare namespace validate {
    type ErrorType = Errors.GlobalErrorType;
}
/** Thrown when frame signature metadata or encoding is invalid. */
export declare class InvalidError extends Errors.BaseError {
    readonly name = "FrameSignature.InvalidError";
    constructor(details: string);
}
//# sourceMappingURL=FrameSignature.d.ts.map