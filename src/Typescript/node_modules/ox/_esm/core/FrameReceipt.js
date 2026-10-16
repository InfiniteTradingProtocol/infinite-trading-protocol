import * as Hex from './Hex.js';
import * as Quantity from './internal/quantity.js';
/** RPC status to status mapping. */
export const fromRpcStatus = {
    '0x0': 'reverted',
    '0x1': 'success',
    '0x2': 'skipped',
};
/** Status to RPC status mapping. */
export const toRpcStatus = {
    reverted: '0x0',
    skipped: '0x2',
    success: '0x1',
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
export function fromRpc(receipt) {
    return {
        executionGasUsed: Hex.toBigInt(receipt.executionGasUsed),
        gasUsed: Hex.toBigInt(receipt.gasUsed),
        logs: receipt.logs,
        stateGasUsed: Hex.toBigInt(receipt.stateGasUsed),
        status: fromRpcStatus[receipt.status],
    };
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
export function toRpc(receipt) {
    return {
        executionGasUsed: Quantity.fromNumberish(receipt.executionGasUsed),
        gasUsed: Quantity.fromNumberish(receipt.gasUsed),
        logs: receipt.logs,
        stateGasUsed: Quantity.fromNumberish(receipt.stateGasUsed),
        status: toRpcStatus[receipt.status],
    };
}
//# sourceMappingURL=FrameReceipt.js.map