"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUnits = parseUnits;
const Value = require("./Value.js");
function parseUnits(value, decimals) {
    return Value.from(value, decimals);
}
//# sourceMappingURL=parseUnits.js.map