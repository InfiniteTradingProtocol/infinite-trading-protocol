"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExecutionError = isExecutionError;
exports.formatError = formatError;
const ox_1 = require("ox");
const address_js_1 = require("../../../constants/address.js");
const formatUnits_js_1 = require("../../../utils/unit/formatUnits.js");
const ExecutionError = require("../../ExecutionError.js");
const feeToken_js_1 = require("./feeToken.js");
const simulate_js_1 = require("./simulate.js");
const Utils = require("./utils.js");
const virtualAddress_js_1 = require("./virtualAddress.js");
function isExecutionError(error) {
    if (!(error instanceof Error))
        return false;
    const seen = new Set();
    const pending = [error];
    while (pending.length) {
        const current = pending.pop();
        if (!current || typeof current !== 'object' || seen.has(current))
            continue;
        seen.add(current);
        const candidate = current;
        if (candidate.code === 3 ||
            candidate.name === 'UpstreamRevertError' ||
            candidate.name === 'ExecutionRevertedError' ||
            candidate.name === 'ContractFunctionRevertedError' ||
            [candidate.message, candidate.details].some((message) => typeof message === 'string' && /^execution reverted\b/i.test(message)))
            return true;
        pending.push(candidate.cause, candidate.error);
    }
    return false;
}
async function formatError(error, parameters, client, simulateStore) {
    const revert = ExecutionError.from(error);
    const stub = {
        from: parameters.from,
        to: parameters.to ?? null,
        gas: '0x0',
        nonce: '0x0',
        value: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
    };
    if (revert.errorName === 'InsufficientBalance' && revert.args?.length === 3) {
        const [available, required, token] = revert.args;
        const normalized = Utils.normalizeFillTransactionRequest(parameters);
        const optimisticCalls = normalized ? (0, virtualAddress_js_1.extractCalls)(normalized) : undefined;
        const [{ balanceDiffs, tokenMetadata }, virtualAddresses] = optimisticCalls
            ? await Promise.all([
                (0, simulate_js_1.simulateAndParseDiffs)(client, {
                    account: address_js_1.zeroAddress,
                    calls: optimisticCalls,
                    store: simulateStore,
                }),
                (0, virtualAddress_js_1.resolveVirtualAddresses)(client, { calls: optimisticCalls }).catch(() => undefined),
            ])
            : [{ balanceDiffs: undefined, tokenMetadata: undefined }, undefined];
        const senderDiffs = parameters.from && balanceDiffs
            ? { [parameters.from]: balanceDiffs[address_js_1.zeroAddress] ?? [] }
            : balanceDiffs;
        const metadata = await (0, feeToken_js_1.resolveTokenMetadata)(client, {
            token,
            tokenMetadata,
            store: simulateStore,
        }).catch(() => undefined);
        const deficit = required - available;
        return {
            tx: stub,
            capabilities: {
                balanceDiffs: senderDiffs,
                error: ExecutionError.serialize(revert),
                insufficientFunds: metadata
                    ? {
                        amount: ox_1.Hex.fromNumber(deficit),
                        decimals: metadata.decimals,
                        formatted: (0, formatUnits_js_1.formatUnits)(deficit, metadata.decimals),
                        token,
                        symbol: metadata.symbol,
                    }
                    : undefined,
                sponsored: false,
                ...(virtualAddresses ? { virtualAddresses } : {}),
            },
        };
    }
    const normalized = Utils.normalizeFillTransactionRequest(parameters);
    const virtualAddresses = normalized
        ? await (0, virtualAddress_js_1.resolveVirtualAddresses)(client, {
            calls: (0, virtualAddress_js_1.extractCalls)(normalized),
        }).catch(() => undefined)
        : undefined;
    return {
        tx: stub,
        capabilities: {
            error: ExecutionError.serialize(revert),
            sponsored: false,
            ...(virtualAddresses ? { virtualAddresses } : {}),
        },
    };
}
//# sourceMappingURL=error.js.map