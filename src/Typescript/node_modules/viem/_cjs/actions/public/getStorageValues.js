"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageValues = getStorageValues;
const formatBlockParameter_js_1 = require("../../utils/block/formatBlockParameter.js");
async function getStorageValues(client, { blockHash, blockNumber, blockTag = 'latest', requireCanonical, requests, }) {
    const block = (0, formatBlockParameter_js_1.formatBlockParameter)({
        blockHash,
        blockNumber,
        blockTag,
        requireCanonical,
    });
    return client.request({
        method: 'eth_getStorageValues',
        params: [requests, block],
    });
}
//# sourceMappingURL=getStorageValues.js.map