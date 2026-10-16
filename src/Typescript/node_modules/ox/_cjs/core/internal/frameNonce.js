"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidError = void 0;
exports.assert = assert;
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
const Errors = require("../Errors.js");
const Hex = require("../Hex.js");
const Quantity = require("./quantity.js");
function assert(keys, nonce) {
    if (!Array.isArray(keys) || keys.length < 1 || keys.length > 16)
        throw new InvalidError('Expected between 1 and 16 nonce keys.');
    for (const [index, key] of keys.entries()) {
        if (typeof key !== 'bigint' || key < 0n || key >= 2n ** 256n)
            throw new InvalidError('Nonce keys must be unsigned 256-bit integers.');
        if (index > 0 && key <= keys[index - 1])
            throw new InvalidError('Nonce keys must be strictly increasing.');
    }
    if (keys.length > 1 && keys[0] === 0n)
        throw new InvalidError('The zero nonce key cannot be combined with other keys.');
    if (nonce !== undefined &&
        (typeof nonce !== 'bigint' || nonce < 0n || nonce >= 2n ** 64n - 1n))
        throw new InvalidError('Nonce must be less than 2^64 - 1 and nonnegative.');
}
function fromRpc(keys, nonce) {
    if (!Array.isArray(keys))
        throw new InvalidError('Expected a nonce key list.');
    const integer = (value) => {
        if (typeof value !== 'string' ||
            !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value))
            throw new InvalidError('Expected a canonical RPC nonce quantity.');
        return Hex.toBigInt(value);
    };
    const decoded = keys.map(integer);
    assert(decoded, nonce === undefined ? undefined : integer(nonce));
    return decoded;
}
function toRpc(keys, nonce) {
    if (!Array.isArray(keys))
        throw new InvalidError('Expected a nonce key list.');
    const encoded = keys.map((key) => Quantity.fromNumberish(key));
    fromRpc(encoded, nonce === undefined ? undefined : Quantity.fromNumberish(nonce));
    return encoded;
}
class InvalidError extends Errors.BaseError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'FrameNonce.InvalidError'
        });
    }
}
exports.InvalidError = InvalidError;
//# sourceMappingURL=frameNonce.js.map