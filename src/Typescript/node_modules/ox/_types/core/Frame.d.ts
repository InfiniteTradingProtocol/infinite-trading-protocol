import * as Address from './Address.js';
import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Hex from './Hex.js';
/** An EIP-8141 call frame. */
export type Frame<bigintType = bigint> = {
    /**
     * Frame calldata.
     * @default '0x'
     */
    data?: Hex.Hex | undefined;
    /**
     * Execution gas budget.
     * @default 0n
     */
    executionGas?: bigintType | undefined;
    /**
     * Approval scope and atomic batching bits.
     * @default 0
     */
    flags?: Flags | undefined;
    /**
     * Execution context: default, verify, or sender.
     * @default 0
     */
    mode?: Mode | undefined;
    /**
     * State gas budget.
     * @default 0n
     */
    stateGas?: bigintType | undefined;
    /** Target address. Omit to target the transaction sender. */
    to?: Address.Address | undefined;
    /**
     * Value transferred by a sender frame, in wei.
     * @default 0n
     */
    value?: bigintType | undefined;
};
/** JSON-RPC representation of a frame. */
export type Rpc = {
    /** Frame calldata. */
    data: Hex.Hex;
    /** Execution gas budget. */
    executionGas: Hex.Hex;
    /** Approval scope and batching bits. */
    flags: Hex.Hex;
    /** Execution mode. */
    mode: Hex.Hex;
    /** State gas budget. */
    stateGas: Hex.Hex;
    /** Target address; absent for the transaction sender. */
    target?: Address.Address | null | undefined;
    /** Value transferred in wei. */
    value: Hex.Hex;
};
/** Frame execution modes. */
export declare const modes: {
    readonly default: 0;
    readonly sender: 2;
    readonly verify: 1;
};
/** A numeric or named frame execution mode. */
export type Mode = number | keyof typeof modes;
/** Approval and atomic batching flags. */
export declare const flags: {
    readonly approveExecution: 2;
    readonly approveExecutionAndPayment: 3;
    readonly approvePayment: 1;
    readonly atomicBatch: 4;
    readonly none: 0;
};
/** Numeric approval and batching bits, or a named flag value. */
export type Flags = number | keyof typeof flags;
/** RLP-ready frame tuple. Empty target bytes refer to the transaction sender. */
export type Tuple = readonly [
    mode: Hex.Hex,
    flags: Hex.Hex,
    target: Hex.Hex,
    limits: readonly [execution: Hex.Hex, state: Hex.Hex],
    value: Hex.Hex,
    data: Hex.Hex
];
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
export declare function assert(frame: Frame): void;
export declare namespace assert {
    type ErrorType = InvalidError | Address.assert.ErrorType | Hex.assert.ErrorType | Errors.GlobalErrorType;
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
export declare function from<const frame extends Frame>(frame: frame | Frame): frame;
export declare namespace from {
    type ErrorType = assert.ErrorType;
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
export declare function fromRpc(frame: Rpc): Frame;
export declare namespace fromRpc {
    type ErrorType = from.ErrorType | Hex.toBigInt.ErrorType | Hex.toNumber.ErrorType;
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
export declare function toRpc(frame: toRpc.Input): Rpc;
export declare namespace toRpc {
    type Input = Frame<Hex.Hex | bigint | number>;
    type ErrorType = Hex.fromNumber.ErrorType | Errors.GlobalErrorType;
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
export declare function fromTuple(tuple: Tuple): Frame;
export declare namespace fromTuple {
    type ErrorType = assert.ErrorType | Hex.toNumber.ErrorType | Hex.toBigInt.ErrorType;
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
export declare function toTuple(frame: Frame): Tuple;
export declare namespace toTuple {
    type ErrorType = assert.ErrorType | Bytes.fromNumber.ErrorType | Hex.fromBytes.ErrorType;
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
export declare function validate(frame: Frame): boolean;
export declare namespace validate {
    type ErrorType = Errors.GlobalErrorType;
}
/** Thrown when an EIP-8141 frame is structurally invalid. */
export declare class InvalidError extends Errors.BaseError {
    readonly name = "Frame.InvalidError";
    constructor(details: string);
}
//# sourceMappingURL=Frame.d.ts.map