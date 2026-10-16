"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.simulateAndParseDiffs = simulateAndParseDiffs;
exports.buildBalanceDiffs = buildBalanceDiffs;
const ox_1 = require("ox");
const address_js_1 = require("../../../constants/address.js");
const parseEventLogs_js_1 = require("../../../utils/abi/parseEventLogs.js");
const formatUnits_js_1 = require("../../../utils/unit/formatUnits.js");
const Abis = require("../../Abis.js");
const Actions = require("../../actions/index.js");
const error_js_1 = require("./error.js");
const feeToken_js_1 = require("./feeToken.js");
const Utils = require("./utils.js");
const virtualAddress_js_1 = require("./virtualAddress.js");
function create(options) {
    return {
        async handleRequest(context, next) {
            if (context.request.method !== 'eth_fillTransaction')
                return next();
            try {
                await next();
            }
            catch (error) {
                const parameters = context.request.params[0];
                if ((0, error_js_1.isExecutionError)(error) &&
                    parameters.capabilities
                        ?.errors === true)
                    return (0, error_js_1.formatError)(error, parameters, context.client, context.getStore(options.store));
                throw error;
            }
        },
        async afterFill(result, context) {
            const parameters = context.request.params[0];
            const store = context.getStore(options.store);
            const signal = context.options.signal;
            const transaction = Utils.normalizeTempoTransaction(result.tx);
            const feeToken = transaction.feeToken;
            const simulation = parameters.capabilities
                ?.balanceDiffs !== false
                ? await simulateAndParseDiffs(context.client, {
                    account: parameters.from,
                    calls: (0, virtualAddress_js_1.extractCalls)(transaction),
                    feeToken,
                    gas: transaction.gas,
                    maxFeePerGas: transaction.maxFeePerGas,
                    store,
                    signal,
                })
                : await computeFee(context.client, {
                    feeToken,
                    gas: transaction.gas,
                    maxFeePerGas: transaction.maxFeePerGas,
                    store,
                    signal,
                }).then((fee) => ({ balanceDiffs: undefined, fee }));
            return {
                capabilities: {
                    balanceDiffs: simulation.balanceDiffs,
                    fee: simulation.fee,
                },
            };
        },
    };
}
async function simulateAndParseDiffs(client, options) {
    const { account, calls, feeToken, gas, store, maxFeePerGas, signal } = options;
    signal?.throwIfAborted();
    try {
        const probe = feeToken &&
            !calls.some((call) => call.to?.toLowerCase() === feeToken.toLowerCase())
            ? [
                Actions.token.getBalance.call(client, {
                    account: account ?? address_js_1.zeroAddress,
                    token: feeToken,
                }),
            ]
            : [];
        const simulation = await Actions.simulate.simulateCalls(client, {
            account: account === address_js_1.zeroAddress ? undefined : account,
            calls: [...calls, ...probe],
            traceTransfers: true,
        });
        const results = simulation.results.slice(0, calls.length);
        const { tokenMetadata } = simulation;
        signal?.throwIfAborted();
        const logs = [];
        for (const result of results)
            if (result.logs)
                logs.push(...result.logs);
        const balanceDiffs = account
            ? await buildBalanceDiffs(client, {
                account,
                store,
                signal,
                logs,
                tokenMetadata: tokenMetadata,
            })
            : {};
        const fee = await computeFee(client, {
            feeToken,
            gas,
            store,
            signal,
            maxFeePerGas,
            tokenMetadata: tokenMetadata,
        });
        return { balanceDiffs, fee, tokenMetadata };
    }
    catch {
        signal?.throwIfAborted();
        const fee = await computeFee(client, {
            feeToken,
            gas,
            store,
            maxFeePerGas,
            signal,
        });
        return { balanceDiffs: undefined, fee, tokenMetadata: undefined };
    }
}
async function buildBalanceDiffs(client, options) {
    const { account, store, logs, tokenMetadata, signal } = options;
    signal?.throwIfAborted();
    const accountLower = account.toLowerCase();
    const transferLogs = (0, parseEventLogs_js_1.parseEventLogs)({
        abi: [ox_1.AbiEvent.fromAbi(Abis.tip20, 'Transfer')],
        eventName: 'Transfer',
        logs,
    });
    const approvalLogs = (0, parseEventLogs_js_1.parseEventLogs)({
        abi: [ox_1.AbiEvent.fromAbi(Abis.tip20, 'Approval')],
        eventName: 'Approval',
        logs,
    });
    const tokenMap = new Map();
    for (const log of transferLogs) {
        const token = log.address.toLowerCase();
        const fromLower = log.args.from.toLowerCase();
        const toLower = log.args.to.toLowerCase();
        const entry = tokenMap.get(token) ?? {
            incoming: 0n,
            outgoing: 0n,
            approved: 0n,
            recipients: new Set(),
            token: log.address,
        };
        if (fromLower === accountLower) {
            entry.outgoing += log.args.amount;
            entry.recipients.add(log.args.to);
        }
        if (toLower === accountLower)
            entry.incoming += log.args.amount;
        tokenMap.set(token, entry);
    }
    const approvals = new Map();
    for (const log of approvalLogs) {
        if (log.args.owner.toLowerCase() !== accountLower)
            continue;
        approvals.set(`${log.address.toLowerCase()}:${log.args.spender.toLowerCase()}`, log);
    }
    for (const log of approvals.values()) {
        if (log.args.amount === 0n)
            continue;
        const token = log.address.toLowerCase();
        const entry = tokenMap.get(token) ?? {
            incoming: 0n,
            outgoing: 0n,
            approved: 0n,
            recipients: new Set(),
            token: log.address,
        };
        entry.approved += log.args.amount;
        entry.recipients.add(log.args.spender);
        tokenMap.set(token, entry);
    }
    const entries = [...tokenMap.values()].filter((e) => {
        const net = e.outgoing > e.incoming
            ? e.outgoing - e.incoming
            : e.incoming - e.outgoing;
        return net > 0n || e.approved > 0n;
    });
    if (entries.length === 0)
        return {};
    if (entries.length > 100)
        return undefined;
    const metadataMap = new Map();
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(10, entries.length) }, async () => {
        while (index < entries.length) {
            const entry = entries[index++];
            try {
                const metadata = await (0, feeToken_js_1.resolveTokenMetadata)(client, {
                    token: entry.token,
                    tokenMetadata,
                    store,
                });
                metadataMap.set(entry.token.toLowerCase(), metadata);
            }
            catch {
                signal?.throwIfAborted();
            }
        }
    }));
    signal?.throwIfAborted();
    if (metadataMap.size !== entries.length)
        return undefined;
    const diffs = [];
    for (const entry of entries) {
        const incoming = entry.incoming > entry.outgoing ? entry.incoming - entry.outgoing : 0n;
        const outgoing = (entry.outgoing > entry.incoming ? entry.outgoing - entry.incoming : 0n) +
            entry.approved;
        const meta = metadataMap.get(entry.token.toLowerCase());
        const decimals = meta.decimals;
        const metadata = {
            address: entry.token,
            decimals,
            name: meta.name,
            symbol: meta.symbol,
        };
        if (incoming > 0n)
            diffs.push({
                ...metadata,
                direction: 'incoming',
                formatted: (0, formatUnits_js_1.formatUnits)(incoming, decimals),
                recipients: [],
                value: ox_1.Hex.fromNumber(incoming),
            });
        if (outgoing > 0n)
            diffs.push({
                ...metadata,
                direction: 'outgoing',
                formatted: (0, formatUnits_js_1.formatUnits)(outgoing, decimals),
                recipients: [...entry.recipients],
                value: ox_1.Hex.fromNumber(outgoing),
            });
    }
    return { [account]: diffs };
}
async function computeFee(client, options) {
    const { feeToken, gas, store, maxFeePerGas, tokenMetadata, signal } = options;
    signal?.throwIfAborted();
    if (!feeToken || !gas || !maxFeePerGas)
        return undefined;
    try {
        const metadata = await (0, feeToken_js_1.resolveTokenMetadata)(client, {
            token: feeToken,
            tokenMetadata,
            store,
        });
        signal?.throwIfAborted();
        const raw = gas * maxFeePerGas;
        const scale = 10n ** BigInt(Math.max(0, 18 - metadata.decimals));
        const amount = (raw + scale - 1n) / scale;
        return {
            amount: ox_1.Hex.fromNumber(amount),
            decimals: metadata.decimals,
            formatted: (0, formatUnits_js_1.formatUnits)(amount, metadata.decimals),
            symbol: metadata.symbol,
        };
    }
    catch {
        signal?.throwIfAborted();
        return undefined;
    }
}
//# sourceMappingURL=simulate.js.map