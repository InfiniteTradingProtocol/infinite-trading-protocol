import * as Address from './Address.js';
import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import * as Quantity from './internal/quantity.js';
/** Frame execution modes. */
export const modes = { default: 0, sender: 2, verify: 1 };
/** Approval and atomic batching flags. */
export const flags = {
    approveExecution: 2,
    approveExecutionAndPayment: 3,
    approvePayment: 1,
    atomicBatch: 4,
    none: 0,
};
/**
 * Asserts that a {@link ox#Frame.Frame} satisfies frame-local constraints.
 *
 * Sender-dependent approval, batch adjacency, expiry, and transaction-wide gas
 * constraints require the enclosing transaction.
 *
 * @example
 * ### Basic Usage
 *
 * Check a verification frame before including it in a transaction.
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * Frame.assert({
 *   executionGas: 50_000n,
 *   flags: 'approveExecutionAndPayment',
 *   mode: 'verify'
 * })
 * ```
 *
 * @param frame - The frame to assert.
 */
export function assert(frame) {
    const { data = '0x', executionGas = 0n, flags: flagsValue = 0, mode: modeValue = 0, stateGas = 0n, value = 0n, } = frame;
    const mode = typeof modeValue === 'string' ? modes[modeValue] : modeValue;
    if (!Number.isInteger(mode) || mode < 0 || mode > 2)
        throw new InvalidError('mode must be a supported name or 0, 1, or 2.');
    const flags_ = typeof flagsValue === 'string' ? flags[flagsValue] : flagsValue;
    if (!Number.isInteger(flags_) || flags_ < 0 || flags_ > 7)
        throw new InvalidError('flags must be a supported name or an integer from 0 to 7.');
    if (flags_ & flags.atomicBatch) {
        if (mode === modes.verify)
            throw new InvalidError('VERIFY frames cannot belong to an atomic batch.');
        if (flags_ & flags.approveExecutionAndPayment)
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
    if (mode !== modes.sender && value !== 0n)
        throw new InvalidError('Only SENDER frames can transfer value.');
    Hex.assert(data, { strict: true });
    if (data.length % 2 !== 0)
        throw new InvalidError('data must contain whole bytes.');
}
/**
 * Coerces a frame object into a {@link ox#Frame.Frame}.
 *
 * Validates the frame and returns a copy, preserving literal types and the supplied
 * numeric or named mode and flags. Omitted fields stay omitted;
 * {@link ox#Frame.(toTuple:function)} supplies their defaults when encoding.
 *
 * @example
 * ### Basic Usage
 *
 * Construct a verification frame that approves execution and payment.
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const frame = Frame.from({
 *   executionGas: 50_000n,
 *   flags: 'approveExecutionAndPayment',
 *   mode: 'verify'
 * })
 * ```
 *
 * @param frame - The frame object to convert.
 * @returns The validated frame.
 */
export function from(frame) {
    assert(frame);
    return { ...frame };
}
/**
 * Converts an RPC frame to a frame.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const frame = Frame.fromRpc({
 *   data: '0x',
 *   executionGas: '0xc350',
 *   flags: '0x3',
 *   mode: '0x1',
 *   stateGas: '0x0',
 *   value: '0x0'
 * })
 * ```
 *
 * @param frame - The value to convert.
 * @returns The converted value.
 */
export function fromRpc(frame) {
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
/**
 * Converts a frame to its JSON-RPC representation.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const frame = Frame.from({ executionGas: 50_000n, mode: 'verify' })
 * const rpc = Frame.toRpc(frame)
 * ```
 *
 * @param frame - The value to convert.
 * @returns The converted value.
 */
export function toRpc(frame) {
    const { flags: flags_ = 0, mode = 0 } = frame;
    return {
        data: frame.data ?? '0x',
        executionGas: Quantity.fromNumberish(frame.executionGas ?? 0n),
        flags: Hex.fromNumber(typeof flags_ === 'string' ? flags[flags_] : flags_),
        mode: Hex.fromNumber(typeof mode === 'string' ? modes[mode] : mode),
        stateGas: Quantity.fromNumberish(frame.stateGas ?? 0n),
        ...(frame.to === undefined ? {} : { target: frame.to }),
        value: Quantity.fromNumberish(frame.value ?? 0n),
    };
}
/**
 * Converts a {@link ox#Frame.Tuple} to a {@link ox#Frame.Frame}.
 *
 * Returns numeric mode and flags. An empty target becomes an omitted `to`.
 * Integer fields must use minimal whole-byte encodings, with empty bytes for zero.
 *
 * @example
 * ### Basic Usage
 *
 * Decode a frame tuple with separate execution and state gas limits.
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const frame = Frame.fromTuple([
 *   '0x01',
 *   '0x03',
 *   '0x',
 *   ['0xc350', '0x'],
 *   '0x',
 *   '0x'
 * ])
 * // @log: {
 * // @log:   data: '0x',
 * // @log:   executionGas: 50000n,
 * // @log:   flags: 3,
 * // @log:   mode: 1,
 * // @log:   stateGas: 0n,
 * // @log:   value: 0n
 * // @log: }
 * ```
 *
 * @param tuple - The frame tuple to convert.
 * @returns The decoded frame.
 */
export function fromTuple(tuple) {
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
/**
 * Converts a {@link ox#Frame.Frame} to its RLP-ready {@link ox#Frame.Tuple}.
 *
 * Named mode and flags are encoded as integers. An omitted target and zero integer
 * fields are encoded as empty bytes. Omitted mode and flags default to zero;
 * omitted gas limits and value default to `0n`, and data defaults to `'0x'`.
 *
 * @example
 * ### Basic Usage
 *
 * Encode a verification frame in the field order required by EIP-8141.
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const tuple = Frame.toTuple({
 *   executionGas: 50_000n,
 *   flags: 'approveExecutionAndPayment',
 *   mode: 'verify'
 * })
 * // @log: ['0x01', '0x03', '0x', ['0xc350', '0x'], '0x', '0x']
 * ```
 *
 * @param frame - The frame to convert.
 * @returns The encoded frame tuple.
 */
export function toTuple(frame) {
    assert(frame);
    const mode = typeof frame.mode === 'string' ? modes[frame.mode] : (frame.mode ?? 0);
    const flags_ = typeof frame.flags === 'string' ? flags[frame.flags] : (frame.flags ?? 0);
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
/**
 * Returns whether a {@link ox#Frame.Frame} satisfies frame-local constraints.
 *
 * Performs the same checks as {@link ox#Frame.(assert:function)}, returning `false`
 * instead of throwing when the frame is invalid.
 *
 * @example
 * ### Basic Usage
 *
 * Check whether a frame is structurally valid.
 *
 * ```ts twoslash
 * import { Frame } from 'ox'
 *
 * const valid = Frame.validate({
 *   executionGas: 50_000n,
 *   flags: 'approveExecutionAndPayment',
 *   mode: 'verify'
 * })
 * // @log: true
 * ```
 *
 * @param frame - The frame to validate.
 * @returns Whether the frame satisfies frame-local constraints.
 */
export function validate(frame) {
    try {
        assert(frame);
        return true;
    }
    catch {
        return false;
    }
}
/** Thrown when an EIP-8141 frame is structurally invalid. */
export class InvalidError extends Errors.BaseError {
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
//# sourceMappingURL=Frame.js.map