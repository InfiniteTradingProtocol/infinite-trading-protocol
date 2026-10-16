import { secp256r1 } from '@noble/curves/p256';
import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import * as Entropy from './internal/entropy.js';
import * as keyDerivation from './internal/keyDerivation.js';
import * as internal from './internal/mnemonic.js';
import * as PublicKey from './PublicKey.js';
/** Re-export of noble/curves P256 utilities. */
export const noble = secp256r1;
/**
 * Creates a new P256 ECDSA key pair consisting of a private key and its corresponding public key.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const { privateKey, publicKey } = P256.createKeyPair()
 * ```
 *
 * @param options - The options to generate the key pair.
 * @returns The generated key pair containing both private and public keys.
 */
export function createKeyPair(options = {}) {
    const { as = 'Hex' } = options;
    const privateKey = randomPrivateKey({ as });
    const publicKey = getPublicKey({ privateKey });
    return {
        privateKey: privateKey,
        publicKey,
    };
}
/**
 * Derives a valid P256 private key from a BIP-39 mnemonic.
 *
 * This is equivalent to passing `Mnemonic.toSeed(mnemonic, { passphrase })`
 * to `P256.fromSeed`.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const privateKey = P256.fromMnemonic(
 *   'test test test test test test test test test test test junk'
 * )
 * ```
 *
 * @param mnemonic - BIP-39 mnemonic phrase.
 * @param options - Options.
 * @returns A valid P256 private key.
 */
export function fromMnemonic(mnemonic, options = {}) {
    const { passphrase } = options;
    const seed = internal.toSeed(mnemonic, { passphrase });
    try {
        return fromSeed(seed, options);
    }
    finally {
        seed.fill(0);
    }
}
/**
 * Derives a valid P256 private key from a seed.
 *
 * The seed must contain at least 32 bytes of cryptographically strong key
 * material. Do not pass a password directly; use a password KDF first.
 *
 * The permanent derivation contract uses the seed as the HMAC-SHA256
 * key. The HMAC message uses the `ox.p256.fromSeed.v1` domain followed by a
 * 32-bit big-endian counter starting at zero. Invalid scalars are skipped.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const privateKey = P256.fromSeed(
 *   '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
 * )
 * ```
 *
 * @param seed - Seed containing at least 32 bytes of cryptographically strong key material.
 * @param options - Options.
 * @returns A valid P256 private key.
 */
export function fromSeed(seed, options = {}) {
    const { as = 'Hex' } = options;
    const bytes = Bytes.from(seed);
    if (bytes.length < 32)
        throw new InvalidSeedSizeError({ size: bytes.length });
    const privateKey = keyDerivation.derive(bytes, fromSeedDomain, {
        validate: noble.utils.isValidPrivateKey,
    });
    if (as === 'Hex') {
        const value = Hex.fromBytes(privateKey);
        privateKey.fill(0);
        return value;
    }
    return privateKey;
}
/**
 * Computes the P256 ECDSA public key from a provided private key.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const publicKey = P256.getPublicKey({ privateKey: '0x...' })
 * ```
 *
 * @param options - The options to compute the public key.
 * @returns The computed public key.
 */
export function getPublicKey(options) {
    const { privateKey } = options;
    const point = secp256r1.ProjectivePoint.fromPrivateKey(typeof privateKey === 'string'
        ? privateKey.slice(2)
        : Hex.fromBytes(privateKey).slice(2));
    return PublicKey.from(point);
}
/**
 * Computes a shared secret using ECDH (Elliptic Curve Diffie-Hellman) between a private key and a public key.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const { privateKey: privateKeyA } = P256.createKeyPair()
 * const { publicKey: publicKeyB } = P256.createKeyPair()
 *
 * const sharedSecret = P256.getSharedSecret({
 *   privateKey: privateKeyA,
 *   publicKey: publicKeyB
 * })
 * ```
 *
 * @param options - The options to compute the shared secret.
 * @returns The computed shared secret.
 */
export function getSharedSecret(options) {
    const { as = 'Hex', privateKey, publicKey } = options;
    const point = secp256r1.ProjectivePoint.fromHex(PublicKey.toHex(publicKey).slice(2));
    const privateKeyHex = typeof privateKey === 'string'
        ? privateKey.slice(2)
        : Hex.fromBytes(privateKey).slice(2);
    const sharedPoint = point.multiply(secp256r1.utils.normPrivateKeyToScalar(privateKeyHex));
    const sharedSecret = sharedPoint.toRawBytes(true); // compressed format
    if (as === 'Hex')
        return Hex.fromBytes(sharedSecret);
    return sharedSecret;
}
/**
 * Generates a random P256 ECDSA private key.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const privateKey = P256.randomPrivateKey()
 * ```
 *
 * @param options - The options to generate the private key.
 * @returns The generated private key.
 */
export function randomPrivateKey(options = {}) {
    const { as = 'Hex' } = options;
    const bytes = secp256r1.utils.randomPrivateKey();
    if (as === 'Hex')
        return Hex.fromBytes(bytes);
    return bytes;
}
/**
 * Recovers the signing public key from the signed payload and signature.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const signature = P256.sign({ payload: '0xdeadbeef', privateKey: '0x...' })
 *
 * const publicKey = P256.recoverPublicKey({ // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   signature, // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @param options - The recovery options.
 * @returns The recovered public key.
 */
export function recoverPublicKey(options) {
    const { payload, signature } = options;
    const { r, s, yParity } = signature;
    const signature_ = new secp256r1.Signature(BigInt(r), BigInt(s)).addRecoveryBit(yParity);
    const payload_ = payload instanceof Uint8Array ? Hex.fromBytes(payload) : payload;
    const point = signature_.recoverPublicKey(payload_.substring(2));
    return PublicKey.from(point);
}
/**
 * Signs the payload with the provided private key and returns a P256 signature.
 *
 * @example
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const signature = P256.sign({ // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   privateKey: '0x...' // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @param options - The signing options.
 * @returns The ECDSA {@link ox#Signature.Signature}.
 */
export function sign(options) {
    const { extraEntropy = Entropy.extraEntropy, hash, payload, privateKey, } = options;
    const { r, s, recovery } = secp256r1.sign(payload instanceof Uint8Array ? payload : Bytes.fromHex(payload), privateKey instanceof Uint8Array ? privateKey : Bytes.fromHex(privateKey), {
        extraEntropy: typeof extraEntropy === 'boolean'
            ? extraEntropy
            : Hex.from(extraEntropy).slice(2),
        lowS: true,
        ...(hash ? { prehash: true } : {}),
    });
    return {
        r,
        s,
        yParity: recovery,
    };
}
/**
 * Verifies a payload was signed by the provided public key.
 *
 * @example
 *
 * ```ts twoslash
 * import { P256 } from 'ox'
 *
 * const { privateKey, publicKey } = P256.createKeyPair()
 * const signature = P256.sign({ payload: '0xdeadbeef', privateKey })
 *
 * const verified = P256.verify({ // [!code focus]
 *   publicKey, // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   signature, // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @param options - The verification options.
 * @returns Whether the payload was signed by the provided public key.
 */
export function verify(options) {
    const { hash, payload, publicKey, signature } = options;
    return secp256r1.verify(signature, payload instanceof Uint8Array ? payload : Bytes.fromHex(payload), PublicKey.toHex(publicKey).substring(2), { lowS: true, ...(hash ? { prehash: true } : {}) });
}
/** Thrown when a seed contains fewer than 32 bytes. */
export class InvalidSeedSizeError extends Errors.BaseError {
    constructor(options) {
        super(`Seed must contain at least 32 bytes. Received ${options.size} bytes.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'P256.InvalidSeedSizeError'
        });
    }
}
const fromSeedDomain = Bytes.fromString('ox.p256.fromSeed.v1');
//# sourceMappingURL=P256.js.map