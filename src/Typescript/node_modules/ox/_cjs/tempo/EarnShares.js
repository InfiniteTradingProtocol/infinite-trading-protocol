"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidSlippageError = exports.InvalidExpectedOutputError = exports.basisPointScale = void 0;
exports.toAmount = toAmount;
exports.toAmountUp = toAmountUp;
exports.toVenueAmount = toVenueAmount;
exports.feeShares = feeShares;
exports.minimumOutput = minimumOutput;
const Errors = require("../core/Errors.js");
exports.basisPointScale = 10_000;
function toAmount(anchor, venueShareAmount) {
    return (venueShareAmount * anchor.shareSupply) / anchor.engineShares;
}
function toAmountUp(anchor, venueShareAmount) {
    const { engineShares, shareSupply } = anchor;
    return (venueShareAmount * shareSupply + engineShares - 1n) / engineShares;
}
function toVenueAmount(anchor, shareAmount) {
    return (shareAmount * anchor.engineShares) / anchor.shareSupply;
}
function feeShares(options) {
    const { activeAssets, shareSupply, totalFeeAssets } = options;
    if (totalFeeAssets === 0n || totalFeeAssets >= activeAssets)
        return 0n;
    return (totalFeeAssets * shareSupply) / (activeAssets - totalFeeAssets);
}
function minimumOutput(expectedAmount, slippageBps) {
    if (expectedAmount <= 0n)
        throw new InvalidExpectedOutputError({ expectedAmount });
    if (!Number.isInteger(slippageBps) ||
        slippageBps < 0 ||
        slippageBps >= exports.basisPointScale)
        throw new InvalidSlippageError({ slippageBps });
    const scale = BigInt(exports.basisPointScale);
    const bounded = (expectedAmount * (scale - BigInt(slippageBps))) / scale;
    return bounded === 0n ? 1n : bounded;
}
class InvalidExpectedOutputError extends Errors.BaseError {
    constructor(options) {
        super(`Expected output \`${options.expectedAmount}\` must be greater than zero.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'EarnShares.InvalidExpectedOutputError'
        });
    }
}
exports.InvalidExpectedOutputError = InvalidExpectedOutputError;
class InvalidSlippageError extends Errors.BaseError {
    constructor(options) {
        super(`Slippage tolerance \`${options.slippageBps}\` is invalid.`, {
            metaMessages: [
                `Slippage must be a whole number from 0 through ${exports.basisPointScale - 1} basis points.`,
            ],
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'EarnShares.InvalidSlippageError'
        });
    }
}
exports.InvalidSlippageError = InvalidSlippageError;
//# sourceMappingURL=EarnShares.js.map