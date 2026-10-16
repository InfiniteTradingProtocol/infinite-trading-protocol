import { parseAccount } from '../../accounts/utils/parseAccount.js';
import { call } from '../../actions/public/call.js';
import { multicall } from '../../actions/public/multicall.js';
import { BaseError } from '../../errors/base.js';
import { TransactionReceiptRevertedError } from '../../errors/transaction.js';
import { encodeFunctionData } from '../../utils/abi/encodeFunctionData.js';
import { formatAbiItem } from '../../utils/abi/formatAbiItem.js';
import { toFunctionSelector } from '../../utils/hash/toFunctionSelector.js';
import { errorResolvers as accessKeyResolvers } from '../actions/accessKey.js';
import { errorResolvers as ammResolvers } from '../actions/amm.js';
import { errorResolvers as channelResolvers } from '../actions/channel.js';
import { errorResolvers as dexResolvers } from '../actions/dex.js';
import { errorResolvers as feeResolvers } from '../actions/fee.js';
import { errorResolvers as nonceResolvers } from '../actions/nonce.js';
import { errorResolvers as policyResolvers } from '../actions/policy.js';
import { errorResolvers as tokenResolvers } from '../actions/token.js';
import * as ExecutionError from '../ExecutionError.js';
import { TempoExecutionError } from '../errors.js';
/** Node messages that carry no revert data, mapped to the error they describe. */
const messages = [
    [/Access key expired: expiry \d+ <= min allowed \d+/, 'ExpiryInPast()'],
];
export async function toExecutionError(cause, options) {
    if (!(cause instanceof BaseError))
        return cause;
    const { client, parameters } = options;
    const source = (await replay(cause, client, parameters)) ?? cause;
    const details = source.details ?? '';
    let error = ExecutionError.from(source);
    if (error.errorName === 'unknown') {
        const signature = messages.find(([pattern]) => pattern.test(details))?.[1];
        if (!signature)
            return cause;
        error = ExecutionError.from(toFunctionSelector(signature));
    }
    if (error.errorName === 'unknown')
        return cause;
    const signature = formatAbiItem(error.abiItem);
    // Solidity `Error(string)` and `Panic(uint256)` are not Tempo errors.
    if (!(signature in ExecutionError.messages))
        return cause;
    const hints = [
        ...(options.hints?.[error.errorName] ?? []),
        ...(ExecutionError.hints[signature] ?? []),
    ];
    const base = { cause, error, hints };
    const account_ = parameters.account ?? client.account;
    const account = account_ ? parseAccount(account_) : undefined;
    const context = {
        base,
        call: getCall(parameters),
        client,
        details,
        parameters,
        read: (contracts) => multicall(client, {
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
        accessKeyResolvers,
        ammResolvers,
        channelResolvers,
        dexResolvers,
        feeResolvers,
        nonceResolvers,
        policyResolvers,
        tokenResolvers,
    ]) {
        const result = await resolvers[signature]?.(context);
        if (result)
            return result;
    }
    return new TempoExecutionError(base);
}
/** Replays a call whose receipt reverted, to recover its revert data. */
async function replay(cause, client, parameters) {
    const reverted = cause.walk((error) => error instanceof TransactionReceiptRevertedError);
    const to = parameters.to ?? parameters.address;
    const data = parameters.data ??
        (parameters.abi && parameters.functionName
            ? encodeFunctionData({
                abi: parameters.abi,
                args: parameters.args,
                functionName: parameters.functionName,
            })
            : undefined);
    if (!reverted || !to || !data)
        return undefined;
    // ponytail: replays on the parent block, so earlier transactions in the same block are not applied.
    return call(client, {
        account: parameters.account ?? client.account,
        blockNumber: reverted.receipt.blockNumber - 1n,
        data,
        to,
        value: parameters.value,
    }).then(() => undefined, (error) => (error instanceof BaseError ? error : undefined));
}
/** Whether an error carries revert data, which only execution reverts have. */
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