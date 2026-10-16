"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidSeedSizeError = exports.ivLength = void 0;
exports.decrypt = decrypt;
exports.encrypt = encrypt;
exports.fromMnemonic = fromMnemonic;
exports.fromSeed = fromSeed;
exports.getKey = getKey;
exports.randomSalt = randomSalt;
const Bytes = require("./Bytes.js");
const Errors = require("./Errors.js");
const Hex = require("./Hex.js");
const Mnemonic = require("./Mnemonic.js");
exports.ivLength = 16;
async function decrypt(value, key, options = {}) {
    const { as = typeof value === 'string' ? 'Hex' : 'Bytes' } = options;
    const encrypted = Bytes.from(value);
    const iv = encrypted.slice(0, exports.ivLength);
    const data = encrypted.slice(exports.ivLength);
    const decrypted = await globalThis.crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv,
    }, key, Bytes.from(data));
    const result = new Uint8Array(decrypted);
    if (as === 'Bytes')
        return result;
    return Hex.from(result);
}
async function encrypt(value, key, options = {}) {
    const { as = typeof value === 'string' ? 'Hex' : 'Bytes' } = options;
    const iv = Bytes.random(exports.ivLength);
    const encrypted = await globalThis.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv,
    }, key, Bytes.from(value));
    const result = Bytes.concat(iv, new Uint8Array(encrypted));
    if (as === 'Bytes')
        return result;
    return Hex.from(result);
}
async function fromMnemonic(mnemonic, options = {}) {
    const { passphrase } = options;
    const seed = Mnemonic.toSeed(mnemonic, { passphrase });
    try {
        return await fromSeed(seed);
    }
    finally {
        seed.fill(0);
    }
}
async function fromSeed(seed) {
    const bytes = Bytes.from(seed);
    if (bytes.length < 32)
        throw new InvalidSeedSizeError({ size: bytes.length });
    return deriveKey(bytes, fromSeedDomain);
}
async function getKey(options) {
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
function randomSalt(size = 32) {
    return Bytes.random(size);
}
class InvalidSeedSizeError extends Errors.BaseError {
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
exports.InvalidSeedSizeError = InvalidSeedSizeError;
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