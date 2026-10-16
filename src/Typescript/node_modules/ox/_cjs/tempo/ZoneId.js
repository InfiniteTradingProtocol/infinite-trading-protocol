"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedSourceIdError = exports.chainIdBase = void 0;
exports.fromChainId = fromChainId;
exports.toChainId = toChainId;
const Errors = require("../core/Errors.js");
const chainIdConfig = {
    4217: {
        base: 421_700_000,
        range: 1_002_610_000,
    },
    42431: {
        base: 1_424_310_000,
        range: 723_173_648,
    },
};
const defaultSourceId = 4_217;
exports.chainIdBase = chainIdConfig[defaultSourceId].base;
function fromChainId(chainId, sourceId = defaultSourceId) {
    return chainId - getChainIdConfig(sourceId).base;
}
function toChainId(zoneId, sourceId = defaultSourceId) {
    const { base, range } = getChainIdConfig(sourceId);
    return base + (zoneId % range);
}
class UnsupportedSourceIdError extends Errors.BaseError {
    constructor({ sourceId }) {
        super(`Source chain ID "${sourceId}" is not supported.`, {
            metaMessages: ['Supported source chain IDs: 4217, 42431.'],
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'ZoneId.UnsupportedSourceIdError'
        });
    }
}
exports.UnsupportedSourceIdError = UnsupportedSourceIdError;
function getChainIdConfig(sourceId) {
    if (sourceId === 4_217 || sourceId === 42_431)
        return chainIdConfig[sourceId];
    throw new UnsupportedSourceIdError({ sourceId });
}
//# sourceMappingURL=ZoneId.js.map