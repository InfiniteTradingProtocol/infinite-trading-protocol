"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRpcStatus = exports.fromRpcStatus = void 0;
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
const Hex = require("./Hex.js");
const Quantity = require("./internal/quantity.js");
exports.fromRpcStatus = {
    '0x0': 'reverted',
    '0x1': 'success',
    '0x2': 'skipped',
};
exports.toRpcStatus = {
    reverted: '0x0',
    skipped: '0x2',
    success: '0x1',
};
function fromRpc(receipt) {
    return {
        executionGasUsed: Hex.toBigInt(receipt.executionGasUsed),
        gasUsed: Hex.toBigInt(receipt.gasUsed),
        logs: receipt.logs,
        stateGasUsed: Hex.toBigInt(receipt.stateGasUsed),
        status: exports.fromRpcStatus[receipt.status],
    };
}
function toRpc(receipt) {
    return {
        executionGasUsed: Quantity.fromNumberish(receipt.executionGasUsed),
        gasUsed: Quantity.fromNumberish(receipt.gasUsed),
        logs: receipt.logs,
        stateGasUsed: Quantity.fromNumberish(receipt.stateGasUsed),
        status: exports.toRpcStatus[receipt.status],
    };
}
//# sourceMappingURL=FrameReceipt.js.map