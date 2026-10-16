"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromNumberish = fromNumberish;
const Hex = require("../Hex.js");
function fromNumberish(value, options) {
    if (typeof value === 'string')
        return value;
    return Hex.fromNumber(value, options);
}
//# sourceMappingURL=quantity.js.map