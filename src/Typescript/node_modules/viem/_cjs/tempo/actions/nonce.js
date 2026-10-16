"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResolvers = exports.NonceInvalidExpiryError = exports.NonceReplayError = void 0;
exports.getNonce = getNonce;
exports.watchNonceIncremented = watchNonceIncremented;
const readContract_js_1 = require("../../actions/public/readContract.js");
const watchContractEvent_js_1 = require("../../actions/public/watchContractEvent.js");
const Abis = require("../Abis.js");
const Addresses = require("../Addresses.js");
const errors_js_1 = require("../errors.js");
const errors_js_2 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
async function getNonce(client, parameters) {
    const { account, nonceKey, ...rest } = parameters;
    return (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...getNonce.call({ account, nonceKey }),
    });
}
(function (getNonce) {
    function call(args) {
        const { account, nonceKey } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.nonceManager,
            abi: Abis.nonce,
            args: [account, nonceKey],
            functionName: 'getNonce',
        });
    }
    getNonce.call = call;
})(getNonce || (exports.getNonce = getNonce = {}));
function watchNonceIncremented(client, parameters) {
    const { onNonceIncremented, ...rest } = parameters;
    return (0, watchContractEvent_js_1.watchContractEvent)(client, {
        ...rest,
        address: Addresses.nonceManager,
        abi: Abis.nonce,
        eventName: 'NonceIncremented',
        onLogs: (logs) => {
            for (const log of logs)
                onNonceIncremented(log.args, log);
        },
        strict: true,
    });
}
class NonceReplayError extends errors_js_1.TempoExecutionError {
    constructor(parameters) {
        super(parameters, {
            details: { 'valid before': (0, errors_js_2.formatTime)(parameters.validBefore) },
            name: 'NonceReplayError',
        });
        Object.defineProperty(this, "validBefore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.validBefore = parameters.validBefore;
    }
}
exports.NonceReplayError = NonceReplayError;
class NonceInvalidExpiryError extends errors_js_1.TempoExecutionError {
    constructor(parameters) {
        const now = Math.floor(Date.now() / 1000);
        super(parameters, {
            details: {
                'valid before': (0, errors_js_2.formatTime)(parameters.validBefore),
                now: (0, errors_js_2.formatTime)(now),
            },
            name: 'NonceInvalidExpiryError',
        });
        Object.defineProperty(this, "now", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validBefore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.now = now;
        this.validBefore = parameters.validBefore;
    }
}
exports.NonceInvalidExpiryError = NonceInvalidExpiryError;
exports.errorResolvers = {
    'ExpiringNonceReplay()': ({ base, parameters }) => new NonceReplayError({ ...base, validBefore: parameters.validBefore }),
    'InvalidExpiringNonceExpiry()': ({ base, parameters }) => new NonceInvalidExpiryError({
        ...base,
        validBefore: parameters.validBefore,
    }),
};
//# sourceMappingURL=nonce.js.map