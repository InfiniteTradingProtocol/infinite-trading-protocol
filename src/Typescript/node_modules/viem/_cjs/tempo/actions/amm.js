"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResolvers = exports.AmmInsufficientLiquidityError = void 0;
exports.getPool = getPool;
exports.getLiquidityBalance = getLiquidityBalance;
exports.rebalanceSwap = rebalanceSwap;
exports.rebalanceSwapSync = rebalanceSwapSync;
exports.mint = mint;
exports.mintSync = mintSync;
exports.burn = burn;
exports.burnSync = burnSync;
exports.watchRebalanceSwap = watchRebalanceSwap;
exports.watchMint = watchMint;
exports.watchBurn = watchBurn;
const tempo_1 = require("ox/tempo");
const multicall_js_1 = require("../../actions/public/multicall.js");
const readContract_js_1 = require("../../actions/public/readContract.js");
const watchContractEvent_js_1 = require("../../actions/public/watchContractEvent.js");
const writeContract_js_1 = require("../../actions/wallet/writeContract.js");
const writeContractSync_js_1 = require("../../actions/wallet/writeContractSync.js");
const parseEventLogs_js_1 = require("../../utils/abi/parseEventLogs.js");
const isAddressEqual_js_1 = require("../../utils/address/isAddressEqual.js");
const Abis = require("../Abis.js");
const Addresses = require("../Addresses.js");
const errors_js_1 = require("../errors.js");
const errors_js_2 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
async function getPool(client, parameters) {
    const { userToken, validatorToken, ...rest } = parameters;
    const [pool, totalSupply] = await (0, multicall_js_1.multicall)(client, {
        ...rest,
        contracts: getPool.calls({ userToken, validatorToken }),
        allowFailure: false,
        deployless: true,
    });
    return {
        reserveUserToken: pool.reserveUserToken,
        reserveValidatorToken: pool.reserveValidatorToken,
        totalSupply,
    };
}
(function (getPool) {
    function calls(args) {
        const { userToken, validatorToken } = args;
        return [
            (0, utils_js_1.defineCall)({
                address: Addresses.feeManager,
                abi: Abis.feeAmm,
                args: [tempo_1.TokenId.toAddress(userToken), tempo_1.TokenId.toAddress(validatorToken)],
                functionName: 'getPool',
            }),
            (0, utils_js_1.defineCall)({
                address: Addresses.feeManager,
                abi: Abis.feeAmm,
                args: [tempo_1.PoolId.from({ userToken, validatorToken })],
                functionName: 'totalSupply',
            }),
        ];
    }
    getPool.calls = calls;
})(getPool || (exports.getPool = getPool = {}));
async function getLiquidityBalance(client, parameters) {
    const { address, poolId, userToken, validatorToken, ...rest } = parameters;
    return (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...getLiquidityBalance.call({
            address,
            poolId,
            userToken,
            validatorToken,
        }),
    });
}
(function (getLiquidityBalance) {
    function call(args) {
        const { address } = args;
        const poolId = (() => {
            if ('poolId' in args && args.poolId)
                return args.poolId;
            if ('userToken' in args && 'validatorToken' in args)
                return tempo_1.PoolId.from({
                    userToken: args.userToken,
                    validatorToken: args.validatorToken,
                });
            throw new Error('`poolId`, or `userToken` and `validatorToken` must be provided.');
        })();
        return (0, utils_js_1.defineCall)({
            address: Addresses.feeManager,
            abi: Abis.feeAmm,
            args: [poolId, address],
            functionName: 'liquidityBalances',
        });
    }
    getLiquidityBalance.call = call;
})(getLiquidityBalance || (exports.getLiquidityBalance = getLiquidityBalance = {}));
async function rebalanceSwap(client, parameters) {
    return rebalanceSwap.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (rebalanceSwap) {
    async function inner(action, client, parameters) {
        const { userToken, validatorToken, amountOut, to, ...rest } = parameters;
        const call = rebalanceSwap.call({
            userToken,
            validatorToken,
            amountOut,
            to,
        });
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...rest,
            ...call,
        }));
    }
    rebalanceSwap.inner = inner;
    function call(args) {
        const { userToken, validatorToken, amountOut, to } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.feeManager,
            abi: Abis.feeAmm,
            functionName: 'rebalanceSwap',
            args: [
                tempo_1.TokenId.toAddress(userToken),
                tempo_1.TokenId.toAddress(validatorToken),
                amountOut,
                to,
            ],
        });
    }
    rebalanceSwap.call = call;
    function extractEvent(logs) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.feeAmm,
            logs,
            eventName: 'RebalanceSwap',
            strict: true,
        });
        if (!log)
            throw new Error('`RebalanceSwap` event not found.');
        return log;
    }
    rebalanceSwap.extractEvent = extractEvent;
})(rebalanceSwap || (exports.rebalanceSwap = rebalanceSwap = {}));
async function rebalanceSwapSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await rebalanceSwap.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = rebalanceSwap.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
async function mint(client, parameters) {
    return mint.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (mint) {
    async function inner(action, client, parameters) {
        const { to, userTokenAddress, validatorTokenAddress, validatorTokenAmount, ...rest } = parameters;
        const call = mint.call({
            to,
            userTokenAddress,
            validatorTokenAddress,
            validatorTokenAmount,
        });
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...rest,
            ...call,
        }));
    }
    mint.inner = inner;
    function call(args) {
        const { to, userTokenAddress, validatorTokenAddress, validatorTokenAmount, } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.feeManager,
            abi: Abis.feeAmm,
            functionName: 'mint',
            args: [
                tempo_1.TokenId.toAddress(userTokenAddress),
                tempo_1.TokenId.toAddress(validatorTokenAddress),
                validatorTokenAmount,
                to,
            ],
        });
    }
    mint.call = call;
    function extractEvent(logs) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.feeAmm,
            logs,
            eventName: 'Mint',
            strict: true,
        });
        if (!log)
            throw new Error('`Mint` event not found.');
        return log;
    }
    mint.extractEvent = extractEvent;
})(mint || (exports.mint = mint = {}));
async function mintSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await mint.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = mint.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
async function burn(client, parameters) {
    return burn.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (burn) {
    async function inner(action, client, parameters) {
        const { liquidity, to, userToken, validatorToken, ...rest } = parameters;
        const call = burn.call({ liquidity, to, userToken, validatorToken });
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...rest,
            ...call,
        }));
    }
    burn.inner = inner;
    function call(args) {
        const { liquidity, to, userToken, validatorToken } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.feeManager,
            abi: Abis.feeAmm,
            functionName: 'burn',
            args: [
                tempo_1.TokenId.toAddress(userToken),
                tempo_1.TokenId.toAddress(validatorToken),
                liquidity,
                to,
            ],
        });
    }
    burn.call = call;
    function extractEvent(logs) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.feeAmm,
            logs,
            eventName: 'Burn',
            strict: true,
        });
        if (!log)
            throw new Error('`Burn` event not found.');
        return log;
    }
    burn.extractEvent = extractEvent;
})(burn || (exports.burn = burn = {}));
async function burnSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await burn.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = burn.extractEvent(receipt.logs);
    return {
        ...args,
        receipt,
    };
}
function watchRebalanceSwap(client, parameters) {
    const { onRebalanceSwap, userToken, validatorToken, ...rest } = parameters;
    return (0, watchContractEvent_js_1.watchContractEvent)(client, {
        ...rest,
        address: Addresses.feeManager,
        abi: Abis.feeAmm,
        eventName: 'RebalanceSwap',
        args: userToken !== undefined && validatorToken !== undefined
            ? {
                userToken: tempo_1.TokenId.toAddress(userToken),
                validatorToken: tempo_1.TokenId.toAddress(validatorToken),
            }
            : undefined,
        onLogs: (logs) => {
            for (const log of logs)
                onRebalanceSwap(log.args, log);
        },
        strict: true,
    });
}
function watchMint(client, parameters) {
    const { onMint, to, userToken, validatorToken, ...rest } = parameters;
    return (0, watchContractEvent_js_1.watchContractEvent)(client, {
        ...rest,
        address: Addresses.feeManager,
        abi: Abis.feeAmm,
        eventName: 'Mint',
        args: {
            to,
            ...(userToken !== undefined && {
                userToken: tempo_1.TokenId.toAddress(userToken),
            }),
            ...(validatorToken !== undefined && {
                validatorToken: tempo_1.TokenId.toAddress(validatorToken),
            }),
        },
        onLogs: (logs) => {
            for (const log of logs)
                onMint(log.args, log);
        },
        strict: true,
    });
}
function watchBurn(client, parameters) {
    const { onBurn, userToken, validatorToken, ...rest } = parameters;
    return (0, watchContractEvent_js_1.watchContractEvent)(client, {
        ...rest,
        address: Addresses.feeManager,
        abi: Abis.feeAmm,
        eventName: 'Burn',
        args: userToken !== undefined && validatorToken !== undefined
            ? {
                userToken: tempo_1.TokenId.toAddress(userToken),
                validatorToken: tempo_1.TokenId.toAddress(validatorToken),
            }
            : undefined,
        onLogs: (logs) => {
            for (const log of logs)
                onBurn(log.args, log);
        },
        strict: true,
    });
}
class AmmInsufficientLiquidityError extends errors_js_1.TempoExecutionError {
    constructor(parameters) {
        const { amount, reserveUserToken, reserveValidatorToken, userToken, validatorToken, } = parameters;
        super(parameters, {
            details: {
                'user token': userToken,
                'validator token': validatorToken,
                amount,
                'user token reserve': reserveUserToken,
                'validator token reserve': reserveValidatorToken,
            },
            name: 'AmmInsufficientLiquidityError',
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "reserveUserToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "reserveValidatorToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatorToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.amount = amount;
        this.reserveUserToken = reserveUserToken;
        this.reserveValidatorToken = reserveValidatorToken;
        this.userToken = userToken;
        this.validatorToken = validatorToken;
    }
}
exports.AmmInsufficientLiquidityError = AmmInsufficientLiquidityError;
async function resolvePool(context) {
    const { call } = context;
    if (!call || !(0, isAddressEqual_js_1.isAddressEqual)(call.address, Addresses.feeManager))
        return undefined;
    const userToken = call.arg('userToken');
    const validatorToken = call.arg('validatorToken');
    if (!userToken || !validatorToken)
        return undefined;
    const [pool] = await context.read([
        {
            address: Addresses.feeManager,
            abi: Abis.feeAmm,
            functionName: 'getPool',
            args: [userToken, validatorToken],
        },
    ]);
    return new AmmInsufficientLiquidityError({
        ...context.base,
        amount: call.arg('amountOut') ??
            call.arg('amountValidatorToken') ??
            call.arg('liquidity'),
        reserveUserToken: pool?.result?.reserveUserToken,
        reserveValidatorToken: pool?.result?.reserveValidatorToken,
        userToken,
        validatorToken,
    });
}
exports.errorResolvers = {
    'InsufficientLiquidity()': resolvePool,
    'InsufficientReserves()': resolvePool,
};
//# sourceMappingURL=amm.js.map