"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidSeedSizeError = exports.noble = void 0;
exports.createKeyPair = createKeyPair;
exports.fromMnemonic = fromMnemonic;
exports.fromSeed = fromSeed;
exports.getPublicKey = getPublicKey;
exports.getSharedSecret = getSharedSecret;
exports.randomPrivateKey = randomPrivateKey;
exports.recoverPublicKey = recoverPublicKey;
exports.sign = sign;
exports.verify = verify;
const p256_1 = require("@noble/curves/p256");
const Bytes = require("./Bytes.js");
const Errors = require("./Errors.js");
const Hex = require("./Hex.js");
const Entropy = require("./internal/entropy.js");
const keyDerivation = require("./internal/keyDerivation.js");
const internal = require("./internal/mnemonic.js");
const PublicKey = require("./PublicKey.js");
exports.noble = p256_1.secp256r1;
function createKeyPair(options = {}) {
    const { as = 'Hex' } = options;
    const privateKey = randomPrivateKey({ as });
    const publicKey = getPublicKey({ privateKey });
    return {
        privateKey: privateKey,
        publicKey,
    };
}
function fromMnemonic(mnemonic, options = {}) {
    const { passphrase } = options;
    const seed = internal.toSeed(mnemonic, { passphrase });
    try {
        return fromSeed(seed, options);
    }
    finally {
        seed.fill(0);
    }
}
function fromSeed(seed, options = {}) {
    const { as = 'Hex' } = options;
    const bytes = Bytes.from(seed);
    if (bytes.length < 32)
        throw new InvalidSeedSizeError({ size: bytes.length });
    const privateKey = keyDerivation.derive(bytes, fromSeedDomain, {
        validate: exports.noble.utils.isValidPrivateKey,
    });
    if (as === 'Hex') {
        const value = Hex.fromBytes(privateKey);
        privateKey.fill(0);
        return value;
    }
    return privateKey;
}
function getPublicKey(options) {
    const { privateKey } = options;
    const point = p256_1.secp256r1.ProjectivePoint.fromPrivateKey(typeof privateKey === 'string'
        ? privateKey.slice(2)
        : Hex.fromBytes(privateKey).slice(2));
    return PublicKey.from(point);
}
function getSharedSecret(options) {
    const { as = 'Hex', privateKey, publicKey } = options;
    const point = p256_1.secp256r1.ProjectivePoint.fromHex(PublicKey.toHex(publicKey).slice(2));
    const privateKeyHex = typeof privateKey === 'string'
        ? privateKey.slice(2)
        : Hex.fromBytes(privateKey).slice(2);
    const sharedPoint = point.multiply(p256_1.secp256r1.utils.normPrivateKeyToScalar(privateKeyHex));
    const sharedSecret = sharedPoint.toRawBytes(true);
    if (as === 'Hex')
        return Hex.fromBytes(sharedSecret);
    return sharedSecret;
}
function randomPrivateKey(options = {}) {
    const { as = 'Hex' } = options;
    const bytes = p256_1.secp256r1.utils.randomPrivateKey();
    if (as === 'Hex')
        return Hex.fromBytes(bytes);
    return bytes;
}
function recoverPublicKey(options) {
    const { payload, signature } = options;
    const { r, s, yParity } = signature;
    const signature_ = new p256_1.secp256r1.Signature(BigInt(r), BigInt(s)).addRecoveryBit(yParity);
    const payload_ = payload instanceof Uint8Array ? Hex.fromBytes(payload) : payload;
    const point = signature_.recoverPublicKey(payload_.substring(2));
    return PublicKey.from(point);
}
function sign(options) {
    const { extraEntropy = Entropy.extraEntropy, hash, payload, privateKey, } = options;
    const { r, s, recovery } = p256_1.secp256r1.sign(payload instanceof Uint8Array ? payload : Bytes.fromHex(payload), privateKey instanceof Uint8Array ? privateKey : Bytes.fromHex(privateKey), {
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
function verify(options) {
    const { hash, payload, publicKey, signature } = options;
    return p256_1.secp256r1.verify(signature, payload instanceof Uint8Array ? payload : Bytes.fromHex(payload), PublicKey.toHex(publicKey).substring(2), { lowS: true, ...(hash ? { prehash: true } : {}) });
}
class InvalidSeedSizeError extends Errors.BaseError {
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
exports.InvalidSeedSizeError = InvalidSeedSizeError;
const fromSeedDomain = Bytes.fromString('ox.p256.fromSeed.v1');
//# sourceMappingURL=P256.js.map