import * as Address from 'ox/Address';
import * as Hash from 'ox/Hash';
import * as Hex from 'ox/Hex';
import * as Provider from 'ox/Provider';
import * as RpcRequest from 'ox/RpcRequest';
import { getTransactionReceipt } from '../actions/public/getTransactionReceipt.js';
import { sendTransaction } from '../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../actions/wallet/sendTransactionSync.js';
import { createClient } from '../clients/createClient.js';
import { createTransport, } from '../clients/transports/createTransport.js';
import { http as http_, } from '../clients/transports/http.js';
import { MethodNotFoundRpcError, MethodNotSupportedRpcError, } from '../errors/rpc.js';
import * as Plugin_ from './internal/relay/plugin.js';
import * as Request_ from './internal/relay/request.js';
import * as Store_ from './Store.js';
import * as Transaction from './Transaction.js';
/**
 * Creates an HTTP transport with support for Zone authentication tokens.
 *
 * Reads the authorization token from the store and injects the
 * `X-Authorization-Token` header on every request.
 *
 * @example
 * ```ts
 * import { createPublicClient } from 'viem'
 * import { http, Zone } from 'viem/tempo'
 *
 * const client = createPublicClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 * ```
 */
export function http(url, config = {}) {
    const { store: store_, onFetchRequest, ...rest } = config;
    const store = store_ ?? Store_.defaultStore();
    return (config) => http_(url, {
        ...rest,
        async onFetchRequest(request, init) {
            const next = (await onFetchRequest?.(request, init)) ?? init;
            const headers = new Headers(next.headers);
            const chainId = config.chain?.id;
            if (chainId) {
                const token = (await store.getItem(`auth:token:${chainId}`)) ?? null;
                if (token)
                    headers.set('X-Authorization-Token', token);
            }
            return { ...next, headers };
        },
    })(config);
}
export function withRelay(defaultTransport, relayTransport, parameters) {
    if (typeof relayTransport !== 'function')
        return (config) => {
            const transport = defaultTransport(config);
            const next = (request, options) => transport.request(request, options);
            const request = Request_.compose(next, relayTransport, config.chain ? () => ({ chain: config.chain }) : undefined);
            return {
                ...transport,
                request: ((request_, options) => request(request_, {
                    chainId: config.chain?.id,
                    ...options,
                })),
                value: {
                    ...transport.value,
                    ...(relayTransport.plugins?.some(Plugin_.isAccounts)
                        ? { accounts: true }
                        : {}),
                    ...(relayTransport.plugins?.some(Plugin_.isKeyAuthorization)
                        ? { keyAuthorization: true }
                        : {}),
                },
            };
        };
    const { keyAuthorization, policy = 'sign-only' } = parameters ?? {};
    return (config) => {
        const transport_default = defaultTransport(config);
        const transport_relay = relayTransport(config);
        const transport = createTransport({
            key: withRelay.type,
            name: 'Relay Proxy',
            async request({ method, params }, options) {
                if (method === 'eth_fillTransaction')
                    return transport_relay.request({ method, params }, options);
                if (method === 'eth_getTransactionByHash' ||
                    method === 'eth_getTransactionReceipt') {
                    const result = await transport_default.request({ method, params }, options);
                    if (result !== null && typeof result !== 'undefined')
                        return result;
                    const operation = await (async () => {
                        try {
                            return await transport_relay.request({ method: 'account_getOperation', params }, options);
                        }
                        catch (error) {
                            if (error instanceof MethodNotFoundRpcError ||
                                error instanceof MethodNotSupportedRpcError) {
                                // Relays without the accounts plugin do not expose this method.
                                return null;
                            }
                            throw error;
                        }
                    })();
                    if (!operation ||
                        typeof operation !== 'object' ||
                        !('type' in operation) ||
                        operation.type !== 'transaction')
                        return result;
                    return transport_relay.request({ method, params }, options);
                }
                if (method === 'account_approveKeyAuthorization' ||
                    method === 'account_approveRawTransaction' ||
                    method === 'account_approveRawTransactionSync' ||
                    method === 'account_getConfig' ||
                    method === 'account_getOperation' ||
                    method === 'relay_saveKeyAuthorization')
                    return transport_relay.request({ method, params }, options);
                if (method === 'eth_sendRawTransactionSync' ||
                    method === 'eth_sendRawTransaction') {
                    const serialized = params[0];
                    const transaction = Transaction.deserialize(serialized);
                    if (transaction.signature?.type === 'configurable')
                        return transport_relay.request({ method, params }, options);
                    // Serialized Tempo envelopes encode `feePayer: true` as a missing fee payer
                    // signature until the relay co-signs the transaction.
                    if (transaction.feePayerSignature === null) {
                        // For 'sign-and-broadcast', relay signs and broadcasts
                        if (policy === 'sign-and-broadcast')
                            return transport_relay.request({ method, params }, options);
                        // For 'sign-only', request signature from relay using eth_signRawTransaction
                        {
                            // Request signature from relay using eth_signRawTransaction
                            const signedTransaction = await transport_relay.request({
                                method: 'eth_signRawTransaction',
                                params: [serialized],
                            }, options);
                            // Broadcast the signed transaction via the default transport
                            return transport_default.request({ method, params: [signedTransaction] }, options);
                        }
                    }
                }
                return (await transport_default.request({ method, params }, options));
            },
            type: withRelay.type,
        });
        return {
            ...transport,
            value: {
                accounts: true,
                ...(keyAuthorization ? { keyAuthorization } : {}),
            },
        };
    };
}
/** @deprecated Use `withRelay` instead. */
export function withFeePayer(defaultTransport, relayTransport, parameters) {
    const { policy = 'sign-only' } = parameters ?? {};
    return (config) => {
        const transport_default = defaultTransport(config);
        const transport_relay = relayTransport(config);
        return createTransport({
            key: withFeePayer.type,
            name: 'Relay Proxy',
            async request({ method, params }, options) {
                if (method === 'eth_fillTransaction') {
                    const request = params?.[0];
                    if (request &&
                        typeof request === 'object' &&
                        'feePayer' in request &&
                        request.feePayer === true)
                        return transport_relay.request({ method, params }, options);
                }
                if (method === 'eth_sendRawTransactionSync' ||
                    method === 'eth_sendRawTransaction') {
                    const serialized = params[0];
                    const transaction = Transaction.deserialize(serialized);
                    // Serialized Tempo envelopes encode `feePayer: true` as a missing fee payer
                    // signature until the relay co-signs the transaction.
                    if (transaction.feePayerSignature === null) {
                        // For 'sign-and-broadcast', relay signs and broadcasts
                        if (policy === 'sign-and-broadcast')
                            return transport_relay.request({ method, params }, options);
                        // For 'sign-only', request signature from relay using eth_signRawTransaction
                        {
                            // Request signature from relay using eth_signRawTransaction
                            const signedTransaction = await transport_relay.request({
                                method: 'eth_signRawTransaction',
                                params: [serialized],
                            }, options);
                            // Broadcast the signed transaction via the default transport
                            return transport_default.request({ method, params: [signedTransaction] }, options);
                        }
                    }
                }
                return (await transport_default.request({ method, params }, options));
            },
            type: withFeePayer.type,
        });
    };
}
/**
 * Creates a transport that instruments a compatibility layer for
 * `wallet_` RPC actions (`sendCalls`, `getCallsStatus`, etc).
 *
 * @param transport - Transport to wrap.
 * @returns Transport.
 */
export function walletNamespaceCompat(transport, options) {
    const { account } = options;
    const sendCallsMagic = Hash.keccak256(Hex.fromString('TEMPO_5792'));
    return (options) => {
        const t = transport(options);
        const chain = options.chain;
        return {
            ...t,
            async request(args) {
                const request = RpcRequest.from(args);
                const client = createClient({
                    chain,
                    transport,
                });
                if (request.method === 'wallet_sendCalls') {
                    const params = request.params[0] ?? {};
                    const { capabilities, chainId, from } = params;
                    const { sync, ...properties } = capabilities ?? {};
                    if (!chainId)
                        throw new Provider.UnsupportedChainIdError();
                    if (Number(chainId) !== client.chain.id)
                        throw new Provider.UnsupportedChainIdError();
                    if (from && !Address.isEqual(from, account.address))
                        throw new Provider.DisconnectedError();
                    const calls = (params.calls ?? []).map((call) => ({
                        to: call.to,
                        value: call.value ? BigInt(call.value) : undefined,
                        data: call.data,
                    }));
                    const hash = await (async () => {
                        if (!sync)
                            return sendTransaction(client, {
                                account,
                                ...(properties ? properties : {}),
                                calls,
                            });
                        const { transactionHash } = await sendTransactionSync(client, {
                            account,
                            ...(properties ? properties : {}),
                            calls,
                        });
                        return transactionHash;
                    })();
                    const id = Hex.concat(hash, Hex.padLeft(chainId, 32), sendCallsMagic);
                    return {
                        capabilities: { sync },
                        id,
                    };
                }
                if (request.method === 'wallet_getCallsStatus') {
                    const [id] = request.params ?? [];
                    if (!id)
                        throw new Error('`id` not found');
                    if (!id.endsWith(sendCallsMagic.slice(2)))
                        throw new Error('`id` not supported');
                    Hex.assert(id);
                    const hash = Hex.slice(id, 0, 32);
                    const chainId = Hex.slice(id, 32, 64);
                    const receipt = await getTransactionReceipt(client, { hash });
                    return {
                        atomic: true,
                        chainId: Number(chainId),
                        id,
                        receipts: [receipt],
                        status: receipt.status === 'success' ? 200 : 500,
                        version: '2.0.0',
                    };
                }
                return t.request(args);
            },
        };
    };
}
//# sourceMappingURL=Transport.js.map