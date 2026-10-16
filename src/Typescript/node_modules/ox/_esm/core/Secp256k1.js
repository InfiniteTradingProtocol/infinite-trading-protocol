import { secp256k1 } from '@noble/curves/secp256k1';
import * as Address from './Address.js';
import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import * as Entropy from './internal/entropy.js';
import * as keyDerivation from './internal/keyDerivation.js';
import * as internal from './internal/mnemonic.js';
import * as PublicKey from './PublicKey.js';
/** Re-export of noble/curves secp256k1 utilities. */
export const noble = secp256k1;
/**
 * Creates a new secp256k1 ECDSA key pair consisting of a private key and its corresponding public key.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const { privateKey, publicKey } = Secp256k1.createKeyPair()
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
 * Derives a valid secp256k1 private key from a BIP-39 mnemonic.
 *
 * This is equivalent to `Mnemonic.toPrivateKey`, and derives the
 * private key at `m/44'/60'/0'/0/0` by default.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const privateKey = Secp256k1.fromMnemonic(
 *   'test test test test test test test test test test test junk'
 * )
 * ```
 *
 * @param mnemonic - BIP-39 mnemonic phrase.
 * @param options - Options.
 * @returns A valid secp256k1 private key.
 */
export function fromMnemonic(mnemonic, options = {}) {
    const { as = 'Hex', passphrase, path } = options;
    return internal.toPrivateKey(mnemonic, { as, passphrase, path });
}
/**
 * Derives a valid secp256k1 private key from a seed.
 *
 * The seed must contain at least 32 bytes of cryptographically strong key
 * material. Do not pass a password directly; use a password KDF first.
 *
 * The permanent derivation contract uses the seed as the HMAC-SHA256
 * key. The HMAC message uses the `ox.secp256k1.fromSeed.v1` domain followed by
 * a 32-bit big-endian counter starting at zero. Invalid scalars are skipped.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const privateKey = Secp256k1.fromSeed(
 *   '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
 * )
 * ```
 *
 * @param seed - Seed containing at least 32 bytes of cryptographically strong key material.
 * @param options - Options.
 * @returns A valid secp256k1 private key.
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
 * Computes the secp256k1 ECDSA public key from a provided private key.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const publicKey = Secp256k1.getPublicKey({ privateKey: '0x...' })
 * ```
 *
 * @param options - The options to compute the public key.
 * @returns The computed public key.
 */
export function getPublicKey(options) {
    const { privateKey } = options;
    const point = secp256k1.ProjectivePoint.fromPrivateKey(Hex.from(privateKey).slice(2));
    return PublicKey.from(point);
}
/**
 * Computes a shared secret using ECDH (Elliptic Curve Diffie-Hellman) between a private key and a public key.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const { privateKey: privateKeyA } = Secp256k1.createKeyPair()
 * const { publicKey: publicKeyB } = Secp256k1.createKeyPair()
 *
 * const sharedSecret = Secp256k1.getSharedSecret({
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
    const point = secp256k1.ProjectivePoint.fromHex(PublicKey.toHex(publicKey).slice(2));
    const sharedPoint = point.multiply(secp256k1.utils.normPrivateKeyToScalar(Hex.from(privateKey).slice(2)));
    const sharedSecret = sharedPoint.toRawBytes(true); // compressed format
    if (as === 'Hex')
        return Hex.fromBytes(sharedSecret);
    return sharedSecret;
}
/**
 * Generates a random ECDSA private key on the secp256k1 curve.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const privateKey = Secp256k1.randomPrivateKey()
 * ```
 *
 * @param options - The options to generate the private key.
 * @returns The generated private key.
 */
export function randomPrivateKey(options = {}) {
    const { as = 'Hex' } = options;
    const bytes = secp256k1.utils.randomPrivateKey();
    if (as === 'Hex')
        return Hex.fromBytes(bytes);
    return bytes;
}
/**
 * Recovers the signing address from the signed payload and signature.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const signature = Secp256k1.sign({ payload: '0xdeadbeef', privateKey: '0x...' })
 *
 * const address = Secp256k1.recoverAddress({ // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   signature, // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @param options - The recovery options.
 * @returns The recovered address.
 */
export function recoverAddress(options) {
    return Address.fromPublicKey(recoverPublicKey(options));
}
/**
 * Recovers the signing public key from the signed payload and signature.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const signature = Secp256k1.sign({ payload: '0xdeadbeef', privateKey: '0x...' })
 *
 * const publicKey = Secp256k1.recoverPublicKey({ // [!code focus]
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
    const signature_ = new secp256k1.Signature(BigInt(r), BigInt(s)).addRecoveryBit(yParity);
    const point = signature_.recoverPublicKey(Hex.from(payload).substring(2));
    return PublicKey.from(point);
}
/**
 * Signs the payload with the provided private key.
 *
 * @example
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const signature = Secp256k1.sign({ // [!code focus]
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
    const { r, s, recovery } = secp256k1.sign(Bytes.from(payload), Bytes.from(privateKey), {
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
 * Verifies a payload was signed by the provided address.
 *
 * @example
 * ### Verify with Ethereum Address
 *
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const signature = Secp256k1.sign({ payload: '0xdeadbeef', privateKey: '0x...' })
 *
 * const verified = Secp256k1.verify({ // [!code focus]
 *   address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   signature, // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @example
 * ### Verify with Public Key
 *
 * ```ts twoslash
 * import { Secp256k1 } from 'ox'
 *
 * const privateKey = '0x...'
 * const publicKey = Secp256k1.getPublicKey({ privateKey })
 * const signature = Secp256k1.sign({ payload: '0xdeadbeef', privateKey })
 *
 * const verified = Secp256k1.verify({ // [!code focus]
 *   publicKey, // [!code focus]
 *   payload: '0xdeadbeef', // [!code focus]
 *   signature, // [!code focus]
 * }) // [!code focus]
 * ```
 *
 * @param options - The verification options.
 * @returns Whether the payload was signed by the provided address.
 */
export function verify(options) {
    const { hash, payload } = options;
    if (options.address)
        return Address.isEqual(options.address, recoverAddress({ payload, signature: options.signature }));
    return secp256k1.verify(options.signature, Bytes.from(payload), PublicKey.toBytes(options.publicKey), ...(hash ? [{ prehash: true, lowS: true }] : []));
}
/** Thrown when a seed contains fewer than 32 bytes. */
export class InvalidSeedSizeError extends Errors.BaseError {
    constructor(options) {
        super(`Seed must contain at least 32 bytes. Received ${options.size} bytes.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Secp256k1.InvalidSeedSizeError'
        });
    }
}
const fromSeedDomain = Bytes.fromString('ox.secp256k1.fromSeed.v1');
//# sourceMappingURL=Secp256k1.js.map