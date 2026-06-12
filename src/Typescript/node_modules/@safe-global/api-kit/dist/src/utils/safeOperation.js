"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAddSafeOperationProps = void 0;
const getAddSafeOperationProps = async (safeOperation) => {
    const userOperation = safeOperation.toUserOperation();
    userOperation.signature = safeOperation.encodedSignatures(); // Without validity dates
    return {
        entryPoint: safeOperation.data.entryPoint,
        moduleAddress: safeOperation.moduleAddress,
        safeAddress: safeOperation.data.safe,
        userOperation,
        options: {
            validAfter: safeOperation.data.validAfter,
            validUntil: safeOperation.data.validUntil
        }
    };
};
exports.getAddSafeOperationProps = getAddSafeOperationProps;
//# sourceMappingURL=safeOperation.js.map