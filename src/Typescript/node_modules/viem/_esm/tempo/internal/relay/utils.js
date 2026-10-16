import { Address, Hex, RpcResponse } from 'ox';
import { Transaction as core_Transaction, KeyAuthorization, TxEnvelopeTempo, } from 'ox/tempo';
import { UnknownRpcError } from '../../../errors/rpc.js';
export function resolveChainId(value) {
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
export function formatFillTransactionRequest(client, value) {
    if (value.type === '0x76')
        return { ...value };
    const format = client.chain?.formatters?.transactionRequest?.format;
    if (!format)
        return value;
    return {
        ...format({ ...value }, 'fillTransaction'),
        // Keep the selected token until the request leaves the plugin pipeline.
        ...(value.feeToken !== undefined ? { feeToken: value.feeToken } : {}),
    };
}
export function normalizeFillTransactionRequest(tx) {
    const { to, data, value, ...rest } = tx;
    const keyAuthorization = normalizeKeyAuthorization(tx.keyAuthorization);
    const withKeyAuthorization = keyAuthorization ? { keyAuthorization } : {};
    if (Array.isArray(tx.calls))
        return {
            ...tx,
            ...withKeyAuthorization,
            calls: tx.calls.map((call) => {
                if (!call || typeof call !== 'object' || Array.isArray(call))
                    throw new RpcResponse.InvalidParamsError({
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
/**
 * Forwards `keyAuthorization` to the chain in RPC shape. Pass-through
 * when already RPC; convert via `KeyAuthorization.toRpc` when internal.
 */
function normalizeKeyAuthorization(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const ka = value;
    const signature = ka.signature;
    if (!signature || typeof signature !== 'object')
        return undefined;
    const isInternal = typeof signature.signature === 'object' && signature.signature !== null;
    return isInternal ? KeyAuthorization.toRpc(value) : value;
}
function assertCallTarget(to) {
    if (to === undefined || to === null)
        return;
    if (typeof to !== 'string' || !Address.validate(to, { strict: false }))
        throw new RpcResponse.InvalidParamsError({
            message: 'Invalid transaction call target.',
        });
}
function normalizeFillValue(value) {
    if (typeof value !== 'string' || !value.startsWith('0x'))
        return value;
    if (!/^0x[\da-f]*$/i.test(value))
        throw new RpcResponse.InvalidParamsError({
            message: 'Invalid transaction value.',
        });
    return BigInt(value === '0x' ? '0x0' : value);
}
/** Returns whether a raw transaction uses a Tempo sender or fee-payer wire prefix. */
export function isSerializedTempoTransaction(value) {
    if (typeof value !== 'string')
        return false;
    // `0x78` is Tempo's fee-payer handoff magic, not a separate EIP-2718 type.
    return (value.startsWith(TxEnvelopeTempo.serializedType) ||
        value.startsWith(TxEnvelopeTempo.feePayerMagic));
}
export function normalizeTempoTransaction(value) {
    if (!value)
        throw new Error('Expected `tx` in eth_fillTransaction response.');
    return core_Transaction.fromRpc({
        type: '0x76',
        ...value,
    });
}
/** Preserves the nonce domain when serializing filled Tempo transactions. */
export function formatTempoTransaction(transaction) {
    return {
        ...core_Transaction.toRpc(transaction),
        ...('nonceKey' in transaction && transaction.nonceKey !== undefined
            ? { nonceKey: Hex.fromNumber(transaction.nonceKey) }
            : {}),
    };
}
/** Preserves upstream RPC errors and the relay's expired-transaction contract. */
export function toRpcError(error) {
    let current = error;
    let deepest;
    const seen = new Set();
    while (current && typeof current === 'object' && !seen.has(current)) {
        seen.add(current);
        const candidate = current;
        if (!(current instanceof UnknownRpcError) &&
            typeof candidate.code === 'number' &&
            typeof candidate.message === 'string')
            deepest =
                current instanceof RpcResponse.BaseError
                    ? current
                    : {
                        code: candidate.code,
                        message: candidate.message,
                        data: candidate.data,
                    };
        current = candidate.cause;
    }
    if (!deepest)
        return new RpcResponse.InternalError({
            message: 'Internal error',
            data: { code: 'internal_error' },
        });
    if (deepest.code === -32603 &&
        /^Revm error: transaction expired(?:\.|: .+)?$/.test(deepest.message))
        return new RpcResponse.TransactionRejectedError({
            message: 'Transaction expired.',
            data: { code: 'transaction_expired' },
        });
    return deepest instanceof RpcResponse.BaseError
        ? deepest
        : new RpcResponse.BaseError(deepest);
}
/** Preserves envelope inputs omitted by the node, including calls and chain ID. Filled fields take precedence; legacy calls are normalized separately. */
export function mergeCallsFromRequest(resultTx, request) {
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