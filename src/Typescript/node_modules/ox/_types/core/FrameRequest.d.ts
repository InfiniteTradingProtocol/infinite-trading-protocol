import * as Frame from './Frame.js';
import type { Compute, PartialBy } from './internal/types.js';
/** A frame request whose omitted gas limits are estimated by the node. */
export type FrameRequest<bigintType = bigint> = Frame.Frame<bigintType>;
/** JSON-RPC frame request. Only the execution mode is required. */
export type Rpc = Compute<PartialBy<Frame.Rpc, Exclude<keyof Frame.Rpc, 'mode'>>>;
/**
 * Converts an RPC frame request, preserving omitted gas limits for node estimation.
 *
 * @example
 * ```ts twoslash
 * import { FrameRequest } from 'ox'
 *
 * const frame = FrameRequest.fromRpc({ mode: '0x2', stateGas: '0x0' })
 * ```
 *
 * @param frame - The RPC frame request.
 * @returns The decoded request with omitted gas limits preserved.
 */
export declare function fromRpc(frame: Rpc): FrameRequest;
export declare namespace fromRpc {
    type ErrorType = Frame.fromRpc.ErrorType;
}
/**
 * Converts a frame request to RPC fields without filling omitted gas limits.
 *
 * Explicit zero limits remain zero. Omitted mode, flags, value, and data use frame defaults.
 *
 * @example
 * ```ts twoslash
 * import { FrameRequest } from 'ox'
 *
 * const frame = FrameRequest.toRpc({ mode: 'sender', stateGas: 0n })
 * ```
 *
 * @param frame - The frame request. Gas and value accept hex, bigint, or number values.
 * @returns The RPC request with omitted gas limits preserved.
 */
export declare function toRpc(frame: toRpc.Input): Rpc;
export declare namespace toRpc {
    type Input = Frame.toRpc.Input;
    type ErrorType = Frame.toRpc.ErrorType;
}
//# sourceMappingURL=FrameRequest.d.ts.map