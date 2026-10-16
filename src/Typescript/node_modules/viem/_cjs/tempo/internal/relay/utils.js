"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveChainId = resolveChainId;
exports.formatFillTransactionRequest = formatFillTransactionRequest;
exports.normalizeFillTransactionRequest = normalizeFillTransactionRequest;
exports.isSerializedTempoTransaction = isSerializedTempoTransaction;
exports.normalizeTempoTransaction = normalizeTempoTransaction;
exports.formatTempoTransaction = formatTempoTransaction;
exports.toRpcError = toRpcError;
exports.mergeCallsFromRequest = mergeCallsFromRequest;
const ox_1 = require("ox");
const tempo_1 = require("ox/tempo");
const rpc_js_1 = require("../../../errors/rpc.js");
function resolveChainId(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'bigint')
        return Number(value);
    if (typeof value === 'string') {
        if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value))
            return undefined;
        const n = Number(value);
        if (Number.isFinite(n))
            return n;
    }
    return undefined;
}
function formatFillTransactionRequest(client, value) {
    if (value.type === '0x76')
        return { ...value };
    const format = client.chain?.formatters?.transactionRequest?.format;
    if (!format)
        return value;
    return {
        ...format({ ...value }, 'fillTransaction'),
        ...(value.feeToken !== undefined ? { feeToken: value.feeToken } : {}),
    };
}
function normalizeFillTransactionRequest(tx) {
    const { to, data, value, ...rest } = tx;
    const keyAuthorization = normalizeKeyAuthorization(tx.keyAuthorization);
    const withKeyAuthorization = keyAuthorization ? { keyAuthorization } : {};
    if (Array.isArray(tx.calls))
        return {
            ...tx,
            ...withKeyAuthorization,
            calls: tx.calls.map((call) => {
                if (!call || typeof call !== 'object' || Array.isArray(call))
                    throw new ox_1.RpcResponse.InvalidParamsError({
                        message: 'Expected a transaction call object.',
                    });
                assertCallTarget(call.to);
                return { ...call, value: normalizeFillValue(call.value) };
            }),
        };
    assertCallTarget(to);
    const call = {
        ...(typeof to !== 'undefined' ? { to } : {}),
        ...(typeof data !== 'undefined' ? { data } : {}),
        ...(typeof value !== 'undefined'
            ? { value: normalizeFillValue(value) }
            : {}),
    };
    return { ...rest, ...withKeyAuthorization, calls: [call] };
}
function normalizeKeyAuthorization(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const ka = value;
    const signature = ka.signature;
    if (!signature || typeof signature !== 'object')
        return undefined;
    const isInternal = typeof signature.signature === 'object' && signature.signature !== null;
    return isInternal ? tempo_1.KeyAuthorization.toRpc(value) : value;
}
function assertCallTarget(to) {
    if (to === undefined || to === null)
        return;
    if (typeof to !== 'string' || !ox_1.Address.validate(to, { strict: false }))
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Invalid transaction call target.',
        });
}
function normalizeFillValue(value) {
    if (typeof value !== 'string' || !value.startsWith('0x'))
        return value;
    if (!/^0x[\da-f]*$/i.test(value))
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Invalid transaction value.',
        });
    return BigInt(value === '0x' ? '0x0' : value);
}
function isSerializedTempoTransaction(value) {
    if (typeof value !== 'string')
        return false;
    return (value.startsWith(tempo_1.TxEnvelopeTempo.serializedType) ||
        value.startsWith(tempo_1.TxEnvelopeTempo.feePayerMagic));
}
function normalizeTempoTransaction(value) {
    if (!value)
        throw new Error('Expected `tx` in eth_fillTransaction response.');
    return tempo_1.Transaction.fromRpc({
        type: '0x76',
        ...value,
    });
}
function formatTempoTransaction(transaction) {
    return {
        ...tempo_1.Transaction.toRpc(transaction),
        ...('nonceKey' in transaction && transaction.nonceKey !== undefined
            ? { nonceKey: ox_1.Hex.fromNumber(transaction.nonceKey) }
            : {}),
    };
}
function toRpcError(error) {
    let current = error;
    let deepest;
    const seen = new Set();
    while (current && typeof current === 'object' && !seen.has(current)) {
        seen.add(current);
        const candidate = current;
        if (!(current instanceof rpc_js_1.UnknownRpcError) &&
            typeof candidate.code === 'number' &&
            typeof candidate.message === 'string')
            deepest =
                current instanceof ox_1.RpcResponse.BaseError
                    ? current
                    : {
                        code: candidate.code,
                        message: candidate.message,
                        data: candidate.data,
                    };
        current = candidate.cause;
    }
    if (!deepest)
        return new ox_1.RpcResponse.InternalError({
            message: 'Internal error',
            data: { code: 'internal_error' },
        });
    if (deepest.code === -32603 &&
        /^Revm error: transaction expired(?:\.|: .+)?$/.test(deepest.message))
        return new ox_1.RpcResponse.TransactionRejectedError({
            message: 'Transaction expired.',
            data: { code: 'transaction_expired' },
        });
    return deepest instanceof ox_1.RpcResponse.BaseError
        ? deepest
        : new ox_1.RpcResponse.BaseError(deepest);
}
function mergeCallsFromRequest(resultTx, request) {
    const merged = { ...request, ...resultTx };
    const resultCalls = resultTx.calls;
    if (Array.isArray(resultCalls) && resultCalls.length > 0)
        return merged;
    const reqCalls = request.calls;
    if (Array.isArray(reqCalls)) {
        merged.calls = reqCalls;
        return merged;
    }
    const { to, data, value } = request;
    if (typeof to === 'undefined' &&
        typeof data === 'undefined' &&
        typeof value === 'undefined')
        return merged;
    merged.calls = [
        {
            ...(typeof to !== 'undefined' ? { to } : {}),
            ...(typeof data !== 'undefined' ? { data } : {}),
            ...(typeof value !== 'undefined' ? { value } : {}),
        },
    ];
    return merged;
}
//# sourceMappingURL=utils.js.map