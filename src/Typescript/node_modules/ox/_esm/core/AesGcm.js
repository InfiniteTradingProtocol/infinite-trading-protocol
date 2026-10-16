import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import * as Mnemonic from './Mnemonic.js';
export const ivLength = 16;
/**
 * Decrypts encrypted data using AES-GCM.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm, Hex } from 'ox'
 *
 * const key = await AesGcm.getKey({ password: 'qwerty' })
 * const secret = Hex.fromString('i am a secret message')
 *
 * const encrypted = await AesGcm.encrypt(secret, key)
 *
 * const decrypted = await AesGcm.decrypt(encrypted, key) // [!code focus]
 * // @log: Hex.fromString('i am a secret message')
 * ```
 *
 * @param value - The data to encrypt.
 * @param key - The `CryptoKey` to use for encryption.
 * @param options - Decryption options.
 * @returns The decrypted data.
 */
export async function decrypt(value, key, options = {}) {
    const { as = typeof value === 'string' ? 'Hex' : 'Bytes' } = options;
    const encrypted = Bytes.from(value);
    const iv = encrypted.slice(0, ivLength);
    const data = encrypted.slice(ivLength);
    const decrypted = await globalThis.crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv,
    }, key, Bytes.from(data));
    const result = new Uint8Array(decrypted);
    if (as === 'Bytes')
        return result;
    return Hex.from(result);
}
/**
 * Encrypts data using AES-GCM.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm, Hex } from 'ox'
 *
 * const key = await AesGcm.getKey({ password: 'qwerty' })
 * const secret = Hex.fromString('i am a secret message')
 *
 * const encrypted = await AesGcm.encrypt(secret, key) // [!code focus]
 * // @log: '0x5e257b25bcf53d5431e54e5a68ca0138306d31bb6154f35a97bb8ea18111e7d82bcf619d3c76c4650688bc5310eed80b8fc86d1e3e'
 * ```
 *
 * @param value - The data to encrypt.
 * @param key - The `CryptoKey` to use for encryption.
 * @param options - Encryption options.
 * @returns The encrypted data.
 */
export async function encrypt(value, key, options = {}) {
    const { as = typeof value === 'string' ? 'Hex' : 'Bytes' } = options;
    const iv = Bytes.random(ivLength);
    const encrypted = await globalThis.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv,
    }, key, Bytes.from(value));
    const result = Bytes.concat(iv, new Uint8Array(encrypted));
    if (as === 'Bytes')
        return result;
    return Hex.from(result);
}
/**
 * Derives an AES-256-GCM key from a BIP-39 mnemonic.
 *
 * This is equivalent to passing `Mnemonic.toSeed(mnemonic, { passphrase })`
 * to `AesGcm.fromSeed`.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm } from 'ox'
 *
 * const key = await AesGcm.fromMnemonic(
 *   'test test test test test test test test test test test junk'
 * )
 * ```
 *
 * @param mnemonic - BIP-39 mnemonic phrase.
 * @param options - Options.
 * @returns A nonextractable AES-256-GCM key for encryption and decryption.
 */
export async function fromMnemonic(mnemonic, options = {}) {
    const { passphrase } = options;
    const seed = Mnemonic.toSeed(mnemonic, { passphrase });
    try {
        return await fromSeed(seed);
    }
    finally {
        seed.fill(0);
    }
}
/**
 * Derives an AES-256-GCM key from a seed.
 *
 * The seed must contain at least 32 bytes of cryptographically strong key
 * material. Do not pass a password directly; use a password KDF first.
 *
 * The permanent derivation contract uses the seed as the HMAC-SHA256
 * key. The HMAC message uses the `ox.aesGcm.fromSeed.v1` domain followed by a
 * 32-bit big-endian counter set to zero.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm } from 'ox'
 *
 * const key = await AesGcm.fromSeed(
 *   '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
 * )
 * ```
 *
 * @param seed - Seed containing at least 32 bytes of cryptographically strong key material.
 * @returns A nonextractable AES-256-GCM key for encryption and decryption.
 */
export async function fromSeed(seed) {
    const bytes = Bytes.from(seed);
    if (bytes.length < 32)
        throw new InvalidSeedSizeError({ size: bytes.length });
    return deriveKey(bytes, fromSeedDomain);
}
/**
 * Derives an AES-GCM key from a password using PBKDF2.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm } from 'ox'
 *
 * const key = await AesGcm.getKey({ password: 'qwerty' })
 * // @log: CryptoKey {}
 * ```
 *
 * @param options - Options for key derivation.
 * @returns The derived key.
 */
export async function getKey(options) {
    const { iterations = 900_000, password, salt = randomSalt(32) } = options;
    const baseKey = await globalThis.crypto.subtle.importKey('raw', Bytes.fromString(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const key = await globalThis.crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
    }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return key;
}
/**
 * Generates a random salt of the specified size.
 *
 * @example
 * ```ts twoslash
 * import { AesGcm } from 'ox'
 *
 * const salt = AesGcm.randomSalt()
 * // @log: Uint8Array [123, 79, 183, 167, 163, 136, 136, 16, 168, 126, 13, 165, 170, 166, 136, 136, 16, 168, 126, 13, 165, 170, 166, 136, 136, 16, 168, 126, 13, 165, 170, 166]
 * ```
 *
 * @param size - The size of the salt to generate. Defaults to `32`.
 * @returns A random salt of the specified size.
 */
export function randomSalt(size = 32) {
    return Bytes.random(size);
}
/** Thrown when a seed contains fewer than 32 bytes. */
export class InvalidSeedSizeError extends Errors.BaseError {
    constructor(options) {
        super(`Seed must contain at least 32 bytes. Received ${options.size} bytes.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'AesGcm.InvalidSeedSizeError'
        });
    }
}
async function deriveKey(seed, domain) {
    const baseKey = await globalThis.crypto.subtle.importKey('raw', seed, {
        name: 'HMAC',
        hash: 'SHA-256',
    }, false, ['sign']);
    const key = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', baseKey, Bytes.concat(domain, Bytes.fromNumber(0, { size: 4 }))));
    try {
        return await globalThis.crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    finally {
        key.fill(0);
    }
}
const fromSeedDomain = Bytes.fromString('ox.aesGcm.fromSeed.v1');
//# sourceMappingURL=AesGcm.js.map