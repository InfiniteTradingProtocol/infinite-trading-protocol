"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEther = formatEther;
const Value = require("./Value.js");
function formatEther(wei, unit = 'wei') {
    return Value.formatEther(wei, unit);
}
//# sourceMappingURL=formatEther.js.map