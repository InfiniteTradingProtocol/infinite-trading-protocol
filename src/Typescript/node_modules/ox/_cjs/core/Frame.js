"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidError = exports.flags = exports.modes = void 0;
exports.assert = assert;
exports.from = from;
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
exports.fromTuple = fromTuple;
exports.toTuple = toTuple;
exports.validate = validate;
const Address = require("./Address.js");
const Bytes = require("./Bytes.js");
const Errors = require("./Errors.js");
const Hex = require("./Hex.js");
const Quantity = require("./internal/quantity.js");
exports.modes = { default: 0, sender: 2, verify: 1 };
exports.flags = {
    approveExecution: 2,
    approveExecutionAndPayment: 3,
    approvePayment: 1,
    atomicBatch: 4,
    none: 0,
};
function assert(frame) {
    const { data = '0x', executionGas = 0n, flags: flagsValue = 0, mode: modeValue = 0, stateGas = 0n, value = 0n, } = frame;
    const mode = typeof modeValue === 'string' ? exports.modes[modeValue] : modeValue;
    if (!Number.isInteger(mode) || mode < 0 || mode > 2)
        throw new InvalidError('mode must be a supported name or 0, 1, or 2.');
    const flags_ = typeof flagsValue === 'string' ? exports.flags[flagsValue] : flagsValue;
    if (!Number.isInteger(flags_) || flags_ < 0 || flags_ > 7)
        throw new InvalidError('flags must be a supported name or an integer from 0 to 7.');
    if (flags_ & exports.flags.atomicBatch) {
        if (mode === exports.modes.verify)
            throw new InvalidError('VERIFY frames cannot belong to an atomic batch.');
        if (flags_ & exports.flags.approveExecutionAndPayment)
            throw new InvalidError('Atomic batch frames cannot approve execution or payment.');
    }
    if (frame.to !== undefined)
        Address.assert(frame.to, { strict: false });
    for (const [field, limit] of [
        ['executionGas', executionGas],
        ['stateGas', stateGas],
    ])
        if (typeof limit !== 'bigint' || limit < 0n || limit >= 2n ** 64n)
            throw new InvalidError(`${field} must be an unsigned 64-bit integer.`);
    if (executionGas + stateGas >= 2n ** 64n)
        throw new InvalidError('Combined frame gas must be less than 2^64.');
    if (typeof value !== 'bigint' || value < 0n || value >= 2n ** 256n)
        throw new InvalidError('value must be an unsigned 256-bit integer.');
    if (mode !== exports.modes.sender && value !== 0n)
        throw new InvalidError('Only SENDER frames can transfer value.');
    Hex.assert(data, { strict: true });
    if (data.length % 2 !== 0)
        throw new InvalidError('data must contain whole bytes.');
}
function from(frame) {
    assert(frame);
    return { ...frame };
}
function fromRpc(frame) {
    return from({
        data: frame.data,
        executionGas: Hex.toBigInt(frame.executionGas),
        flags: Hex.toNumber(frame.flags),
        mode: Hex.toNumber(frame.mode),
        stateGas: Hex.toBigInt(frame.stateGas),
        ...(frame.target == null ? {} : { to: frame.target }),
        value: Hex.toBigInt(frame.value),
    });
}
function toRpc(frame) {
    const { flags: flags_ = 0, mode = 0 } = frame;
    return {
        data: frame.data ?? '0x',
        executionGas: Quantity.fromNumberish(frame.executionGas ?? 0n),
        flags: Hex.fromNumber(typeof flags_ === 'string' ? exports.flags[flags_] : flags_),
        mode: Hex.fromNumber(typeof mode === 'string' ? exports.modes[mode] : mode),
        stateGas: Quantity.fromNumberish(frame.stateGas ?? 0n),
        ...(frame.to === undefined ? {} : { target: frame.to }),
        value: Quantity.fromNumberish(frame.value ?? 0n),
    };
}
function fromTuple(tuple) {
    if (!Array.isArray(tuple) ||
        tuple.length !== 6 ||
        !Array.isArray(tuple[3]) ||
        tuple[3].length !== 2)
        throw new InvalidError('Expected [mode, flags, target, [execution, state], value, data].');
    const [mode, flags, target, [execution, state], value, data] = tuple;
    Hex.assert(target, { strict: true });
    Hex.assert(data, { strict: true });
    const quantities = [mode, flags, execution, state, value];
    for (const quantity of quantities) {
        Hex.assert(quantity, { strict: true });
        if (quantity.length % 2 !== 0 || quantity.startsWith('0x00'))
            throw new InvalidError('Integers must use minimal whole-byte encodings, with empty bytes for zero.');
    }
    const frame = {
        ...(target === '0x' ? {} : { to: target }),
        data,
        executionGas: execution === '0x' ? 0n : Hex.toBigInt(execution),
        flags: flags === '0x' ? 0 : Hex.toNumber(flags),
        mode: mode === '0x' ? 0 : Hex.toNumber(mode),
        stateGas: state === '0x' ? 0n : Hex.toBigInt(state),
        value: value === '0x' ? 0n : Hex.toBigInt(value),
    };
    assert(frame);
    return frame;
}
function toTuple(frame) {
    assert(frame);
    const mode = typeof frame.mode === 'string' ? exports.modes[frame.mode] : (frame.mode ?? 0);
    const flags_ = typeof frame.flags === 'string' ? exports.flags[frame.flags] : (frame.flags ?? 0);
    return [
        mode ? Hex.fromBytes(Bytes.fromNumber(mode)) : '0x',
        flags_ ? Hex.fromBytes(Bytes.fromNumber(flags_)) : '0x',
        frame.to ?? '0x',
        [
            frame.executionGas
                ? Hex.fromBytes(Bytes.fromNumber(frame.executionGas))
                : '0x',
            frame.stateGas ? Hex.fromBytes(Bytes.fromNumber(frame.stateGas)) : '0x',
        ],
        frame.value ? Hex.fromBytes(Bytes.fromNumber(frame.value)) : '0x',
        frame.data ?? '0x',
    ];
}
function validate(frame) {
    try {
        assert(frame);
        return true;
    }
    catch {
        return false;
    }
}
class InvalidError extends Errors.BaseError {
    constructor(details) {
        super('Invalid frame.', { details });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Frame.InvalidError'
        });
    }
}
exports.InvalidError = InvalidError;
//# sourceMappingURL=Frame.js.map