"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHash = isHash;
const isHex_js_1 = require("../data/isHex.js");
function isHash(hash) {
    return (0, isHex_js_1.isHex)(hash) && hash.length === 66;
}
//# sourceMappingURL=isHash.js.map