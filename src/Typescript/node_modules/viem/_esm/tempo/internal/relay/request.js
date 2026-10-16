import { RpcResponse } from 'ox';
import { tempo } from '../../../chains/index.js';
import { createClient } from '../../../clients/createClient.js';
import { custom } from '../../../clients/transports/custom.js';
import * as Transaction from '../../Transaction.js';
import * as Store from './cache.js';
import * as Deadline from './deadline.js';
import { formatError, isExecutionError } from './error.js';
import { getDefaultTokens } from './feeToken.js';
import * as Utils from './utils.js';
import { extractCalls, getVirtualAddressTargets, resolveVirtualAddresses, } from './virtualAddress.js';
/** Compose middleware and execute post-fill hooks once for the selected result. */
export function compose(downstream, options = {}, resolveClient) {
    const options_ = options;
    const plugins = options.plugins ?? [];
    if (plugins.length === 0)
        return downstream;
    if (plugins.filter((plugin) => plugin.signTransaction).length > 1)
        throw new Error('Only one relay transaction signer may be configured.');
    const handle = async (request, requestOptions = {}) => {
        const stores = new Map();
        const tokens = new Map();
        const scoped = (store) => {
            if (!store)
                return undefined;
            let result = stores.get(store);
            if (!result) {
                result = Store.scoped(store);
                stores.set(store, result);
            }
            return result;
        };
        const execute = async (start, request, options) => {
            const state = {
                request,
                options: { ...options },
                result: undefined,
            };
            const contexts = new Map();
            const contextAt = (index) => {
                const existing = contexts.get(index);
                if (existing)
                    return existing;
                const clients = new Map();
                const chainId = (id = state.options.chainId) => {
                    if (id === undefined || !Number.isSafeInteger(id) || id <= 0)
                        throw new RpcResponse.InvalidParamsError({
                            message: 'A chain ID is required to resolve the downstream client.',
                        });
                    return id;
                };
                const context = {
                    get request() {
                        return state.request;
                    },
                    set request(value) {
                        state.request = value;
                    },
                    get result() {
                        return state.result;
                    },
                    set result(value) {
                        state.result = value;
                    },
                    get options() {
                        return state.options;
                    },
                    set options(value) {
                        state.options = value;
                    },
                    get client() {
                        return context.getClient();
                    },
                    getClient(id_) {
                        const id = chainId(id_);
                        let client = clients.get(id);
                        if (client)
                            return client;
                        const upstream = resolveClient?.(id);
                        if (upstream?.chain && upstream.chain.id !== id)
                            throw new RpcResponse.InvalidParamsError({
                                message: 'Conflicting chain ids.',
                            });
                        client = createClient({
                            chain: { ...tempo, ...upstream?.chain, id },
                            batch: { multicall: { deployless: true } },
                            transport: (config) => {
                                const transport = custom({
                                    request: async (request, options) => {
                                        const child = await execute(index + 1, request, {
                                            ...state.options,
                                            ...options,
                                            chainId: id,
                                        });
                                        return child.state.result;
                                    },
                                }, { retryCount: 0 })(config);
                                // Forward request options without adding a retry loop around downstream I/O.
                                return { ...transport, request: transport.config.request };
                            },
                        });
                        clients.set(id, client);
                        return client;
                    },
                    async resolveTokens(id_) {
                        const id = chainId(id_);
                        let result = tokens.get(id);
                        if (!result) {
                            result = Promise.resolve().then(() => (options_.resolveTokens ?? getDefaultTokens)(id));
                            tokens.set(id, result);
                        }
                        return result;
                    },
                    getStore: scoped,
                };
                contexts.set(index, context);
                return context;
            };
            const dispatch = async (index) => {
                if (index === plugins.length) {
                    const parameters = state.request.params?.[0];
                    // The node must estimate unsigned sponsorship independently of the sender's fee-token balance.
                    const request = state.request.method === 'eth_fillTransaction' &&
                        parameters?.feePayer === true &&
                        !parameters.feePayerSignature
                        ? {
                            ...state.request,
                            params: [{ ...parameters, feeToken: undefined }],
                        }
                        : state.request;
                    requestOptions.signal?.throwIfAborted();
                    state.result = await downstream(request, {
                        ...state.options,
                        ...(isFill ? { signal: requestOptions.signal } : {}),
                    });
                    return;
                }
                const plugin = plugins[index];
                const context = contextAt(index);
                if (!plugin.handleRequest)
                    return dispatch(index + 1);
                let called = false;
                const result = await plugin.handleRequest(context, async () => {
                    if (called)
                        throw new Error('next() may only be called once per middleware invocation.');
                    called = true;
                    await dispatch(index + 1);
                });
                if (result !== undefined)
                    state.result = result;
            };
            await dispatch(start);
            return { state, contextAt };
        };
        const isFill = request.method === 'eth_fillTransaction';
        const isRaw = [
            'eth_signRawTransaction',
            'eth_sendRawTransaction',
            'eth_sendRawTransactionSync',
        ].includes(request.method);
        const parameters = request.params?.[0];
        let root;
        try {
            requestOptions.signal?.throwIfAborted();
            if (isFill &&
                (!parameters ||
                    typeof parameters !== 'object' ||
                    Array.isArray(parameters)))
                throw new RpcResponse.InvalidParamsError({
                    message: 'Expected a transaction object.',
                });
            if (isFill)
                Utils.normalizeFillTransactionRequest(parameters);
            const bodyChainId = (() => {
                if (isRaw && Utils.isSerializedTempoTransaction(request.params?.[0])) {
                    try {
                        return Transaction.deserialize(request.params[0]).chainId;
                    }
                    catch {
                        throw new RpcResponse.InvalidParamsError({
                            message: 'Invalid serialized Tempo transaction.',
                        });
                    }
                }
                if (!isFill || parameters.chainId === undefined)
                    return undefined;
                const id = Utils.resolveChainId(parameters.chainId);
                if (id === undefined || !Number.isSafeInteger(id) || id <= 0)
                    throw new RpcResponse.InvalidParamsError({
                        message: 'Invalid transaction chain ID.',
                    });
                return id;
            })();
            if (bodyChainId !== undefined &&
                requestOptions.chainId !== undefined &&
                bodyChainId !== requestOptions.chainId)
                throw new RpcResponse.InvalidParamsError({
                    message: 'Conflicting chain ids.',
                });
            root = await execute(0, request, {
                ...requestOptions,
                ...((requestOptions.chainId ?? bodyChainId) !== undefined
                    ? { chainId: requestOptions.chainId ?? bodyChainId }
                    : {}),
            });
            if (!isFill)
                return root.state.result;
            const filled = root.state.result;
            if (filled.capabilities?.error)
                return filled;
            const transaction = Utils.normalizeTempoTransaction(Utils.mergeCallsFromRequest(filled.tx, Utils.normalizeFillTransactionRequest(parameters)));
            const final = {
                ...filled,
                tx: Utils.formatTempoTransaction(transaction),
            };
            const snapshot = freeze(structuredClone(final));
            const targets = getVirtualAddressTargets(extractCalls(transaction));
            const resolved = final.capabilities?.virtualAddresses;
            const [patches, signatures, virtualAddresses] = await Promise.all([
                Promise.all(plugins.map((plugin, index) => plugin.afterFill?.(snapshot, root.contextAt(index)))),
                Promise.all(plugins.map((plugin, index) => plugin.signTransaction?.(snapshot, root.contextAt(index)))),
                targets.length > 0 &&
                    !targets.every((target) => resolved && target in resolved)
                    ? resolveVirtualAddresses(root.contextAt(-1).client, {
                        calls: extractCalls(transaction),
                    }).catch(() => {
                        requestOptions.signal?.throwIfAborted();
                        return undefined;
                    })
                    : undefined,
            ]);
            requestOptions.signal?.throwIfAborted();
            const capabilities = { ...final.capabilities };
            const keys = new Set();
            for (const patch of patches) {
                for (const [key, value] of Object.entries(patch?.capabilities ?? {})) {
                    if (keys.has(key))
                        throw new Error(`Conflicting relay capability: ${key}.`);
                    keys.add(key);
                    capabilities[key] = value;
                }
            }
            const signature = signatures.find((signature) => signature !== undefined);
            if (signature) {
                delete final.tx.signature;
                final.tx.feePayerSignature = signature;
            }
            const sponsor = capabilities.sponsor ?? final.sponsor;
            return {
                ...final,
                capabilities: {
                    sponsored: !!sponsor,
                    ...capabilities,
                    ...(virtualAddresses ? { virtualAddresses } : {}),
                },
            };
        }
        catch (error) {
            requestOptions.signal?.throwIfAborted();
            if (isFill &&
                isExecutionError(error) &&
                parameters.capabilities
                    ?.errors === true) {
                // Resolve errors through a downstream-only client; never restart the plugin pipeline.
                const id = requestOptions.chainId ?? Utils.resolveChainId(parameters.chainId);
                const client = createClient({
                    chain: { ...tempo, id: id ?? tempo.id },
                    transport: custom({
                        request: (request, options) => downstream(request, {
                            ...requestOptions,
                            ...options,
                            chainId: id,
                            signal: requestOptions.signal,
                        }),
                    }, { retryCount: 0 }),
                });
                return formatError(error, parameters, client);
            }
            if (!isFill && !isRaw)
                throw error;
            throw Utils.toRpcError(error);
        }
    };
    if (options.timeout !== undefined &&
        (!Number.isSafeInteger(options.timeout) || options.timeout <= 0))
        throw new RpcResponse.InvalidParamsError({
            message: 'Expected a positive integer for timeout.',
        });
    if (options.timeout !== undefined && options.timeout > 2_147_483_647)
        throw new RpcResponse.InvalidParamsError({
            message: 'The fill timeout cannot exceed 2147483647 milliseconds.',
        });
    return (request, requestOptions = {}) => request.method === 'eth_fillTransaction'
        ? Deadline.run(handle, request, requestOptions, options)
        : handle(request, requestOptions);
}
/** Prevent hooks from mutating the transaction another hook signs. */
function freeze(value) {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value))
            freeze(child);
        Object.freeze(value);
    }
    return value;
}
/** Normalize a downstream fill without discarding capabilities added by other plugins. */
export async function fill(client, transaction, options = {}) {
    const formatted = Utils.formatFillTransactionRequest(client, transaction);
    const result = (await client.request({
        method: 'eth_fillTransaction',
        params: [formatted],
    }, options));
    const error = result.capabilities?.error;
    if (error) {
        const cause = new Error(error.message ?? error.errorName ?? 'UpstreamRevert');
        Object.assign(cause, { name: 'UpstreamRevertError', data: error.data });
        throw cause;
    }
    return { ...result, tx: Utils.mergeCallsFromRequest(result.tx, transaction) };
}
//# sourceMappingURL=request.js.map