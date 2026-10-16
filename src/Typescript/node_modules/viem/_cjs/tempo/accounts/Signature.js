"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseApproval = parseApproval;
const tempo_1 = require("ox/tempo");
function parseApproval(signature) {
    const approval = tempo_1.SignatureEnvelope.from(signature);
    if (approval.type === 'configurable' || approval.type === 'keychain')
        throw new Error('Configurable account owners must use primitive signatures.');
    return approval;
}
//# sourceMappingURL=Signature.js.map