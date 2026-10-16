import * as RpcResponse from 'ox/RpcResponse';
import { ChainNotConfiguredError } from '../clients/createClientResolver.js';
import * as Accounts from './internal/relay/accounts.js';
import * as Sponsorship from './internal/relay/feePayer.js';
import * as FeeToken from './internal/relay/feeToken.js';
import * as KeyAuthorization from './internal/relay/keyAuthorization.js';
import * as Request_ from './internal/relay/request.js';
import * as Simulate from './internal/relay/simulate.js';
import * as internal from './internal/relay.js';
export function create(options) {
    if (Boolean(options.client) === Boolean(options.getClient))
        throw new RpcResponse.InvalidParamsError({
            message: 'Expected exactly one of client or getClient.',
        });
    const clientChainId = options.client?.chain?.id;
    if (options.client &&
        (!Number.isSafeInteger(clientChainId) ||
            !clientChainId ||
            clientChainId <= 0))
        throw new RpcResponse.InvalidParamsError({
            message: 'Expected a client with a configured chain.',
        });
    const getClient = (chainId) => {
        try {
            const client = options.client ?? options.getClient({ chainId });
            if (client.chain.id !== chainId)
                throw new RpcResponse.InvalidParamsError({
                    message: 'Conflicting chain ids.',
                });
            return client;
        }
        catch (error) {
            if (error instanceof ChainNotConfiguredError)
                throw new RpcResponse.InvalidParamsError({
                    message: error.shortMessage,
                });
            throw error;
        }
    };
    const handle = Request_.compose(async (request, requestOptions) => {
        const { chainId, response: _, ...rest } = requestOptions ?? {};
        if (chainId === undefined)
            throw new RpcResponse.InvalidParamsError({
                message: 'A chain ID is required to resolve the downstream client.',
            });
        return getClient(chainId).request(request, rest);
    }, options, getClient);
    const request = (request, requestOptions) => {
        const chainId = requestOptions?.chainId ?? clientChainId;
        if (chainId !== undefined &&
            (!Number.isSafeInteger(chainId) || chainId <= 0))
            return Promise.reject(new RpcResponse.InvalidParamsError({
                message: 'Expected a valid chain ID.',
            }));
        if (clientChainId !== undefined && chainId !== clientChainId)
            return Promise.reject(new RpcResponse.InvalidParamsError({
                message: 'Conflicting chain ids.',
            }));
        return handle(request, { ...requestOptions, chainId });
    };
    return {
        request,
        fetch: (request_, options = {}) => internal.fetch(request_, request, options),
    };
}
/**
 * Creates an RPC request handler by composing relay plugins around a downstream handler.
 *
 * Requests enter plugins in array order, and responses return in reverse order.
 * Post-fill hooks run concurrently after middleware finishes. Middleware sees
 * the downstream result before post-fill enrichment and signing.
 * Without plugins, the downstream handler is returned unchanged. Plugins decide
 * whether to forward, transform, or handle a request. Errors propagate unchanged
 * unless a plugin handles them.
 *
 * @example
 * ```ts
 * import { http } from 'viem'
 * import { Relay } from 'viem/tempo'
 *
 * const rpc = http('https://rpc.tempo.xyz')({})
 * const handle = Relay.handleRequest(rpc.request, {
 *   plugins: [
 *     {
 *       async handleRequest(context, next) {
 *         context.options.retryCount = 0
 *         await next()
 *       },
 *     },
 *   ],
 * })
 * const chainId = await handle({ method: 'eth_chainId' })
 * // @log: '0x1079'
 * ```
 *
 * @param next - Downstream RPC request handler, typically forwarding to the Tempo (Execution) RPC.
 * @param options - Relay options.
 * @returns The composed RPC request handler.
 */
export function handleRequest(next, options = {}) {
    return Request_.compose(next, options);
}
/**
 * Serves configurable accounts using shared atomic storage.
 *
 * The chain stores only a commitment to each account's config, so the plugin
 * records every config it relays (including configs left by `updateConfig`
 * calls) and serves them through `account_getConfig`. It also collects owner
 * approvals until the account's threshold is met, then submits.
 *
 * Memory storage is process-local. Independent clients and multiple server
 * instances must use the same persistent store to share configs and pending
 * approvals.
 *
 * @example
 * ```ts
 * import { http } from 'viem'
 * import { Relay, Store, withRelay } from 'viem/tempo'
 *
 * const transport = withRelay(http(), {
 *   plugins: [Relay.accounts({ store: Store.memory() })],
 * })
 * ```
 *
 * @param options - Shared atomic storage.
 * @returns A plugin that handles configurable account requests and forwards other calls.
 */
export function accounts(options) {
    return Accounts.create(options);
}
/**
 * Sponsors transactions with a local account or an external fee-payer relay.
 *
 * Place accounts before this plugin and fee-token selection after it.
 *
 * @example
 * ```ts
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Relay } from 'viem/tempo'
 * const plugin = Relay.feePayer({ account: privateKeyToAccount('0x...') })
 * ```
 * @param options - Sponsor account, policy, and display metadata.
 * @returns A fee-payer relay plugin.
 */
export function feePayer(options = {}) {
    return Sponsorship.create(options);
}
/**
 * Resolves fee tokens from user preferences, balances, and available fee AMM liquidity.
 *
 * @example
 * ```ts
 * import { Relay } from 'viem/tempo'
 * const plugin = Relay.feeToken()
 * ```
 * @returns A fee-token relay plugin.
 */
export function feeToken() {
    return FeeToken.create();
}
/**
 * Stores pending key authorizations and attaches them to the next fill that needs them.
 *
 * Signing a key authorization with `Actions.accessKey.signAuthorization` through a
 * relay with this plugin saves it with `relay_saveKeyAuthorization`. Configurable
 * account key authorizations are saved once they reach quorum. The next `eth_fillTransaction`
 * from the access key includes the authorization until the key is active onchain.
 * Remote `withRelay` transports opt in with `keyAuthorization: true`.
 *
 * Place this plugin before `Relay.accounts` so it can observe completed configurable
 * account key authorizations, and before plugins that read the filled transaction.
 *
 * A saved authorization only replaces a pending authorization that expires earlier,
 * so a replayed older authorization cannot replace a newer one.
 *
 * Memory storage is process-local. Multiple server instances must use the same
 * persistent atomic store to share pending authorizations.
 *
 * @example
 * ```ts
 * import { http } from 'viem'
 * import { Relay, Store, withRelay } from 'viem/tempo'
 *
 * const transport = withRelay(http(), {
 *   plugins: [Relay.keyAuthorization({ store: Store.memory() })],
 * })
 * ```
 *
 * @param options - Pending key authorization storage.
 * @returns A plugin that stores and attaches pending key authorizations.
 */
export function keyAuthorization(options = {}) {
    return KeyAuthorization.create(options);
}
/**
 * Adds balance changes, estimated fees, and execution errors to fill capabilities.
 *
 * Runs after transaction middleware to simulate the final filled result.
 *
 * @example
 * ```ts
 * import { Relay } from 'viem/tempo'
 * const plugin = Relay.simulate()
 * ```
 * @param options - Optional metadata store.
 * @returns A simulation relay plugin.
 */
export function simulate(options = {}) {
    return Simulate.create(options);
}
//# sourceMappingURL=Relay.js.map