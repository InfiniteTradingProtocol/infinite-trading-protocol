import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
export declare const ivLength = 16;
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
export declare function decrypt<value extends Hex.Hex | Bytes.Bytes, as extends 'Hex' | 'Bytes' = (value extends Hex.Hex ? 'Hex' : never) | (value extends Bytes.Bytes ? 'Bytes' : never)>(value: value | Bytes.Bytes | Hex.Hex, key: CryptoKey, options?: decrypt.Options<as>): Promise<decrypt.ReturnType<as>>;
export declare namespace decrypt {
    type Options<as extends 'Bytes' | 'Hex' = 'Bytes' | 'Hex'> = {
        /** The output format. @default 'Bytes' */
        as?: as | 'Bytes' | 'Hex' | undefined;
    };
    type ReturnType<as extends 'Bytes' | 'Hex' = 'Bytes' | 'Hex'> = (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
    type ErrorType = Bytes.from.ErrorType | Hex.from.ErrorType | Errors.GlobalErrorType;
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
export declare function encrypt<value extends Hex.Hex | Bytes.Bytes, as extends 'Bytes' | 'Hex' = (value extends Hex.Hex ? 'Hex' : never) | (value extends Bytes.Bytes ? 'Bytes' : never)>(value: value | Bytes.Bytes | Hex.Hex, key: CryptoKey, options?: encrypt.Options<as>): Promise<encrypt.ReturnType<as>>;
export declare namespace encrypt {
    type Options<as extends 'Bytes' | 'Hex' = 'Bytes' | 'Hex'> = {
        /** The output format. @default 'Hex' */
        as?: as | 'Bytes' | 'Hex' | undefined;
    };
    type ReturnType<as extends 'Bytes' | 'Hex' = 'Bytes' | 'Hex'> = (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
    type ErrorType = Bytes.concat.ErrorType | Bytes.from.ErrorType | Bytes.random.ErrorType | Hex.from.ErrorType | Errors.GlobalErrorType;
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
export declare function fromMnemonic(mnemonic: string, options?: fromMnemonic.Options): Promise<CryptoKey>;
export declare namespace fromMnemonic {
    type Options = {
        /** Optional BIP-39 passphrase. */
        passphrase?: string | undefined;
    };
    type ErrorType = fromSeed.ErrorType;
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
export declare function fromSeed(seed: Hex.Hex | Bytes.Bytes): Promise<CryptoKey>;
export declare namespace fromSeed {
    type ErrorType = Bytes.concat.ErrorType | Bytes.from.ErrorType | Bytes.fromNumber.ErrorType | InvalidSeedSizeError | Errors.GlobalErrorType;
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
export declare function getKey(options: getKey.Options): Promise<CryptoKey>;
export declare namespace getKey {
    type Options = {
        /** The number of iterations to use. @default 900_000 */
        iterations?: number | undefined;
        /** Password to derive key from. */
        password: string;
        /** Salt to use for key derivation. @default `AesGcm.randomSalt(32)` */
        salt?: Bytes.Bytes | undefined;
    };
    type ErrorType = Errors.GlobalErrorType;
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
export declare function randomSalt(size?: number): Bytes.Bytes;
export declare namespace randomSalt {
    type ErrorType = Bytes.random.ErrorType | Errors.GlobalErrorType;
}
/** Thrown when a seed contains fewer than 32 bytes. */
export declare class InvalidSeedSizeError extends Errors.BaseError {
    readonly name = "AesGcm.InvalidSeedSizeError";
    constructor(options: InvalidSeedSizeError.Options);
}
export declare namespace InvalidSeedSizeError {
    /** Options for `AesGcm.InvalidSeedSizeError`. */
    type Options = {
        /** Received seed size. */
        size: number;
    };
}
//# sourceMappingURL=AesGcm.d.ts.map