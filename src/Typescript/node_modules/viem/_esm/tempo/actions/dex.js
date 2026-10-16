import * as Hash from 'ox/Hash';
import * as Hex from 'ox/Hex';
import { parseAccount } from '../../accounts/utils/parseAccount.js';
import { readContract, } from '../../actions/public/readContract.js';
import { watchContractEvent, } from '../../actions/public/watchContractEvent.js';
import { writeContract, } from '../../actions/wallet/writeContract.js';
import { writeContractSync } from '../../actions/wallet/writeContractSync.js';
import { parseEventLogs } from '../../utils/abi/parseEventLogs.js';
import { isAddressEqual } from '../../utils/address/isAddressEqual.js';
import * as Abis from '../Abis.js';
import * as Addresses from '../Addresses.js';
import { TempoExecutionError } from '../errors.js';
import { withExecutionError, } from '../internal/errors.js';
import { defineCall } from '../internal/utils.js';
/**
 * Buys a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.buy(client, {
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 *   amountOut: parseUnits('100', 6),
 *   maxAmountIn: parseUnits('105', 6),
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function buy(client, parameters) {
    return buy.inner(writeContract, client, parameters);
}
(function (buy) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { tokenIn, tokenOut, amountOut, maxAmountIn, ...rest } = parameters;
        const call = buy.call({ tokenIn, tokenOut, amountOut, maxAmountIn });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    buy.inner = inner;
    /**
     * Defines a call to the `swapExactAmountOut` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, parseUnits, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.buy.call({
     *       tokenIn: '0x20c0...beef',
     *       tokenOut: '0x20c0...babe',
     *       amountOut: parseUnits('100', 6),
     *       maxAmountIn: parseUnits('105', 6),
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { tokenIn, tokenOut, amountOut, maxAmountIn } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'swapExactAmountOut',
            args: [tokenIn, tokenOut, amountOut, maxAmountIn],
        });
    }
    buy.call = call;
})(buy || (buy = {}));
/**
 * Buys a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.buySync(client, {
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 *   amountOut: parseUnits('100', 6),
 *   maxAmountIn: parseUnits('105', 6),
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt.
 */
export async function buySync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await buy.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
/**
 * Cancels an order from the orderbook.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.cancel(client, {
 *   orderId: 123n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function cancel(client, parameters) {
    return cancel.inner(writeContract, client, parameters);
}
(function (cancel) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { orderId, ...rest } = parameters;
        const call = cancel.call({ orderId });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    cancel.inner = inner;
    /**
     * Defines a call to the `cancel` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.cancel.call({
     *       orderId: 123n,
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { orderId } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'cancel',
            args: [orderId],
        });
    }
    cancel.call = call;
    /**
     * Extracts the `OrderCancelled` event from logs.
     *
     * @param logs - The logs.
     * @returns The `OrderCancelled` event.
     */
    function extractEvent(logs) {
        const [log] = parseEventLogs({
            abi: Abis.stablecoinDex,
            logs,
            eventName: 'OrderCancelled',
            strict: true,
        });
        if (!log)
            throw new Error('`OrderCancelled` event not found.');
        return log;
    }
    cancel.extractEvent = extractEvent;
})(cancel || (cancel = {}));
/**
 * Cancels an order from the orderbook.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.cancelSync(client, {
 *   orderId: 123n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function cancelSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await cancel.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = cancel.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
/**
 * Cancels a stale order from the orderbook.
 *
 * A stale order is one where the owner's balance or allowance has dropped
 * below the order amount.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.cancelStale(client, {
 *   orderId: 123n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function cancelStale(client, parameters) {
    return cancelStale.inner(writeContract, client, parameters);
}
(function (cancelStale) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { orderId, ...rest } = parameters;
        const call = cancelStale.call({ orderId });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    cancelStale.inner = inner;
    /**
     * Defines a call to the `cancelStaleOrder` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.cancelStale.call({
     *       orderId: 123n,
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { orderId } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'cancelStaleOrder',
            args: [orderId],
        });
    }
    cancelStale.call = call;
    /**
     * Extracts the `OrderCancelled` event from logs.
     *
     * @param logs - The logs.
     * @returns The `OrderCancelled` event.
     */
    function extractEvent(logs) {
        const [log] = parseEventLogs({
            abi: Abis.stablecoinDex,
            logs,
            eventName: 'OrderCancelled',
            strict: true,
        });
        if (!log)
            throw new Error('`OrderCancelled` event not found.');
        return log;
    }
    cancelStale.extractEvent = extractEvent;
})(cancelStale || (cancelStale = {}));
/**
 * Cancels a stale order from the orderbook and waits for confirmation.
 *
 * A stale order is one where the owner's balance or allowance has dropped
 * below the order amount.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.cancelStaleSync(client, {
 *   orderId: 123n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function cancelStaleSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await cancelStale.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = cancelStale.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
/**
 * Creates a new trading pair on the DEX.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.createPair(client, {
 *   base: '0x20c...11',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function createPair(client, parameters) {
    return createPair.inner(writeContract, client, parameters);
}
(function (createPair) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { base, ...rest } = parameters;
        const call = createPair.call({ base });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    createPair.inner = inner;
    /**
     * Defines a call to the `createPair` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.createPair.call({
     *       base: '0x20c0...beef',
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { base } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'createPair',
            args: [base],
        });
    }
    createPair.call = call;
    /**
     * Extracts the `PairCreated` event from logs.
     *
     * @param logs - The logs.
     * @returns The `PairCreated` event.
     */
    function extractEvent(logs) {
        const [log] = parseEventLogs({
            abi: Abis.stablecoinDex,
            logs,
            eventName: 'PairCreated',
            strict: true,
        });
        if (!log)
            throw new Error('`PairCreated` event not found.');
        return log;
    }
    createPair.extractEvent = extractEvent;
})(createPair || (createPair = {}));
/**
 * Creates a new trading pair on the DEX.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.createPairSync(client, {
 *   base: '0x20c...11',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function createPairSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await createPair.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = createPair.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
/**
 * Gets a user's token balance on the DEX.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const balance = await Actions.dex.getBalance(client, {
 *   account: '0x...',
 *   token: '0x20c...11',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The user's token balance on the DEX.
 */
export async function getBalance(client, parameters) {
    const { account: acc = client.account, token, ...rest } = parameters;
    const address = acc ? parseAccount(acc).address : undefined;
    if (!address)
        throw new Error('account is required.');
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getBalance.call({ account: address, token }),
    });
}
(function (getBalance) {
    /**
     * Defines a call to the `balanceOf` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { account, token } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [account, token],
            functionName: 'balanceOf',
        });
    }
    getBalance.call = call;
})(getBalance || (getBalance = {}));
/**
 * Gets the quote for buying a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const amountIn = await Actions.dex.getBuyQuote(client, {
 *   amountOut: parseUnits('100', 6),
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The amount of tokenIn needed to buy the specified amountOut.
 */
export async function getBuyQuote(client, parameters) {
    const { tokenIn, tokenOut, amountOut, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getBuyQuote.call({ tokenIn, tokenOut, amountOut }),
    });
}
(function (getBuyQuote) {
    /**
     * Defines a call to the `quoteSwapExactAmountOut` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { tokenIn, tokenOut, amountOut } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [tokenIn, tokenOut, amountOut],
            functionName: 'quoteSwapExactAmountOut',
        });
    }
    getBuyQuote.call = call;
})(getBuyQuote || (getBuyQuote = {}));
/**
 * Gets an order's details from the orderbook.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const order = await Actions.dex.getOrder(client, {
 *   orderId: 123n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The order details.
 */
export async function getOrder(client, parameters) {
    const { orderId, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getOrder.call({ orderId }),
    });
}
(function (getOrder) {
    /**
     * Defines a call to the `getOrder` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { orderId } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [orderId],
            functionName: 'getOrder',
        });
    }
    getOrder.call = call;
})(getOrder || (getOrder = {}));
/**
 * Gets orderbook information for a trading pair.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const book = await Actions.dex.getOrderbook(client, {
 *   base: '0x20c...11',
 *   quote: '0x20c...20',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The orderbook information.
 */
export async function getOrderbook(client, parameters) {
    const { base, quote, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getOrderbook.call({ base, quote }),
    });
}
(function (getOrderbook) {
    /**
     * Defines a call to the `books` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { base, quote } = args;
        const pairKey = getPairKey(base, quote);
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [pairKey],
            functionName: 'books',
        });
    }
    getOrderbook.call = call;
})(getOrderbook || (getOrderbook = {}));
/**
 * Gets the price level information at a specific tick.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions, Tick } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const level = await Actions.dex.getTickLevel(client, {
 *   base: '0x20c...11',
 *   tick: Tick.fromPrice('1.001'),
 *   isBid: true,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The price level information.
 */
export async function getTickLevel(client, parameters) {
    const { base, tick, isBid, ...rest } = parameters;
    const [head, tail, totalLiquidity] = await withExecutionError(readContract)(client, {
        ...rest,
        ...getTickLevel.call({ base, tick, isBid }),
    });
    return { head, tail, totalLiquidity };
}
(function (getTickLevel) {
    /**
     * Defines a call to the `getTickLevel` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { base, tick, isBid } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [base, tick, isBid],
            functionName: 'getTickLevel',
        });
    }
    getTickLevel.call = call;
})(getTickLevel || (getTickLevel = {}));
/**
 * Gets the quote for selling a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const amountOut = await Actions.dex.getSellQuote(client, {
 *   amountIn: parseUnits('100', 6),
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The amount of tokenOut received for selling the specified amountIn.
 */
export async function getSellQuote(client, parameters) {
    const { tokenIn, tokenOut, amountIn, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getSellQuote.call({ tokenIn, tokenOut, amountIn }),
    });
}
(function (getSellQuote) {
    /**
     * Defines a call to the `quoteSwapExactAmountIn` function.
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { tokenIn, tokenOut, amountIn } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            args: [tokenIn, tokenOut, amountIn],
            functionName: 'quoteSwapExactAmountIn',
        });
    }
    getSellQuote.call = call;
})(getSellQuote || (getSellQuote = {}));
/**
 * Places a limit order on the orderbook.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions, Tick } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.place(client, {
 *   amount: parseUnits('100', 6),
 *   tick: Tick.fromPrice('0.99'),
 *   token: '0x20c...11',
 *   type: 'buy',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function place(client, parameters) {
    return place.inner(writeContract, client, parameters);
}
(function (place) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { amount, token, type, tick, ...rest } = parameters;
        const call = place.call({ amount, token, type, tick });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    place.inner = inner;
    /**
     * Defines a call to the `place` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, parseUnits, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions, Tick } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.place.call({
     *       amount: parseUnits('100', 6),
     *       tick: Tick.fromPrice('0.99'),
     *       token: '0x20c0...beef',
     *       type: 'buy',
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { token, amount, type, tick } = args;
        const isBid = type === 'buy';
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'place',
            args: [token, amount, isBid, tick],
        });
    }
    place.call = call;
    /**
     * Extracts the `OrderPlaced` event from logs.
     *
     * @param logs - The logs.
     * @returns The `OrderPlaced` event.
     */
    function extractEvent(logs) {
        const [log] = parseEventLogs({
            abi: Abis.stablecoinDex,
            logs,
            eventName: 'OrderPlaced',
            strict: true,
        });
        if (!log)
            throw new Error('`OrderPlaced` event not found.');
        return log;
    }
    place.extractEvent = extractEvent;
})(place || (place = {}));
/**
 * Places a flip order that automatically flips when filled.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions, Tick } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.placeFlip(client, {
 *   amount: parseUnits('100', 6),
 *   flipTick: Tick.fromPrice('1.01'),
 *   tick: Tick.fromPrice('0.99'),
 *   token: '0x20c...11',
 *   type: 'buy',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function placeFlip(client, parameters) {
    return placeFlip.inner(writeContract, client, parameters);
}
(function (placeFlip) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { amount, flipTick, tick, token, type, ...rest } = parameters;
        const call = placeFlip.call({ amount, flipTick, tick, token, type });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    placeFlip.inner = inner;
    /**
     * Defines a call to the `placeFlip` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, parseUnits, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions, Tick } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.placeFlip.call({
     *       amount: parseUnits('100', 6),
     *       flipTick: Tick.fromPrice('1.01'),
     *       tick: Tick.fromPrice('0.99'),
     *       token: '0x20c0...beef',
     *       type: 'buy',
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { token, amount, type, tick, flipTick } = args;
        const isBid = type === 'buy';
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'placeFlip',
            args: [token, amount, isBid, tick, flipTick],
        });
    }
    placeFlip.call = call;
    /**
     * Extracts the `OrderPlaced` event (with `isFlipOrder: true`) from logs.
     *
     * @param logs - The logs.
     * @returns The `OrderPlaced` event for a flip order.
     */
    function extractEvent(logs) {
        const parsedLogs = parseEventLogs({
            abi: Abis.stablecoinDex,
            logs,
            eventName: 'OrderPlaced',
            strict: true,
        });
        const log = parsedLogs.find((l) => l.args.isFlipOrder);
        if (!log)
            throw new Error('`OrderPlaced` event (flip order) not found.');
        return log;
    }
    placeFlip.extractEvent = extractEvent;
})(placeFlip || (placeFlip = {}));
/**
 * Places a flip order that automatically flips when filled.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions, Tick } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.placeFlipSync(client, {
 *   amount: parseUnits('100', 6),
 *   flipTick: Tick.fromPrice('1.01'),
 *   tick: Tick.fromPrice('0.99'),
 *   token: '0x20c...11',
 *   type: 'buy',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function placeFlipSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await placeFlip.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = placeFlip.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
/**
 * Places a limit order on the orderbook.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions, Tick } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.placeSync(client, {
 *   amount: parseUnits('100', 6),
 *   tick: Tick.fromPrice('0.99'),
 *   token: '0x20c...11',
 *   type: 'buy',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function placeSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await place.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = place.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
/**
 * Sells a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.sell(client, {
 *   amountIn: parseUnits('100', 6),
 *   minAmountOut: parseUnits('95', 6),
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function sell(client, parameters) {
    return sell.inner(writeContract, client, parameters);
}
(function (sell) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { tokenIn, tokenOut, amountIn, minAmountOut, ...rest } = parameters;
        const call = sell.call({ tokenIn, tokenOut, amountIn, minAmountOut });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    sell.inner = inner;
    /**
     * Defines a call to the `swapExactAmountIn` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, parseUnits, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.sell.call({
     *       amountIn: parseUnits('100', 6),
     *       minAmountOut: parseUnits('95', 6),
     *       tokenIn: '0x20c0...beef',
     *       tokenOut: '0x20c0...babe',
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { tokenIn, tokenOut, amountIn, minAmountOut } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'swapExactAmountIn',
            args: [tokenIn, tokenOut, amountIn, minAmountOut],
        });
    }
    sell.call = call;
})(sell || (sell = {}));
/**
 * Sells a specific amount of tokens.
 *
 * @example
 * ```ts
 * import { createClient, http, parseUnits } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.sellSync(client, {
 *   amountIn: parseUnits('100', 6),
 *   minAmountOut: parseUnits('95', 6),
 *   tokenIn: '0x20c...11',
 *   tokenOut: '0x20c...20',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt.
 */
export async function sellSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await sell.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
/**
 * Watches for flip order placed events.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const unwatch = Actions.dex.watchFlipOrderPlaced(client, {
 *   onFlipOrderPlaced: (args, log) => {
 *     console.log('Flip order placed:', args)
 *   },
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns A function to unsubscribe from the event.
 */
export function watchFlipOrderPlaced(client, parameters) {
    const { onFlipOrderPlaced, maker, token, ...rest } = parameters;
    return watchContractEvent(client, {
        ...rest,
        address: Addresses.stablecoinDex,
        abi: Abis.stablecoinDex,
        eventName: 'OrderPlaced',
        args: {
            ...(maker !== undefined && { maker }),
            ...(token !== undefined && { token }),
        },
        onLogs: (logs) => {
            for (const log of logs) {
                if (log.args.isFlipOrder)
                    onFlipOrderPlaced(log.args, log);
            }
        },
        strict: true,
    });
}
/**
 * Watches for order cancelled events.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const unwatch = Actions.dex.watchOrderCancelled(client, {
 *   onOrderCancelled: (args, log) => {
 *     console.log('Order cancelled:', args)
 *   },
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns A function to unsubscribe from the event.
 */
export function watchOrderCancelled(client, parameters) {
    const { onOrderCancelled, orderId, ...rest } = parameters;
    return watchContractEvent(client, {
        ...rest,
        address: Addresses.stablecoinDex,
        abi: Abis.stablecoinDex,
        eventName: 'OrderCancelled',
        args: orderId !== undefined ? { orderId } : undefined,
        onLogs: (logs) => {
            for (const log of logs)
                onOrderCancelled(log.args, log);
        },
        strict: true,
    });
}
/**
 * Watches for order filled events.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const unwatch = Actions.dex.watchOrderFilled(client, {
 *   onOrderFilled: (args, log) => {
 *     console.log('Order filled:', args)
 *   },
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns A function to unsubscribe from the event.
 */
export function watchOrderFilled(client, parameters) {
    const { onOrderFilled, maker, taker, orderId, ...rest } = parameters;
    return watchContractEvent(client, {
        ...rest,
        address: Addresses.stablecoinDex,
        abi: Abis.stablecoinDex,
        eventName: 'OrderFilled',
        args: {
            ...(orderId !== undefined && { orderId }),
            ...(maker !== undefined && { maker }),
            ...(taker !== undefined && { taker }),
        },
        onLogs: (logs) => {
            for (const log of logs)
                onOrderFilled(log.args, log);
        },
        strict: true,
    });
}
/**
 * Watches for order placed events.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const unwatch = Actions.dex.watchOrderPlaced(client, {
 *   onOrderPlaced: (args, log) => {
 *     console.log('Order placed:', args)
 *   },
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns A function to unsubscribe from the event.
 */
export function watchOrderPlaced(client, parameters) {
    const { onOrderPlaced, maker, token, ...rest } = parameters;
    return watchContractEvent(client, {
        ...rest,
        address: Addresses.stablecoinDex,
        abi: Abis.stablecoinDex,
        eventName: 'OrderPlaced',
        args: {
            ...(maker !== undefined && { maker }),
            ...(token !== undefined && { token }),
        },
        onLogs: (logs) => {
            for (const log of logs)
                onOrderPlaced(log.args, log);
        },
        strict: true,
    });
}
/**
 * Withdraws tokens from the DEX to the caller's wallet.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const hash = await Actions.dex.withdraw(client, {
 *   amount: 100n,
 *   token: '0x20c...11',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function withdraw(client, parameters) {
    return withdraw.inner(writeContract, client, parameters);
}
(function (withdraw) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { token, amount, ...rest } = parameters;
        const call = withdraw.call({ token, amount });
        return (await withExecutionError(action)(client, {
            ...rest,
            ...call,
        }));
    }
    withdraw.inner = inner;
    /**
     * Defines a call to the `withdraw` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, parseUnits, walletActions } from 'viem'
     * import { tempo } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
     *   transport: http(),
     * }).extend(walletActions)
     *
     * const { result } = await client.sendCalls({
     *   calls: [
     *     Actions.dex.withdraw.call({
     *       amount: parseUnits('100', 6),
     *       token: '0x20c0...beef',
     *     }),
     *   ]
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { token, amount } = args;
        return defineCall({
            address: Addresses.stablecoinDex,
            abi: Abis.stablecoinDex,
            functionName: 'withdraw',
            args: [token, amount],
        });
    }
    withdraw.call = call;
})(withdraw || (withdraw = {}));
/**
 * Withdraws tokens from the DEX to the caller's wallet.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempo.extend({ feeToken: '0x20c0000000000000000000000000000000000001' })
 *   transport: http(),
 * })
 *
 * const result = await Actions.dex.withdrawSync(client, {
 *   amount: 100n,
 *   token: '0x20c...11',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt.
 */
export async function withdrawSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await withdraw.inner(writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
function getPairKey(base, quote) {
    return Hash.keccak256(Hex.concat(base, quote));
}
/** Thrown when a sell would return less than `minAmountOut`. */
export class DexInsufficientOutputError extends TempoExecutionError {
    constructor(parameters) {
        const { amountIn, minAmountOut, quote, tokenIn, tokenOut } = parameters;
        super(parameters, {
            details: {
                'token in': tokenIn,
                'token out': tokenOut,
                'amount in': amountIn,
                'min amount out': minAmountOut,
                quote,
            },
            name: 'DexInsufficientOutputError',
        });
        /** Amount of `tokenIn` to sell. */
        Object.defineProperty(this, "amountIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Minimum amount of `tokenOut` to receive. */
        Object.defineProperty(this, "minAmountOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Current quote for `amountIn`, when available. */
        Object.defineProperty(this, "quote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to sell. */
        Object.defineProperty(this, "tokenIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to buy. */
        Object.defineProperty(this, "tokenOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amountIn = amountIn;
        this.minAmountOut = minAmountOut;
        this.quote = quote;
        this.tokenIn = tokenIn;
        this.tokenOut = tokenOut;
    }
}
/** Thrown when a buy would cost more than `maxAmountIn`. */
export class DexMaxInputExceededError extends TempoExecutionError {
    constructor(parameters) {
        const { amountOut, maxAmountIn, quote, tokenIn, tokenOut } = parameters;
        super(parameters, {
            details: {
                'token in': tokenIn,
                'token out': tokenOut,
                'amount out': amountOut,
                'max amount in': maxAmountIn,
                quote,
            },
            name: 'DexMaxInputExceededError',
        });
        /** Amount of `tokenOut` to buy. */
        Object.defineProperty(this, "amountOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Maximum amount of `tokenIn` to spend. */
        Object.defineProperty(this, "maxAmountIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Current cost of `amountOut`, when available. */
        Object.defineProperty(this, "quote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to spend. */
        Object.defineProperty(this, "tokenIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to buy. */
        Object.defineProperty(this, "tokenOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amountOut = amountOut;
        this.maxAmountIn = maxAmountIn;
        this.quote = quote;
        this.tokenIn = tokenIn;
        this.tokenOut = tokenOut;
    }
}
/** Thrown when the order book cannot fill a swap. */
export class DexInsufficientLiquidityError extends TempoExecutionError {
    constructor(parameters) {
        const { amountIn, amountOut, tokenIn, tokenOut } = parameters;
        super(parameters, {
            details: {
                'token in': tokenIn,
                'token out': tokenOut,
                'amount in': amountIn,
                'amount out': amountOut,
            },
            name: 'DexInsufficientLiquidityError',
        });
        /** Amount of `tokenIn` to sell, for sells. */
        Object.defineProperty(this, "amountIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Amount of `tokenOut` to buy, for buys. */
        Object.defineProperty(this, "amountOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to spend. */
        Object.defineProperty(this, "tokenIn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token to buy. */
        Object.defineProperty(this, "tokenOut", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amountIn = amountIn;
        this.amountOut = amountOut;
        this.tokenIn = tokenIn;
        this.tokenOut = tokenOut;
    }
}
/** Thrown when an order is smaller than the minimum order size. */
export class DexBelowMinimumOrderSizeError extends TempoExecutionError {
    constructor(parameters) {
        const [amount] = parameters.error.args;
        const { minimum } = parameters;
        super(parameters, {
            details: { amount, minimum },
            name: 'DexBelowMinimumOrderSizeError',
            shortMessage: `Order amount ${amount} is below the minimum${minimum === undefined ? '' : ` of ${minimum}`}.`,
        });
        /** Order amount. */
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Minimum order amount, when known. */
        Object.defineProperty(this, "minimum", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amount = amount;
        this.minimum = minimum;
    }
}
/** Thrown when an order's tick or flip tick is outside the allowed range. */
export class DexTickOutOfBoundsError extends TempoExecutionError {
    constructor(parameters) {
        const [tick] = parameters.error.args;
        const { maxTick, minTick } = parameters;
        super(parameters, {
            details: {
                tick,
                range: minTick === undefined || maxTick === undefined
                    ? undefined
                    : `${minTick} to ${maxTick}`,
            },
            name: 'DexTickOutOfBoundsError',
        });
        /** Highest allowed tick, when known. */
        Object.defineProperty(this, "maxTick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Lowest allowed tick, when known. */
        Object.defineProperty(this, "minTick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Tick that is out of range. */
        Object.defineProperty(this, "tick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxTick = maxTick;
        this.minTick = minTick;
        this.tick = tick;
    }
}
/** Thrown when a flip order's flip tick is on the wrong side of its tick or off the tick spacing. */
export class DexInvalidFlipTickError extends TempoExecutionError {
    constructor(parameters) {
        const { flipTick, side, tick, tickSpacing } = parameters;
        super(parameters, {
            details: {
                side,
                tick,
                'flip tick': flipTick,
                'tick spacing': tickSpacing,
            },
            name: 'DexInvalidFlipTickError',
            shortMessage: side === 'buy'
                ? 'The flip tick of a buy order must be at or above its tick, and a multiple of the tick spacing.'
                : side === 'sell'
                    ? 'The flip tick of a sell order must be at or below its tick, and a multiple of the tick spacing.'
                    : undefined,
        });
        /** Flip tick. */
        Object.defineProperty(this, "flipTick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Order side. */
        Object.defineProperty(this, "side", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Order tick. */
        Object.defineProperty(this, "tick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Tick spacing, when known. */
        Object.defineProperty(this, "tickSpacing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.flipTick = flipTick;
        this.side = side;
        this.tick = tick;
        this.tickSpacing = tickSpacing;
    }
}
/** Thrown when an order does not exist or is already filled. */
export class DexOrderNotFoundError extends TempoExecutionError {
    constructor(parameters) {
        super(parameters, {
            details: { order: parameters.orderId },
            name: 'DexOrderNotFoundError',
            shortMessage: `Order ${parameters.orderId} does not exist or is already filled.`,
        });
        /** Order ID. */
        Object.defineProperty(this, "orderId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.orderId = parameters.orderId;
    }
}
/** Thrown when cancelling a stale order whose maker is still authorized by the token's policy. */
export class DexOrderNotStaleError extends TempoExecutionError {
    constructor(parameters) {
        super(parameters, {
            details: { order: parameters.orderId },
            name: 'DexOrderNotStaleError',
            shortMessage: `Order ${parameters.orderId} is not stale: its maker is still authorized.`,
        });
        /** Order ID. */
        Object.defineProperty(this, "orderId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.orderId = parameters.orderId;
    }
}
/** Thrown when no trading pair exists for a token. */
export class DexPairNotFoundError extends TempoExecutionError {
    constructor(parameters) {
        super(parameters, {
            details: { tokens: parameters.tokens.join(', ') || undefined },
            name: 'DexPairNotFoundError',
        });
        /** Tokens of the call. */
        Object.defineProperty(this, "tokens", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.tokens = parameters.tokens;
    }
}
/** Thrown when withdrawing more than the account's exchange balance. */
export class DexInsufficientBalanceError extends TempoExecutionError {
    constructor(parameters) {
        const { amount, balance, token } = parameters;
        super(parameters, {
            details: { token, amount, balance },
            name: 'DexInsufficientBalanceError',
            shortMessage: `Insufficient exchange balance of token "${token}".`,
        });
        /** Amount to withdraw. */
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Exchange balance, when known. */
        Object.defineProperty(this, "balance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Token address. */
        Object.defineProperty(this, "token", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amount = amount;
        this.balance = balance;
        this.token = token;
    }
}
const exchange = {
    address: Addresses.stablecoinDex,
    abi: Abis.stablecoinDex,
};
/** The failed call, when it targets the exchange. */
function getExchangeCall(context) {
    const { call } = context;
    return call && isAddressEqual(call.address, Addresses.stablecoinDex)
        ? call
        : undefined;
}
/** @internal */
export const errorResolvers = {
    'BelowMinimumOrderSize(uint128)': async (context) => {
        if (!getExchangeCall(context) || !context.base.error.args)
            return undefined;
        const [minimum] = await context.read([
            { ...exchange, functionName: 'MIN_ORDER_AMOUNT' },
        ]);
        return new DexBelowMinimumOrderSizeError({
            ...context.base,
            minimum: minimum?.result,
        });
    },
    'InsufficientBalance()': async (context) => {
        const call = getExchangeCall(context);
        const token = call?.arg('token');
        if (call?.functionName !== 'withdraw' || !token || !context.signer)
            return undefined;
        const [balance] = await context.read([
            {
                ...exchange,
                functionName: 'balanceOf',
                args: [context.signer.address, token],
            },
        ]);
        return new DexInsufficientBalanceError({
            ...context.base,
            amount: call.arg('amount'),
            balance: balance?.result,
            token,
        });
    },
    'InsufficientLiquidity()': (context) => {
        const call = getExchangeCall(context);
        if (!call)
            return undefined;
        return new DexInsufficientLiquidityError({
            ...context.base,
            amountIn: call.arg('amountIn'),
            amountOut: call.arg('amountOut'),
            tokenIn: call.arg('tokenIn'),
            tokenOut: call.arg('tokenOut'),
        });
    },
    'InsufficientOutput()': async (context) => {
        const call = getExchangeCall(context);
        if (!call)
            return undefined;
        const tokenIn = call.arg('tokenIn');
        const tokenOut = call.arg('tokenOut');
        const amountIn = call.arg('amountIn');
        const [quote] = await context.read([
            {
                ...exchange,
                functionName: 'quoteSwapExactAmountIn',
                args: [tokenIn, tokenOut, amountIn],
            },
        ]);
        return new DexInsufficientOutputError({
            ...context.base,
            amountIn,
            minAmountOut: call.arg('minAmountOut'),
            quote: quote?.result,
            tokenIn,
            tokenOut,
        });
    },
    'InvalidFlipTick()': async (context) => {
        const call = getExchangeCall(context);
        if (!call)
            return undefined;
        const [tickSpacing] = await context.read([
            { ...exchange, functionName: 'TICK_SPACING' },
        ]);
        const isBid = call.arg('isBid');
        return new DexInvalidFlipTickError({
            ...context.base,
            flipTick: call.arg('flipTick'),
            side: isBid === undefined ? undefined : isBid ? 'buy' : 'sell',
            tick: call.arg('tick'),
            tickSpacing: tickSpacing?.result,
        });
    },
    'MaxInputExceeded()': async (context) => {
        const call = getExchangeCall(context);
        if (!call)
            return undefined;
        const tokenIn = call.arg('tokenIn');
        const tokenOut = call.arg('tokenOut');
        const amountOut = call.arg('amountOut');
        const [quote] = await context.read([
            {
                ...exchange,
                functionName: 'quoteSwapExactAmountOut',
                args: [tokenIn, tokenOut, amountOut],
            },
        ]);
        return new DexMaxInputExceededError({
            ...context.base,
            amountOut,
            maxAmountIn: call.arg('maxAmountIn'),
            quote: quote?.result,
            tokenIn,
            tokenOut,
        });
    },
    'OrderDoesNotExist()': (context) => {
        const orderId = getExchangeCall(context)?.arg('orderId');
        if (orderId === undefined)
            return undefined;
        return new DexOrderNotFoundError({ ...context.base, orderId });
    },
    'OrderNotStale()': (context) => {
        const orderId = getExchangeCall(context)?.arg('orderId');
        if (orderId === undefined)
            return undefined;
        return new DexOrderNotStaleError({ ...context.base, orderId });
    },
    'PairDoesNotExist()': (context) => {
        const call = getExchangeCall(context);
        if (!call)
            return undefined;
        const tokens = ['token', 'tokenIn', 'tokenOut', 'base'].flatMap((name) => {
            const token = call.arg(name);
            return token ? [token] : [];
        });
        return new DexPairNotFoundError({ ...context.base, tokens });
    },
    'TickOutOfBounds(int16)': async (context) => {
        if (!getExchangeCall(context) || !context.base.error.args)
            return undefined;
        const [minTick, maxTick] = await context.read([
            { ...exchange, functionName: 'MIN_TICK' },
            { ...exchange, functionName: 'MAX_TICK' },
        ]);
        return new DexTickOutOfBoundsError({
            ...context.base,
            maxTick: maxTick?.result,
            minTick: minTick?.result,
        });
    },
};
//# sourceMappingURL=dex.js.map