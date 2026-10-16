"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidSeedSizeError = exports.noble = void 0;
exports.createKeyPair = createKeyPair;
exports.fromMnemonic = fromMnemonic;
exports.fromSeed = fromSeed;
exports.getPublicKey = getPublicKey;
exports.getSharedSecret = getSharedSecret;
exports.randomPrivateKey = randomPrivateKey;
exports.recoverAddress = recoverAddress;
exports.recoverPublicKey = recoverPublicKey;
exports.sign = sign;
exports.verify = verify;
const secp256k1_1 = require("@noble/curves/secp256k1");
const Address = require("./Address.js");
const Bytes = require("./Bytes.js");
const Errors = require("./Errors.js");
const Hex = require("./Hex.js");
const Entropy = require("./internal/entropy.js");
const keyDerivation = require("./internal/keyDerivation.js");
const internal = require("./internal/mnemonic.js");
const PublicKey = require("./PublicKey.js");
exports.noble = secp256k1_1.secp256k1;
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
    const { as = 'Hex', passphrase, path } = options;
    return internal.toPrivateKey(mnemonic, { as, passphrase, path });
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
    const point = secp256k1_1.secp256k1.ProjectivePoint.fromPrivateKey(Hex.from(privateKey).slice(2));
    return PublicKey.from(point);
}
function getSharedSecret(options) {
    const { as = 'Hex', privateKey, publicKey } = options;
    const point = secp256k1_1.secp256k1.ProjectivePoint.fromHex(PublicKey.toHex(publicKey).slice(2));
    const sharedPoint = point.multiply(secp256k1_1.secp256k1.utils.normPrivateKeyToScalar(Hex.from(privateKey).slice(2)));
    const sharedSecret = sharedPoint.toRawBytes(true);
    if (as === 'Hex')
        return Hex.fromBytes(sharedSecret);
    return sharedSecret;
}
function randomPrivateKey(options = {}) {
    const { as = 'Hex' } = options;
    const bytes = secp256k1_1.secp256k1.utils.randomPrivateKey();
    if (as === 'Hex')
        return Hex.fromBytes(bytes);
    return bytes;
}
function recoverAddress(options) {
    return Address.fromPublicKey(recoverPublicKey(options));
}
function recoverPublicKey(options) {
    const { payload, signature } = options;
    const { r, s, yParity } = signature;
    const signature_ = new secp256k1_1.secp256k1.Signature(BigInt(r), BigInt(s)).addRecoveryBit(yParity);
    const point = signature_.recoverPublicKey(Hex.from(payload).substring(2));
    return PublicKey.from(point);
}
function sign(options) {
    const { extraEntropy = Entropy.extraEntropy, hash, payload, privateKey, } = options;
    const { r, s, recovery } = secp256k1_1.secp256k1.sign(Bytes.from(payload), Bytes.from(privateKey), {
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
    const { hash, payload } = options;
    if (options.address)
        return Address.isEqual(options.address, recoverAddress({ payload, signature: options.signature }));
    return secp256k1_1.secp256k1.verify(options.signature, Bytes.from(payload), PublicKey.toBytes(options.publicKey), ...(hash ? [{ prehash: true, lowS: true }] : []));
}
class InvalidSeedSizeError extends Errors.BaseError {
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
exports.InvalidSeedSizeError = InvalidSeedSizeError;
const fromSeedDomain = Bytes.fromString('ox.secp256k1.fromSeed.v1');
//# sourceMappingURL=Secp256k1.js.map