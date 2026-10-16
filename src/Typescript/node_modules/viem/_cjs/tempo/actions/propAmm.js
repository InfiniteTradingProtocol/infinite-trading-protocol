"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseToken = baseToken;
exports.quoteToken = quoteToken;
exports.paused = paused;
exports.takerAllowed = takerAllowed;
exports.recipientAllowed = recipientAllowed;
exports.resolveRecipient = resolveRecipient;
exports.getSwapQuote = getSwapQuote;
exports.swap = swap;
exports.swapSync = swapSync;
const Hex = require("ox/Hex");
const parseAccount_js_1 = require("../../accounts/utils/parseAccount.js");
const estimateGas_js_1 = require("../../actions/public/estimateGas.js");
const readContract_js_1 = require("../../actions/public/readContract.js");
const sendTransaction_js_1 = require("../../actions/wallet/sendTransaction.js");
const sendTransactionSync_js_1 = require("../../actions/wallet/sendTransactionSync.js");
const account_js_1 = require("../../errors/account.js");
const parseEventLogs_js_1 = require("../../utils/abi/parseEventLogs.js");
const isAddressEqual_js_1 = require("../../utils/address/isAddressEqual.js");
const pad_js_1 = require("../../utils/data/pad.js");
const Abis = require("../Abis.js");
const Expiry = require("../Expiry.js");
const errors_js_1 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
const simulateActions = require("./simulate.js");
const tokenActions = require("./token.js");
async function baseToken(client, parameters) {
    const { pool, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...baseToken.call({ pool }),
    });
}
(function (baseToken) {
    function call({ pool }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'baseToken',
        });
    }
    baseToken.call = call;
})(baseToken || (exports.baseToken = baseToken = {}));
async function quoteToken(client, parameters) {
    const { pool, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...quoteToken.call({ pool }),
    });
}
(function (quoteToken) {
    function call({ pool }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'quoteToken',
        });
    }
    quoteToken.call = call;
})(quoteToken || (exports.quoteToken = quoteToken = {}));
async function paused(client, parameters) {
    const { pool, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...paused.call({ pool }),
    });
}
(function (paused) {
    function call({ pool }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            functionName: 'paused',
        });
    }
    paused.call = call;
})(paused || (exports.paused = paused = {}));
async function takerAllowed(client, parameters) {
    const { pool, taker, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...takerAllowed.call({ pool, taker }),
    });
}
(function (takerAllowed) {
    function call({ pool, taker }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            args: [taker],
            functionName: 'takerAllowed',
        });
    }
    takerAllowed.call = call;
})(takerAllowed || (exports.takerAllowed = takerAllowed = {}));
async function recipientAllowed(client, parameters) {
    const { pool, recipient, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...recipientAllowed.call({ pool, recipient }),
    });
}
(function (recipientAllowed) {
    function call({ pool, recipient }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            args: [recipient],
            functionName: 'recipientAllowed',
        });
    }
    recipientAllowed.call = call;
})(recipientAllowed || (exports.recipientAllowed = recipientAllowed = {}));
async function resolveRecipient(client, parameters) {
    const { pool, recipient, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...resolveRecipient.call({ pool, recipient }),
    });
}
(function (resolveRecipient) {
    function call({ pool, recipient }) {
        return (0, utils_js_1.defineCall)({
            abi: Abis.directPropAmm,
            address: pool,
            args: [recipient],
            functionName: 'resolveRecipient',
        });
    }
    resolveRecipient.call = call;
})(resolveRecipient || (exports.resolveRecipient = resolveRecipient = {}));
async function getSwapQuote(client, parameters) {
    const account = parameters.account ?? client.account;
    const taker = parameters.taker ?? (account && (0, parseAccount_js_1.parseAccount)(account).address);
    if (!taker)
        throw new Error('A taker or client account is required to quote.');
    const recipient = parameters.recipient ?? (account && (0, parseAccount_js_1.parseAccount)(account).address);
    if (!recipient)
        throw new account_js_1.AccountNotFoundError();
    const baseToQuote = parameters.baseToQuote ?? true;
    const customerId = parameters.customerId ?? (0, pad_js_1.pad)(taker, { size: 32 });
    const [amount, price, updatedAt, creditAfter] = await (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
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
})(getSwapQuote || (exports.getSwapQuote = getSwapQuote = {}));
function quoteExactInputCall(parameters) {
    const { amountIn, baseToQuote, customerId, pool, recipient, taker } = parameters;
    return (0, utils_js_1.defineCall)({
        abi: Abis.directPropAmm,
        address: pool,
        args: [taker, recipient, customerId, baseToQuote, amountIn],
        functionName: 'quoteExactInputFor',
    });
}
function quoteExactOutputCall(parameters) {
    const { amountOut, baseToQuote, customerId, pool, recipient, taker } = parameters;
    return (0, utils_js_1.defineCall)({
        abi: Abis.directPropAmm,
        address: pool,
        args: [taker, recipient, customerId, baseToQuote, amountOut],
        functionName: 'quoteExactOutputFor',
    });
}
var exactInput;
(function (exactInput) {
    function call({ amountIn, baseToQuote, customerId, deadline, expectedOraclePrice, minAmountOut, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }) {
        return (0, utils_js_1.defineCall)({
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
var exactOutput;
(function (exactOutput) {
    function call({ amountOut, baseToQuote, customerId, deadline, expectedOraclePrice, maxAmountIn, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }) {
        return (0, utils_js_1.defineCall)({
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
async function swap(client, parameters) {
    return swap.inner(sendTransaction_js_1.sendTransaction, client, parameters);
}
(function (swap) {
    async function inner(action, client, parameters) {
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...parameters,
            calls: await getCalls(client, parameters),
        }));
    }
    swap.inner = inner;
    async function getCalls(client, parameters) {
        const account = parameters.account ?? client.account;
        const recipient = parameters.recipient ?? (account && (0, parseAccount_js_1.parseAccount)(account).address);
        if (!recipient)
            throw new account_js_1.AccountNotFoundError();
        const customerId = parameters.customerId ??
            (account && (0, pad_js_1.pad)((0, parseAccount_js_1.parseAccount)(account).address, { size: 32 }));
        if (!customerId)
            throw new account_js_1.AccountNotFoundError();
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
    async function estimateGas(client, parameters) {
        return (0, estimateGas_js_1.estimateGas)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            calls: await getCalls(client, parameters),
        });
    }
    swap.estimateGas = estimateGas;
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
    function extractEvent(logs, args) {
        const matching = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.directPropAmm,
            logs,
            eventName: 'TradeExecuted',
            strict: true,
        }).filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, args.pool) &&
            log.args.tradeId.toLowerCase() === args.tradeId.toLowerCase());
        if (matching.length !== 1)
            throw new Error(`Expected one TradeExecuted event for pool ${args.pool} and trade ${args.tradeId}; found ${matching.length}.`);
        return matching[0];
    }
    swap.extractEvent = extractEvent;
})(swap || (exports.swap = swap = {}));
async function swapSync(client, parameters) {
    const { tradeId = Hex.random(32), throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await swap.inner(sendTransactionSync_js_1.sendTransactionSync, client, {
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