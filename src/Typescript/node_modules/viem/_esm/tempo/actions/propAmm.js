import * as Hex from 'ox/Hex';
import { parseAccount } from '../../accounts/utils/parseAccount.js';
import { estimateGas as core_estimateGas } from '../../actions/public/estimateGas.js';
import { readContract } from '../../actions/public/readContract.js';
import { sendTransaction, } from '../../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../../actions/wallet/sendTransactionSync.js';
import { AccountNotFoundError } from '../../errors/account.js';
import { parseEventLogs } from '../../utils/abi/parseEventLogs.js';
import { isAddressEqual } from '../../utils/address/isAddressEqual.js';
import { pad } from '../../utils/data/pad.js';
import * as Abis from '../Abis.js';
import * as Expiry from '../Expiry.js';
import { withExecutionError } from '../internal/errors.js';
import { defineCall, pickWriteParameters } from '../internal/utils.js';
import * as simulateActions from './simulate.js';
import * as tokenActions from './token.js';
/**
 * Reads the base token of a propAMM pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const token = await Actions.propAmm.baseToken(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Base token address.
 */
export async function baseToken(client, parameters) {
    const { pool, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...baseToken.call({ pool }),
    });
}
(function (baseToken) {
    /**
     * Defines the pool's `baseToken` call.
     */
    function call({ pool }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'baseToken',
        });
    }
    baseToken.call = call;
})(baseToken || (baseToken = {}));
/**
 * Reads the quote token of a propAMM pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const token = await Actions.propAmm.quoteToken(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Quote token address.
 */
export async function quoteToken(client, parameters) {
    const { pool, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...quoteToken.call({ pool }),
    });
}
(function (quoteToken) {
    /**
     * Defines the pool's `quoteToken` call.
     */
    function call({ pool }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'quoteToken',
        });
    }
    quoteToken.call = call;
})(quoteToken || (quoteToken = {}));
/**
 * Reads whether a propAMM pool is paused.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const isPaused = await Actions.propAmm.paused(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Whether swaps are paused.
 */
export async function paused(client, parameters) {
    const { pool, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...paused.call({ pool }),
    });
}
(function (paused) {
    /**
     * Defines the pool's `paused` call.
     */
    function call({ pool }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'paused',
        });
    }
    paused.call = call;
})(paused || (paused = {}));
/**
 * Reads whether an address may call swaps on a pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const allowed = await Actions.propAmm.takerAllowed(client, { pool: '0x...', taker: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, taker, and read options.
 * @returns Whether the taker is allowed.
 */
export async function takerAllowed(client, parameters) {
    const { pool, taker, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...takerAllowed.call({ pool, taker }),
    });
}
(function (takerAllowed) {
    /**
     * Defines the pool's `takerAllowed` call.
     */
    function call({ pool, taker }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            args: [taker],
            functionName: 'takerAllowed',
        });
    }
    takerAllowed.call = call;
})(takerAllowed || (takerAllowed = {}));
/**
 * Reads whether a resolved address may receive swap output.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const allowed = await Actions.propAmm.recipientAllowed(client, { pool: '0x...', recipient: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, resolved recipient, and read options.
 * @returns Whether the resolved recipient is allowed.
 */
export async function recipientAllowed(client, parameters) {
    const { pool, recipient, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...recipientAllowed.call({ pool, recipient }),
    });
}
(function (recipientAllowed) {
    /**
     * Defines the pool's `recipientAllowed` call.
     */
    function call({ pool, recipient }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            args: [recipient],
            functionName: 'recipientAllowed',
        });
    }
    recipientAllowed.call = call;
})(recipientAllowed || (recipientAllowed = {}));
/**
 * Resolves a Tempo recipient to the address checked by the pool's allowlist.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const resolved = await Actions.propAmm.resolveRecipient(client, { pool: '0x...', recipient: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, recipient, and read options.
 * @returns Resolved recipient address.
 */
export async function resolveRecipient(client, parameters) {
    const { pool, recipient, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...resolveRecipient.call({ pool, recipient }),
    });
}
(function (resolveRecipient) {
    /**
     * Defines the pool's `resolveRecipient` call.
     */
    function call({ pool, recipient }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            args: [recipient],
            functionName: 'resolveRecipient',
        });
    }
    resolveRecipient.call = call;
})(resolveRecipient || (resolveRecipient = {}));
export async function getSwapQuote(client, parameters) {
    const account = parameters.account ?? client.account;
    const taker = parameters.taker ?? (account && parseAccount(account).address);
    if (!taker)
        throw new Error('A taker or client account is required to quote.');
    const recipient = parameters.recipient ?? (account && parseAccount(account).address);
    if (!recipient)
        throw new AccountNotFoundError();
    const baseToQuote = parameters.baseToQuote ?? true;
    const customerId = parameters.customerId ?? pad(taker, { size: 32 });
    const [amount, price, updatedAt, creditAfter] = await withExecutionError(readContract)(client, {
        ...parameters,
        ...getSwapQuote.call({
            ...parameters,
            baseToQuote,
            customerId,
            recipient,
            taker,
        }),
    });
    const request = {
        baseToQuote,
        customerId,
        expectedOraclePrice: price,
        minimumOracleUpdatedAt: updatedAt,
        oraclePriceToleranceBps: 0n,
        pool: parameters.pool,
        recipient,
    };
    if (parameters.mode === 'exactInput')
        return {
            amountOut: amount,
            price,
            updatedAt,
            creditAfter,
            request: {
                ...request,
                amountIn: parameters.amountIn,
                minAmountOut: amount,
                mode: parameters.mode,
            },
        };
    return {
        amountIn: amount,
        price,
        updatedAt,
        creditAfter,
        request: {
            ...request,
            amountOut: parameters.amountOut,
            maxAmountIn: amount,
            mode: parameters.mode,
        },
    };
}
(function (getSwapQuote) {
    function call(parameters) {
        if (parameters.mode === 'exactInput')
            return quoteExactInputCall(parameters);
        return quoteExactOutputCall(parameters);
    }
    getSwapQuote.call = call;
})(getSwapQuote || (getSwapQuote = {}));
function quoteExactInputCall(parameters) {
    const { amountIn, baseToQuote, customerId, pool, recipient, taker } = parameters;
    return defineCall({
        abi: Abis.directPropAmm,
        address: pool,
        args: [taker, recipient, customerId, baseToQuote, amountIn],
        functionName: 'quoteExactInputFor',
    });
}
function quoteExactOutputCall(parameters) {
    const { amountOut, baseToQuote, customerId, pool, recipient, taker } = parameters;
    return defineCall({
        abi: Abis.directPropAmm,
        address: pool,
        args: [taker, recipient, customerId, baseToQuote, amountOut],
        functionName: 'quoteExactOutputFor',
    });
}
/**
 * Internal exact-input contract call.
 */
var exactInput;
(function (exactInput) {
    function call({ amountIn, baseToQuote, customerId, deadline, expectedOraclePrice, minAmountOut, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            args: [
                baseToQuote,
                amountIn,
                minAmountOut,
                recipient,
                customerId,
                tradeId,
                deadline,
                expectedOraclePrice,
                oraclePriceToleranceBps,
                minimumOracleUpdatedAt,
            ],
            functionName: 'swapExactInput',
        });
    }
    exactInput.call = call;
})(exactInput || (exactInput = {}));
/**
 * Internal exact-output contract call.
 */
var exactOutput;
(function (exactOutput) {
    function call({ amountOut, baseToQuote, customerId, deadline, expectedOraclePrice, maxAmountIn, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }) {
        return defineCall({
            abi: Abis.directPropAmm,
            address: pool,
            args: [
                baseToQuote,
                amountOut,
                maxAmountIn,
                recipient,
                customerId,
                tradeId,
                deadline,
                expectedOraclePrice,
                oraclePriceToleranceBps,
                minimumOracleUpdatedAt,
            ],
            functionName: 'swapExactOutput',
        });
    }
    exactOutput.call = call;
})(exactOutput || (exactOutput = {}));
/**
 * Approves the input token and swaps through an allowed propAMM pool in one transaction.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http(), account: '0x...' })
 *
 * const hash = await Actions.propAmm.swap(client, {
 *   pool: '0x...',
 *   mode: 'exactInput',
 *   amountIn: 1_000_000n,
 *   minAmountOut: 1_000_000n,
 *   expectedOraclePrice: 1_000_000_000_000_000_000n,
 *   minimumOracleUpdatedAt: 1_799_999_000n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Swap and transaction options.
 * @returns Transaction hash.
 */
export async function swap(client, parameters) {
    return swap.inner(sendTransaction, client, parameters);
}
(function (swap) {
    /** @internal */
    async function inner(action, client, parameters) {
        return (await withExecutionError(action)(client, {
            ...parameters,
            calls: await getCalls(client, parameters),
        }));
    }
    swap.inner = inner;
    async function getCalls(client, parameters) {
        const account = parameters.account ?? client.account;
        const recipient = parameters.recipient ?? (account && parseAccount(account).address);
        if (!recipient)
            throw new AccountNotFoundError();
        const customerId = parameters.customerId ??
            (account && pad(parseAccount(account).address, { size: 32 }));
        if (!customerId)
            throw new AccountNotFoundError();
        const baseToQuote = parameters.baseToQuote ?? true;
        const tokenIn = await (baseToQuote
            ? baseToken(client, { pool: parameters.pool })
            : quoteToken(client, { pool: parameters.pool }));
        const amount = parameters.mode === 'exactInput'
            ? parameters.amountIn
            : parameters.maxAmountIn;
        return [
            tokenActions.approve.call(client, {
                amount,
                spender: parameters.pool,
                token: tokenIn,
            }),
            swap.call({
                ...parameters,
                baseToQuote,
                customerId,
                deadline: parameters.deadline ?? BigInt(Expiry.minutes(5)),
                tradeId: parameters.tradeId ?? Hex.random(32),
                recipient,
                oraclePriceToleranceBps: parameters.oraclePriceToleranceBps ?? 0n,
            }),
        ];
    }
    /**
     * Estimates gas for the approval and swap transaction.
     *
     * @param client - Client.
     * @param parameters - Swap and transaction options.
     * @returns The gas estimate.
     */
    async function estimateGas(client, parameters) {
        return core_estimateGas(client, {
            ...pickWriteParameters(parameters),
            calls: await getCalls(client, parameters),
        });
    }
    swap.estimateGas = estimateGas;
    /**
     * Simulates the approval and swap calls without submitting a transaction.
     *
     * @param client - Client.
     * @param parameters - Swap and simulation options.
     * @returns The approval and swap simulation results.
     */
    async function simulate(client, parameters) {
        const { blockNumber, blockTag, stateOverrides, traceTransfers, validation, } = parameters;
        return simulateActions.simulateCalls(client, {
            account: parameters.account ?? client.account,
            blockNumber,
            blockTag,
            calls: await getCalls(client, parameters),
            stateOverrides,
            traceTransfers,
            validation,
        });
    }
    swap.simulate = simulate;
    function call(parameters) {
        if (parameters.mode === 'exactInput')
            return exactInput.call(parameters);
        return exactOutput.call(parameters);
    }
    swap.call = call;
    /**
     * Extracts the unique matching trade event from a receipt.
     */
    function extractEvent(logs, args) {
        const matching = parseEventLogs({
            abi: Abis.directPropAmm,
            logs,
            eventName: 'TradeExecuted',
            strict: true,
        }).filter((log) => isAddressEqual(log.address, args.pool) &&
            log.args.tradeId.toLowerCase() === args.tradeId.toLowerCase());
        if (matching.length !== 1)
            throw new Error(`Expected one TradeExecuted event for pool ${args.pool} and trade ${args.tradeId}; found ${matching.length}.`);
        return matching[0];
    }
    swap.extractEvent = extractEvent;
})(swap || (swap = {}));
/**
 * Approves the input token, swaps, and returns the confirmed trade and receipt.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http(), account: '0x...' })
 *
 * const trade = await Actions.propAmm.swapSync(client, {
 *   pool: '0x...',
 *   mode: 'exactInput',
 *   amountIn: 1_000_000n,
 *   minAmountOut: 1_000_000n,
 *   expectedOraclePrice: 1_000_000_000_000_000_000n,
 *   minimumOracleUpdatedAt: 1_799_999_000n,
 * })
 * console.log(trade.amountOut, trade.receipt.transactionHash)
 * ```
 *
 * @param client - Client.
 * @param parameters - Swap and transaction options.
 * @returns Confirmed trade data and receipt.
 */
export async function swapSync(client, parameters) {
    const { tradeId = Hex.random(32), throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await swap.inner(sendTransactionSync, client, {
        ...rest,
        throwOnReceiptRevert,
        tradeId,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = swap.extractEvent(receipt.logs, {
        pool: parameters.pool,
        tradeId,
    });
    return { ...args, receipt };
}
//# sourceMappingURL=propAmm.js.map