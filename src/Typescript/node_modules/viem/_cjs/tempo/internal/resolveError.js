"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toExecutionError = toExecutionError;
const parseAccount_js_1 = require("../../accounts/utils/parseAccount.js");
const call_js_1 = require("../../actions/public/call.js");
const multicall_js_1 = require("../../actions/public/multicall.js");
const base_js_1 = require("../../errors/base.js");
const transaction_js_1 = require("../../errors/transaction.js");
const encodeFunctionData_js_1 = require("../../utils/abi/encodeFunctionData.js");
const formatAbiItem_js_1 = require("../../utils/abi/formatAbiItem.js");
const toFunctionSelector_js_1 = require("../../utils/hash/toFunctionSelector.js");
const accessKey_js_1 = require("../actions/accessKey.js");
const amm_js_1 = require("../actions/amm.js");
const channel_js_1 = require("../actions/channel.js");
const dex_js_1 = require("../actions/dex.js");
const fee_js_1 = require("../actions/fee.js");
const nonce_js_1 = require("../actions/nonce.js");
const policy_js_1 = require("../actions/policy.js");
const token_js_1 = require("../actions/token.js");
const ExecutionError = require("../ExecutionError.js");
const errors_js_1 = require("../errors.js");
const messages = [
    [/Access key expired: expiry \d+ <= min allowed \d+/, 'ExpiryInPast()'],
];
async function toExecutionError(cause, options) {
    if (!(cause instanceof base_js_1.BaseError))
        return cause;
    const { client, parameters } = options;
    const source = (await replay(cause, client, parameters)) ?? cause;
    const details = source.details ?? '';
    let error = ExecutionError.from(source);
    if (error.errorName === 'unknown') {
        const signature = messages.find(([pattern]) => pattern.test(details))?.[1];
        if (!signature)
            return cause;
        error = ExecutionError.from((0, toFunctionSelector_js_1.toFunctionSelector)(signature));
    }
    if (error.errorName === 'unknown')
        return cause;
    const signature = (0, formatAbiItem_js_1.formatAbiItem)(error.abiItem);
    if (!(signature in ExecutionError.messages))
        return cause;
    const hints = [
        ...(options.hints?.[error.errorName] ?? []),
        ...(ExecutionError.hints[signature] ?? []),
    ];
    const base = { cause, error, hints };
    const account_ = parameters.account ?? client.account;
    const account = account_ ? (0, parseAccount_js_1.parseAccount)(account_) : undefined;
    const context = {
        base,
        call: getCall(parameters),
        client,
        details,
        parameters,
        read: (contracts) => (0, multicall_js_1.multicall)(client, {
            allowFailure: true,
            contracts: contracts,
            deployless: true,
        }).catch(() => []),
        signer: account && {
            address: account.address,
            accessKey: account.source === 'accessKey' && 'accessKeyAddress' in account
                ? account.accessKeyAddress
                : undefined,
        },
        validation: !hasRevertData(source),
    };
    for (const resolvers of [
        accessKey_js_1.errorResolvers,
        amm_js_1.errorResolvers,
        channel_js_1.errorResolvers,
        dex_js_1.errorResolvers,
        fee_js_1.errorResolvers,
        nonce_js_1.errorResolvers,
        policy_js_1.errorResolvers,
        token_js_1.errorResolvers,
    ]) {
        const result = await resolvers[signature]?.(context);
        if (result)
            return result;
    }
    return new errors_js_1.TempoExecutionError(base);
}
async function replay(cause, client, parameters) {
    const reverted = cause.walk((error) => error instanceof transaction_js_1.TransactionReceiptRevertedError);
    const to = parameters.to ?? parameters.address;
    const data = parameters.data ??
        (parameters.abi && parameters.functionName
            ? (0, encodeFunctionData_js_1.encodeFunctionData)({
                abi: parameters.abi,
                args: parameters.args,
                functionName: parameters.functionName,
            })
            : undefined);
    if (!reverted || !to || !data)
        return undefined;
    return (0, call_js_1.call)(client, {
        account: parameters.account ?? client.account,
        blockNumber: reverted.receipt.blockNumber - 1n,
        data,
        to,
        value: parameters.value,
    }).then(() => undefined, (error) => (error instanceof base_js_1.BaseError ? error : undefined));
}
function hasRevertData(error) {
    return !!error.walk((error) => {
        const { data, raw } = error;
        const hex = typeof data === 'object' && data !== null
            ? data.data
            : (data ?? raw);
        return typeof hex === 'string' && hex.length >= 10;
    });
}
function getCall(parameters) {
    const { abi, address, args = [], functionName, } = parameters;
    if (!address || !functionName)
        return undefined;
    const item = abi?.find((item) => item.type === 'function' && item.name === functionName);
    const inputs = item?.type === 'function' ? item.inputs : [];
    return {
        address,
        args,
        functionName,
        arg: (name) => args[inputs.findIndex((input) => input.name === name)],
    };
}
//# sourceMappingURL=resolveError.js.map