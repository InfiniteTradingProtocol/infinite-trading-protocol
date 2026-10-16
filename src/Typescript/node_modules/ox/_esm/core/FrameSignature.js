import * as Address from './Address.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import { p256N, secp256k1N } from './internal/curves.js';
import * as PublicKey from './PublicKey.js';
import * as Signature from './Signature.js';
/** Signature schemes supported by EIP-8141. */
export const schemes = { arbitrary: 0, p256: 2, secp256k1: 1 };
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
export function assert(entry, options = {}) {
    const scheme = typeof entry.scheme === 'string' ? schemes[entry.scheme] : entry.scheme;
    if (!Number.isInteger(scheme) || scheme < 0 || scheme > 2)
        throw new InvalidError('Unsupported signature scheme.');
    if (scheme === 0 && entry.signer !== undefined)
        throw new InvalidError('Arbitrary signatures cannot specify a signer.');
    if (entry.signer !== undefined)
        Address.assert(entry.signer, { strict: false });
    const payload = entry.payload ?? '0x';
    Hex.assert(payload, { strict: true });
    if (payload !== '0x' &&
        (payload.length !== 66 || Hex.toBigInt(payload) === 0n))
        throw new InvalidError('payload must be empty or a nonzero 32-byte digest.');
    switch (entry.scheme) {
        case 0:
        case 'arbitrary':
            Hex.assert(entry.signature, { strict: true });
            if (entry.signature.length % 2 !== 0)
                throw new InvalidError('signature must contain whole bytes.');
            return;
    }
    if (entry.scheme === 2 || entry.scheme === 'p256') {
        if (entry.publicKey !== undefined) {
            PublicKey.assert(entry.publicKey, { compressed: false });
            for (const coordinate of [entry.publicKey.x, entry.publicKey.y]) {
                if (typeof coordinate !== 'bigint' ||
                    coordinate < 0n ||
                    coordinate >= 2n ** 256n)
                    throw new InvalidError('Public key coordinates must fit in 32 bytes.');
            }
        }
        if (entry.signature !== undefined &&
            entry.signature !== '0x' &&
            entry.publicKey === undefined)
            throw new InvalidError('P-256 signatures require a public key.');
    }
    if (entry.signature === undefined || entry.signature === '0x') {
        if (options.signed)
            throw new InvalidError('Signature is required.');
        return;
    }
    if (typeof entry.signature === 'string')
        Hex.assert(entry.signature, { strict: true });
    const signature = typeof entry.signature === 'string'
        ? Signature.fromHex(entry.signature)
        : entry.signature;
    if (typeof signature.r !== 'bigint' || typeof signature.s !== 'bigint')
        throw new InvalidError('Signature scalars must be bigint.');
    if ((scheme === 1 || signature.yParity !== undefined) &&
        signature.yParity !== 0 &&
        signature.yParity !== 1)
        throw new InvalidError('Signature parity must be 0 or 1.');
    Signature.assert(signature, { recovered: scheme === 1 });
    const r = signature.r;
    const s = signature.s;
    const order = scheme === 1 ? secp256k1N : p256N;
    if (r === 0n ||
        r >= order ||
        s === 0n ||
        s >= order ||
        (scheme === 1 && s > order / 2n))
        throw new InvalidError('Signature scalars must be in range; secp256k1 requires low-s.');
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
export function from(entry) {
    const result = (typeof entry === 'string'
        ? { payload: '0x', scheme: 'arbitrary', signature: entry }
        : {
            ...entry,
            payload: entry.payload ?? '0x',
            scheme: entry.scheme ?? 'arbitrary',
        });
    assert(result);
    return result;
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
export function fromRpc(entry) {
    return fromTuple([
        entry.scheme === '0x0'
            ? '0x'
            : Hex.fromNumber(Hex.toNumber(entry.scheme), { size: 1 }),
        entry.signer ?? '0x',
        entry.msg ?? '0x',
        entry.signature ?? '0x',
    ]);
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
export function toRpc(entry) {
    const [scheme, signer, msg, signature] = toTuple(entry);
    return {
        msg,
        scheme: (scheme === '0x'
            ? '0x0'
            : Hex.fromNumber(Hex.toNumber(scheme))),
        ...(signature === '0x' && scheme !== '0x' ? {} : { signature }),
        ...(signer === '0x' ? {} : { signer }),
    };
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
export function fromTuple(tuple) {
    if (!Array.isArray(tuple) || tuple.length !== 4)
        throw new InvalidError('Expected [scheme, signer, payload, signature].');
    const [scheme, signer, payload, signature] = tuple;
    Hex.assert(signer, { strict: true });
    Hex.assert(signature, { strict: true });
    if (signature.length % 2 !== 0)
        throw new InvalidError('signature must contain whole bytes.');
    if (scheme !== '0x' && scheme !== '0x01' && scheme !== '0x02')
        throw new InvalidError('Expected a canonical scheme encoding: empty bytes, 0x01, or 0x02.');
    const metadata = { ...(signer === '0x' ? {} : { signer }), payload };
    if (scheme === '0x') {
        if (signer !== '0x')
            throw new InvalidError('Arbitrary signatures cannot specify a signer.');
        return from({ payload, scheme: 'arbitrary', signature });
    }
    if (signature === '0x')
        return scheme === '0x01'
            ? from({ ...metadata, scheme: 'secp256k1' })
            : from({ ...metadata, scheme: 'p256' });
    if (Hex.size(signature) !== (scheme === '0x01' ? 65 : 128))
        throw new InvalidError('Invalid protocol signature length.');
    if (scheme === '0x01') {
        if (Hex.toNumber(Hex.slice(signature, 0, 1)) > 1)
            throw new InvalidError('Recovery parity must be 0 or 1.');
        return from({
            ...metadata,
            scheme: 'secp256k1',
            signature: {
                r: Hex.toBigInt(Hex.slice(signature, 1, 33)),
                s: Hex.toBigInt(Hex.slice(signature, 33, 65)),
                yParity: Hex.toNumber(Hex.slice(signature, 0, 1)),
            },
        });
    }
    const s = Hex.toBigInt(Hex.slice(signature, 32, 64));
    if (s > p256N / 2n)
        throw new InvalidError('P-256 wire signatures require low-s.');
    return from({
        ...metadata,
        publicKey: {
            prefix: 4,
            x: Hex.toBigInt(Hex.slice(signature, 64, 96)),
            y: Hex.toBigInt(Hex.slice(signature, 96, 128)),
        },
        scheme: 'p256',
        signature: { r: Hex.toBigInt(Hex.slice(signature, 0, 32)), s },
    });
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
export function toTuple(entry) {
    assert(entry);
    const scheme = typeof entry.scheme === 'string' ? schemes[entry.scheme] : entry.scheme;
    const signature = (() => {
        switch (entry.scheme) {
            case 0:
            case 'arbitrary':
                return entry.signature;
            case 1:
            case 'secp256k1': {
                if (entry.signature === undefined || entry.signature === '0x')
                    return '0x';
                const signature = typeof entry.signature === 'string'
                    ? Signature.fromHex(entry.signature)
                    : entry.signature;
                return Hex.concat(Hex.fromNumber(signature.yParity, { size: 1 }), Hex.fromNumber(signature.r, { size: 32 }), Hex.fromNumber(signature.s, { size: 32 }));
            }
            case 2:
            case 'p256': {
                if (entry.signature === undefined || entry.signature === '0x')
                    return '0x';
                const publicKey = entry.publicKey;
                const signature = typeof entry.signature === 'string'
                    ? Signature.fromHex(entry.signature)
                    : entry.signature;
                const s = signature.s;
                return Hex.concat(Hex.fromNumber(signature.r, { size: 32 }), Hex.fromNumber(s > p256N / 2n ? p256N - s : s, { size: 32 }), Hex.fromNumber(publicKey.x, { size: 32 }), Hex.fromNumber(publicKey.y, { size: 32 }));
            }
        }
    })();
    return [
        scheme ? Hex.fromNumber(scheme, { size: 1 }) : '0x',
        entry.signer ?? '0x',
        entry.payload ?? '0x',
        signature,
    ];
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
export function validate(entry, options = {}) {
    try {
        assert(entry, options);
        return true;
    }
    catch {
        return false;
    }
}
/** Thrown when frame signature metadata or encoding is invalid. */
export class InvalidError extends Errors.BaseError {
    constructor(details) {
        super('Invalid frame signature.', { details });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'FrameSignature.InvalidError'
        });
    }
}
//# sourceMappingURL=FrameSignature.js.map