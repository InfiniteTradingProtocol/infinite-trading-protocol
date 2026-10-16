"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.from = from;
const ox_1 = require("ox");
function from(options) {
    const { fallbackNonce, sender, transactionHash } = options;
    return ox_1.Hash.keccak256(ox_1.AbiParameters.encodePacked(['address', 'bytes32', 'uint64'], [sender, transactionHash, fallbackNonce]));
}
//# sourceMappingURL=WithdrawalSenderTag.js.map