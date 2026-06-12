"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const signatures_1 = require("../signatures");
class EthSafeMessage {
    constructor(data) {
        this.signatures = new Map();
        this.data = data;
    }
    getSignature(signer) {
        return this.signatures.get(signer.toLowerCase());
    }
    addSignature(signature) {
        this.signatures.set(signature.signer.toLowerCase(), signature);
    }
    encodedSignatures() {
        return (0, signatures_1.buildSignatureBytes)(Array.from(this.signatures.values()));
    }
}
exports.default = EthSafeMessage;
//# sourceMappingURL=SafeMessage.js.map