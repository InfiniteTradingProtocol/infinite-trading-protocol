"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TempoExecutionError = exports.FeeTokenPausedError = exports.FeeTokenNotUsdError = exports.FeeTokenNotTip20Error = exports.InvalidFeeTokenError = exports.WaitForPrivateRedeemTimeoutError = exports.WaitForTempoBlockTimeoutError = exports.WaitForPrivateDepositTimeoutError = exports.GetVaultEngineChangedError = void 0;
const base_js_1 = require("../errors/base.js");
const transaction_js_1 = require("../errors/transaction.js");
class GetVaultEngineChangedError extends base_js_1.BaseError {
    constructor({ vault }) {
        super(`Engine of vault "${vault}" changed while reading.`, {
            metaMessages: [
                'An engine migration raced the snapshot; state from two different engines cannot be mixed.',
                'Retry the read.',
            ],
            name: 'GetVaultEngineChangedError',
        });
    }
}
exports.GetVaultEngineChangedError = GetVaultEngineChangedError;
class WaitForPrivateDepositTimeoutError extends base_js_1.BaseError {
    constructor({ actionId, gateway }) {
        super(`Timed out while waiting for Zone deposit "${actionId}" at gateway "${gateway}".`, { name: 'WaitForPrivateDepositTimeoutError' });
    }
}
exports.WaitForPrivateDepositTimeoutError = WaitForPrivateDepositTimeoutError;
class WaitForTempoBlockTimeoutError extends base_js_1.BaseError {
    constructor({ tempoBlockNumber }) {
        super(`Timed out while waiting for Tempo block "${tempoBlockNumber}" to be imported by the zone.`, { name: 'WaitForTempoBlockTimeoutError' });
    }
}
exports.WaitForTempoBlockTimeoutError = WaitForTempoBlockTimeoutError;
class WaitForPrivateRedeemTimeoutError extends base_js_1.BaseError {
    constructor({ actionId, gateway }) {
        super(`Timed out while waiting for Zone redemption "${actionId}" at gateway "${gateway}".`, { name: 'WaitForPrivateRedeemTimeoutError' });
    }
}
exports.WaitForPrivateRedeemTimeoutError = WaitForPrivateRedeemTimeoutError;
class InvalidFeeTokenError extends base_js_1.BaseError {
    constructor({ cause, token, }) {
        super(`Fee token "${token}" is invalid.`, {
            cause,
            docsPath: '/tempo/transactions',
            docsSlug: 'pay-fees-with-stablecoins',
            metaMessages: [
                'Fee tokens must be unpaused USD-denominated TIP-20 tokens.',
                'Use `client.fee.validateToken({ token })` before sending transactions or setting fee preferences.',
            ],
            name: 'InvalidFeeTokenError',
        });
    }
}
exports.InvalidFeeTokenError = InvalidFeeTokenError;
class FeeTokenNotTip20Error extends base_js_1.BaseError {
    constructor({ token }) {
        super(`Fee token "${token}" is not a TIP-20 token.`, {
            docsPath: '/tempo/transactions',
            docsSlug: 'pay-fees-with-stablecoins',
            metaMessages: [
                'Fee tokens must be TIP-20 token addresses or token IDs.',
                'TIP-20 token addresses use the `0x20c0...` address prefix.',
            ],
            name: 'FeeTokenNotTip20Error',
        });
    }
}
exports.FeeTokenNotTip20Error = FeeTokenNotTip20Error;
class FeeTokenNotUsdError extends base_js_1.BaseError {
    constructor({ currency, token, }) {
        super(`Fee token "${token}" is denominated in "${currency}", not "USD".`, {
            docsPath: '/tempo/transactions',
            docsSlug: 'pay-fees-with-stablecoins',
            metaMessages: [
                'Only USD-denominated TIP-20 tokens can be used as fee tokens.',
            ],
            name: 'FeeTokenNotUsdError',
        });
    }
}
exports.FeeTokenNotUsdError = FeeTokenNotUsdError;
class FeeTokenPausedError extends base_js_1.BaseError {
    constructor({ token }) {
        super(`Fee token "${token}" is paused.`, {
            docsPath: '/tempo/transactions',
            docsSlug: 'pay-fees-with-stablecoins',
            metaMessages: ['Paused TIP-20 tokens cannot be used as fee tokens.'],
            name: 'FeeTokenPausedError',
        });
    }
}
exports.FeeTokenPausedError = FeeTokenPausedError;
class TempoExecutionError extends base_js_1.BaseError {
    constructor({ cause, error, hints }, { details, docsPath, name = 'TempoExecutionError', shortMessage = error.message, } = {}) {
        const summary = cause.metaMessages?.findIndex((message) => /^(Contract Call|Request Arguments):/.test(message));
        super(shortMessage, {
            cause,
            docsPath,
            metaMessages: [
                ...(details ? [(0, transaction_js_1.prettyPrint)(details), ' '] : []),
                ...(hints.length
                    ? ['How to fix:', ...hints.map((hint) => `- ${hint}`), ' ']
                    : []),
                ...(summary !== undefined && summary >= 0
                    ? cause.metaMessages.slice(summary)
                    : []),
            ],
            name,
        });
        Object.defineProperty(this, "abiItem", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "args", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errorName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hints", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.abiItem = error.abiItem;
        this.args = error.args;
        this.data = error.data;
        this.errorName = error.errorName;
        this.hints = hints;
    }
}
exports.TempoExecutionError = TempoExecutionError;
//# sourceMappingURL=errors.js.map