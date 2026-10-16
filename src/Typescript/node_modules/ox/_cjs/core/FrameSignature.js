"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidError = exports.schemes = void 0;
exports.assert = assert;
exports.from = from;
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
exports.fromTuple = fromTuple;
exports.toTuple = toTuple;
exports.validate = validate;
const Address = require("./Address.js");
const Errors = require("./Errors.js");
const Hex = require("./Hex.js");
const curves_js_1 = require("./internal/curves.js");
const PublicKey = require("./PublicKey.js");
const Signature = require("./Signature.js");
exports.schemes = { arbitrary: 0, p256: 2, secp256k1: 1 };
function assert(entry, options = {}) {
    const scheme = typeof entry.scheme === 'string' ? exports.schemes[entry.scheme] : entry.scheme;
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
    const order = scheme === 1 ? curves_js_1.secp256k1N : curves_js_1.p256N;
    if (r === 0n ||
        r >= order ||
        s === 0n ||
        s >= order ||
        (scheme === 1 && s > order / 2n))
        throw new InvalidError('Signature scalars must be in range; secp256k1 requires low-s.');
}
function from(entry) {
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
function fromRpc(entry) {
    return fromTuple([
        entry.scheme === '0x0'
            ? '0x'
            : Hex.fromNumber(Hex.toNumber(entry.scheme), { size: 1 }),
        entry.signer ?? '0x',
        entry.msg ?? '0x',
        entry.signature ?? '0x',
    ]);
}
function toRpc(entry) {
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
function fromTuple(tuple) {
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
    if (s > curves_js_1.p256N / 2n)
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
function toTuple(entry) {
    assert(entry);
    const scheme = typeof entry.scheme === 'string' ? exports.schemes[entry.scheme] : entry.scheme;
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
                return Hex.concat(Hex.fromNumber(signature.r, { size: 32 }), Hex.fromNumber(s > curves_js_1.p256N / 2n ? curves_js_1.p256N - s : s, { size: 32 }), Hex.fromNumber(publicKey.x, { size: 32 }), Hex.fromNumber(publicKey.y, { size: 32 }));
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
function validate(entry, options = {}) {
    try {
        assert(entry, options);
        return true;
    }
    catch {
        return false;
    }
}
class InvalidError extends Errors.BaseError {
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
exports.InvalidError = InvalidError;
//# sourceMappingURL=FrameSignature.js.map