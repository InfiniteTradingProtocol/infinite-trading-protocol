import type { Hex } from '../types/misc.js';
import type { UnionOmit } from '../types/utils.js';
import { type DecodeErrorResultReturnType } from '../utils/abi/decodeErrorResult.js';
import * as Abis from './Abis.js';
type AllAbis = typeof Abis.coreErrors;
type AbiErrorName = Extract<AllAbis[number], {
    type: 'error';
}>['name'];
type DecodedError<error = DecodeErrorResultReturnType<AllAbis>> = error extends DecodeErrorResultReturnType<AllAbis> ? Omit<error, 'args'> & {
    args: error['args'] | undefined;
    data: Hex;
    message: string;
} : never;
/** Decoded execution error from a Tempo precompile revert or selector. */
export type ExecutionError = DecodedError | {
    errorName: 'unknown';
    message: string;
};
/** Execution error metadata suitable for JSON serialization. */
export type Rpc = UnionOmit<DecodedError, 'args'> | Extract<ExecutionError, {
    errorName: 'unknown';
}>;
/** Human-readable templates keyed by error signature in `Abis.core`, with positional `{0}` placeholders. */
export declare const messages: Record<`${AbiErrorName}(${string})`, string>;
/** Steps to resolve an error, keyed by error signature in `Abis.core`. */
export declare const hints: Partial<Record<keyof typeof messages, readonly string[]>>;
/**
 * Decorates a copy of an error with decoded Tempo execution details.
 *
 * Preserves the input's prototype, stack, cause, and custom properties.
 * Hex input can be a selector or full revert data. Without arguments,
 * message placeholders remain uninterpolated.
 *
 * @example
 * ```ts
 * import { ExecutionError } from 'viem/tempo'
 *
 * const error = ExecutionError.from('0x82b42900')
 * error.message
 * // @log: 'Unauthorized.'
 * ```
 *
 * @param error - Error instance, plain error object, selector, or revert data.
 * @returns A decorated copy, leaving the original input unchanged.
 */
export declare function from<error extends from.Parameters>(error: error): from.ReturnType<error>;
export declare namespace from {
    /** Error instance, plain error object, or ABI-encoded selector or revert data. */
    type Parameters = Error | Hex | {
        /** ABI-encoded revert data. */
        data?: Hex | {
            data: Hex;
        } | undefined;
        /** Fallback message when revert data cannot be decoded. */
        message: string;
    };
    /** Original properties with decoded execution fields taking precedence. */
    type ReturnType<error extends Parameters = Parameters, result extends ExecutionError = ExecutionError> = result extends ExecutionError ? Omit<error extends Hex ? {
        data: error;
    } : error, keyof result> & result : never;
}
/**
 * Selects execution metadata for JSON serialization.
 *
 * Omits decoded arguments and original error properties, including the stack and cause.
 *
 * @example
 * ```ts
 * import { ExecutionError } from 'viem/tempo'
 *
 * const error = ExecutionError.from(new Error('execution reverted: failed'))
 * const rpc = ExecutionError.serialize(error)
 * // { errorName: 'unknown', message: 'failed' }
 * ```
 *
 * @param preimage - Decorated execution error.
 * @returns Execution error without decoded arguments.
 */
export declare function serialize(preimage: ExecutionError): Rpc;
export {};
//# sourceMappingURL=ExecutionError.d.ts.map