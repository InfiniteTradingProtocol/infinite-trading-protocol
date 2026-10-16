"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGwei = parseGwei;
const Value = require("./Value.js");
function parseGwei(ether, unit = 'wei') {
    return Value.fromGwei(ether, unit);
}
//# sourceMappingURL=parseGwei.js.map