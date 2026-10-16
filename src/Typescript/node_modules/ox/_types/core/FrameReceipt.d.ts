import type * as Errors from './Errors.js';
import * as Hex from './Hex.js';
import type * as Log from './Log.js';
/** Receipt for one frame. Frame logs contain only address, data, and topics. */
export type FrameReceipt<bigintType = bigint> = {
    /** Execution gas used before transaction-level refunds. */
    executionGasUsed: bigintType;
    /** Total execution and state gas used. */
    gasUsed: bigintType;
    /** Logs emitted by this frame. */
    logs: readonly Pick<Log.Log, 'address' | 'data' | 'topics'>[];
    /** Final state gas after refills and rollbacks. */
    stateGasUsed: bigintType;
    /** Frame execution result. */
    status: Status;
};
/** JSON-RPC receipt for one frame. */
export type Rpc = {
    /** Total execution and state gas used. */
    gasUsed: Hex.Hex;
    /** Execution gas used. */
    executionGasUsed: Hex.Hex;
    /** Logs emitted by this frame. */
    logs: readonly Pick<Log.Log, 'address' | 'data' | 'topics'>[];
    /** Final state gas used. */
    stateGasUsed: Hex.Hex;
    /** Zero for failure, one for success, or two for a skipped frame. */
    status: RpcStatus;
};
/** Frame execution status. */
export type Status = 'reverted' | 'skipped' | 'success';
/** Hex JSON-RPC frame execution status. */
export type RpcStatus = '0x0' | '0x1' | '0x2';
/** RPC status to status mapping. */
export declare const fromRpcStatus: {
    readonly '0x0': "reverted";
    readonly '0x1': "success";
    readonly '0x2': "skipped";
};
/** Status to RPC status mapping. */
export declare const toRpcStatus: {
    readonly reverted: "0x0";
    readonly skipped: "0x2";
    readonly success: "0x1";
};
/**
 * Converts an RPC frame receipt to a {@link ox#FrameReceipt.FrameReceipt}.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { FrameReceipt } from 'ox'
 *
 * const receipt = FrameReceipt.fromRpc({
 *   executionGasUsed: '0x5208',
 *   gasUsed: '0x5208',
 *   logs: [],
 *   stateGasUsed: '0x0',
 *   status: '0x1'
 * })
 * ```
 *
 * @param receipt - The RPC frame receipt.
 * @returns The frame receipt with bigint gas and a named status.
 */
export declare function fromRpc(receipt: Rpc): FrameReceipt;
export declare namespace fromRpc {
    type ErrorType = Hex.toBigInt.ErrorType | Errors.GlobalErrorType;
}
/**
 * Converts a {@link ox#FrameReceipt.FrameReceipt} to an RPC frame receipt.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { FrameReceipt } from 'ox'
 *
 * const receipt = FrameReceipt.fromRpc({
 *   executionGasUsed: '0x5208',
 *   gasUsed: '0x5208',
 *   logs: [],
 *   stateGasUsed: '0x0',
 *   status: '0x1'
 * })
 * const rpc = FrameReceipt.toRpc(receipt)
 * ```
 *
 * @param receipt - The frame receipt. Gas accepts hex, bigint, or number values.
 * @returns The RPC frame receipt with hex gas and a hex status.
 */
export declare function toRpc(receipt: toRpc.Input): Rpc;
export declare namespace toRpc {
    type Input = FrameReceipt<Hex.Hex | bigint | number>;
    type ErrorType = Hex.fromNumber.ErrorType | Errors.GlobalErrorType;
}
//# sourceMappingURL=FrameReceipt.d.ts.map