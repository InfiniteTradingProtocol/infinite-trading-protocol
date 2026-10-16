"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEther = parseEther;
const Value = require("./Value.js");
function parseEther(ether, unit = 'wei') {
    return Value.fromEther(ether, unit);
}
//# sourceMappingURL=parseEther.js.map