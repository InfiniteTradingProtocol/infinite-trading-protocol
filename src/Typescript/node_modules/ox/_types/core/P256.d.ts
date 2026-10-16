import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import * as keyDerivation from './internal/keyDerivation.js';
import * as PublicKey from './PublicKey.js';
import type * as Signature from './Signature.js';
/** Re-export of noble/curves P256 utilities. */
export declare const noble: import("@noble/curves/_shortw_utils").CurveFnWithCreate;
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
export declare function createKeyPair<as extends 'Hex' | 'Bytes' = 'Hex'>(options?: createKeyPair.Options<as>): createKeyPair.ReturnType<as>;
export declare namespace createKeyPair {
    type Options<as extends 'Hex' | 'Bytes' = 'Hex'> = {
        /**
         * Format of the returned private key.
         * @default 'Hex'
         */
        as?: as | 'Hex' | 'Bytes' | undefined;
    };
    type ReturnType<as extends 'Hex' | 'Bytes'> = {
        privateKey: (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
        publicKey: PublicKey.PublicKey;
    };
    type ErrorType = Hex.fromBytes.ErrorType | PublicKey.from.ErrorType | Errors.GlobalErrorType;
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
export declare function fromMnemonic<as extends 'Hex' | 'Bytes' = 'Hex'>(mnemonic: string, options?: fromMnemonic.Options<as>): fromMnemonic.ReturnType<as>;
export declare namespace fromMnemonic {
    type Options<as extends 'Hex' | 'Bytes' = 'Hex'> = {
        /**
         * Format of the returned private key.
         * @default 'Hex'
         */
        as?: as | 'Hex' | 'Bytes' | undefined;
        /** Optional BIP-39 passphrase. */
        passphrase?: string | undefined;
    };
    type ReturnType<as extends 'Hex' | 'Bytes'> = fromSeed.ReturnType<as>;
    type ErrorType = fromSeed.ErrorType;
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
export declare function fromSeed<as extends 'Hex' | 'Bytes' = 'Hex'>(seed: Hex.Hex | Bytes.Bytes, options?: fromSeed.Options<as>): fromSeed.ReturnType<as>;
export declare namespace fromSeed {
    type Options<as extends 'Hex' | 'Bytes' = 'Hex'> = {
        /**
         * Format of the returned private key.
         * @default 'Hex'
         */
        as?: as | 'Hex' | 'Bytes' | undefined;
    };
    type ReturnType<as extends 'Hex' | 'Bytes'> = (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
    type ErrorType = Bytes.from.ErrorType | Hex.fromBytes.ErrorType | keyDerivation.derive.ErrorType | InvalidSeedSizeError | Errors.GlobalErrorType;
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
export declare function getPublicKey(options: getPublicKey.Options): PublicKey.PublicKey;
export declare namespace getPublicKey {
    type Options = {
        /**
         * Private key to compute the public key from.
         */
        privateKey: Hex.Hex | Bytes.Bytes;
    };
    type ErrorType = Errors.GlobalErrorType;
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
export declare function getSharedSecret<as extends 'Hex' | 'Bytes' = 'Hex'>(options: getSharedSecret.Options<as>): getSharedSecret.ReturnType<as>;
export declare namespace getSharedSecret {
    type Options<as extends 'Hex' | 'Bytes' = 'Hex'> = {
        /**
         * Format of the returned shared secret.
         * @default 'Hex'
         */
        as?: as | 'Hex' | 'Bytes' | undefined;
        /**
         * Private key to use for the shared secret computation.
         */
        privateKey: Hex.Hex | Bytes.Bytes;
        /**
         * Public key to use for the shared secret computation.
         */
        publicKey: PublicKey.PublicKey<boolean>;
    };
    type ReturnType<as extends 'Hex' | 'Bytes'> = (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
    type ErrorType = Hex.fromBytes.ErrorType | PublicKey.toHex.ErrorType | Errors.GlobalErrorType;
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
export declare function randomPrivateKey<as extends 'Hex' | 'Bytes' = 'Hex'>(options?: randomPrivateKey.Options<as>): randomPrivateKey.ReturnType<as>;
export declare namespace randomPrivateKey {
    type Options<as extends 'Hex' | 'Bytes' = 'Hex'> = {
        /**
         * Format of the returned private key.
         * @default 'Hex'
         */
        as?: as | 'Hex' | 'Bytes' | undefined;
    };
    type ReturnType<as extends 'Hex' | 'Bytes'> = (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
    type ErrorType = Hex.fromBytes.ErrorType | Errors.GlobalErrorType;
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
export declare function recoverPublicKey(options: recoverPublicKey.Options): PublicKey.PublicKey;
export declare namespace recoverPublicKey {
    type Options = {
        /** Payload that was signed. */
        payload: Hex.Hex | Bytes.Bytes;
        /** Signature of the payload. */
        signature: Signature.Signature;
    };
    type ErrorType = PublicKey.from.ErrorType | Hex.fromBytes.ErrorType | Errors.GlobalErrorType;
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
export declare function sign(options: sign.Options): Signature.Signature;
export declare namespace sign {
    type Options = {
        /**
         * Extra entropy to add to the signing process. Setting to `false` will disable it.
         * @default true
         */
        extraEntropy?: boolean | Hex.Hex | Bytes.Bytes | undefined;
        /**
         * If set to `true`, the payload will be hashed (sha256) before being signed.
         */
        hash?: boolean | undefined;
        /**
         * Payload to sign.
         */
        payload: Hex.Hex | Bytes.Bytes;
        /**
         * ECDSA private key.
         */
        privateKey: Hex.Hex | Bytes.Bytes;
    };
    type ErrorType = Bytes.fromHex.ErrorType | Errors.GlobalErrorType;
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
export declare function verify(options: verify.Options): boolean;
export declare namespace verify {
    type Options = {
        /** If set to `true`, the payload will be hashed (sha256) before being verified. */
        hash?: boolean | undefined;
        /** Payload that was signed. */
        payload: Hex.Hex | Bytes.Bytes;
        /** Public key that signed the payload. */
        publicKey: PublicKey.PublicKey<boolean>;
        /** Signature of the payload. */
        signature: Signature.Signature<boolean>;
    };
    type ErrorType = Errors.GlobalErrorType;
}
/** Thrown when a seed contains fewer than 32 bytes. */
export declare class InvalidSeedSizeError extends Errors.BaseError {
    readonly name = "P256.InvalidSeedSizeError";
    constructor(options: InvalidSeedSizeError.Options);
}
export declare namespace InvalidSeedSizeError {
    /** Options for `P256.InvalidSeedSizeError`. */
    type Options = {
        /** Received seed size. */
        size: number;
    };
}
//# sourceMappingURL=P256.d.ts.map