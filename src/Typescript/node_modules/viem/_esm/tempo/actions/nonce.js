import { readContract } from '../../actions/public/readContract.js';
import { watchContractEvent } from '../../actions/public/watchContractEvent.js';
import * as Abis from '../Abis.js';
import * as Addresses from '../Addresses.js';
import { TempoExecutionError } from '../errors.js';
import { formatTime, withExecutionError, } from '../internal/errors.js';
import { defineCall } from '../internal/utils.js';
/**
 * Gets the nonce for an account and nonce key.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' }),
 *   transport: http(),
 * })
 *
 * const nonce = await Actions.nonce.getNonce(client, {
 *   account: '0x...',
 *   nonceKey: 1n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The nonce value.
 */
export async function getNonce(client, parameters) {
    const { account, nonceKey, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getNonce.call({ account, nonceKey }),
    });
}
(function (getNonce) {
    /**
     * Defines a call to the `getNonce` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`multicall`](https://viem.sh/docs/contract/multicall): execute multiple calls in parallel
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' }),
     *   transport: http(),
     * })
     *
     * const result = await client.multicall({
     *   contracts: [
     *     Actions.nonce.getNonce.call({ account: '0x...', nonceKey: 1n }),
     *     Actions.nonce.getNonce.call({ account: '0x...', nonceKey: 2n }),
     *   ],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { account, nonceKey } = args;
        return defineCall({
            address: Addresses.nonceManager,
            abi: Abis.nonce,
            args: [account, nonceKey],
            functionName: 'getNonce',
        });
    }
    getNonce.call = call;
})(getNonce || (getNonce = {}));
export function watchNonceIncremented(client, parameters) {
    const { onNonceIncremented, ...rest } = parameters;
    return watchContractEvent(client, {
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
/** Thrown when an expiring nonce transaction was already submitted. */
export class NonceReplayError extends TempoExecutionError {
    constructor(parameters) {
        super(parameters, {
            details: { 'valid before': formatTime(parameters.validBefore) },
            name: 'NonceReplayError',
        });
        /** Transaction expiry (Unix seconds), when known. */
        Object.defineProperty(this, "validBefore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.validBefore = parameters.validBefore;
    }
}
/** Thrown when an expiring nonce transaction's `validBefore` is in the past or too far ahead. */
export class NonceInvalidExpiryError extends TempoExecutionError {
    constructor(parameters) {
        const now = Math.floor(Date.now() / 1000);
        super(parameters, {
            details: {
                'valid before': formatTime(parameters.validBefore),
                now: formatTime(now),
            },
            name: 'NonceInvalidExpiryError',
        });
        /** Current time (Unix seconds) when the error was handled. */
        Object.defineProperty(this, "now", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Transaction expiry (Unix seconds), when known. */
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
/** @internal */
export const errorResolvers = {
    'ExpiringNonceReplay()': ({ base, parameters }) => new NonceReplayError({ ...base, validBefore: parameters.validBefore }),
    'InvalidExpiringNonceExpiry()': ({ base, parameters }) => new NonceInvalidExpiryError({
        ...base,
        validBefore: parameters.validBefore,
    }),
};
//# sourceMappingURL=nonce.js.map