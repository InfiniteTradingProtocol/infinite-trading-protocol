import { BaseError } from '../errors/base.js';
import { prettyPrint } from '../errors/transaction.js';
export class GetVaultEngineChangedError extends BaseError {
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
/** Thrown when a Zone gateway deposit event is not found before the timeout. */
export class WaitForPrivateDepositTimeoutError extends BaseError {
    constructor({ actionId, gateway }) {
        super(`Timed out while waiting for Zone deposit "${actionId}" at gateway "${gateway}".`, { name: 'WaitForPrivateDepositTimeoutError' });
    }
}
export class WaitForTempoBlockTimeoutError extends BaseError {
    constructor({ tempoBlockNumber }) {
        super(`Timed out while waiting for Tempo block "${tempoBlockNumber}" to be imported by the zone.`, { name: 'WaitForTempoBlockTimeoutError' });
    }
}
/** Thrown when a Zone gateway redeem event is not found before the timeout. */
export class WaitForPrivateRedeemTimeoutError extends BaseError {
    constructor({ actionId, gateway }) {
        super(`Timed out while waiting for Zone redemption "${actionId}" at gateway "${gateway}".`, { name: 'WaitForPrivateRedeemTimeoutError' });
    }
}
export class InvalidFeeTokenError extends BaseError {
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
export class FeeTokenNotTip20Error extends BaseError {
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
export class FeeTokenNotUsdError extends BaseError {
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
export class FeeTokenPausedError extends BaseError {
    constructor({ token }) {
        super(`Fee token "${token}" is paused.`, {
            docsPath: '/tempo/transactions',
            docsSlug: 'pay-fees-with-stablecoins',
            metaMessages: ['Paused TIP-20 tokens cannot be used as fee tokens.'],
            name: 'FeeTokenPausedError',
        });
    }
}
/** Thrown when a Tempo action fails with a decoded Tempo precompile error. */
export class TempoExecutionError extends BaseError {
    constructor({ cause, error, hints }, { details, docsPath, name = 'TempoExecutionError', shortMessage = error.message, } = {}) {
        // Keep the call or request summary from the original error.
        const summary = cause.metaMessages?.findIndex((message) => /^(Contract Call|Request Arguments):/.test(message));
        super(shortMessage, {
            cause,
            docsPath,
            metaMessages: [
                ...(details ? [prettyPrint(details), ' '] : []),
                ...(hints.length
                    ? ['How to fix:', ...hints.map((hint) => `- ${hint}`), ' ']
                    : []),
                ...(summary !== undefined && summary >= 0
                    ? cause.metaMessages.slice(summary)
                    : []),
            ],
            name,
        });
        /** ABI item of the error. */
        Object.defineProperty(this, "abiItem", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Decoded error arguments, when the revert data carried them. */
        Object.defineProperty(this, "args", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Revert data, or the error selector when only the name is known. */
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Error name from `Abis.coreErrors`. */
        Object.defineProperty(this, "errorName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Steps to resolve the error. */
        Object.defineProperty(this, "hints", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.abiItem = error.abiItem;
        // Subclasses narrow `decoded` to the error they are built for.
        this.args = error.args;
        this.data = error.data;
        this.errorName = error.errorName;
        this.hints = hints;
    }
}
//# sourceMappingURL=errors.js.map