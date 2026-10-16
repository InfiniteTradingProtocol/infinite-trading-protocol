"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
const Frame = require("./Frame.js");
function fromRpc(frame) {
    const { executionGas, stateGas, ...rest } = Frame.fromRpc({
        ...frame,
        data: frame.data ?? '0x',
        executionGas: frame.executionGas ?? '0x0',
        flags: frame.flags ?? '0x0',
        stateGas: frame.stateGas ?? '0x0',
        value: frame.value ?? '0x0',
    });
    return {
        ...rest,
        ...(frame.executionGas === undefined ? {} : { executionGas }),
        ...(frame.stateGas === undefined ? {} : { stateGas }),
    };
}
function toRpc(frame) {
    const { executionGas, stateGas, ...rest } = Frame.toRpc(frame);
    return {
        ...rest,
        ...(frame.executionGas === undefined ? {} : { executionGas }),
        ...(frame.stateGas === undefined ? {} : { stateGas }),
    };
}
//# sourceMappingURL=FrameRequest.js.map