import { BaseError } from '../errors/base.js';
import { createClient, } from './createClient.js';
/**
 * Creates a resolver that lazily constructs and caches a Client for each configured chain.
 *
 * @example
 * ```ts
 * import { createClientResolver, http } from 'viem'
 * import { mainnet, optimism } from 'viem/chains'
 *
 * const resolver = createClientResolver({
 *   chains: [mainnet, optimism],
 *   transport: {
 *     [mainnet.id]: http(),
 *     [optimism.id]: http(),
 *   },
 * })
 *
 * const client = resolver.getClient({ chainId: optimism.id })
 * ```
 *
 * @param options - Resolver options, including shared Client configuration.
 * @returns A resolver for the configured chains.
 */
export function createClientResolver(options) {
    const { chains, transport, ...rest } = options;
    const clients = new Map();
    // The chain and transport are selected from the same chain ID.
    return {
        getClient({ chainId }) {
            const cached = clients.get(chainId);
            if (cached)
                return cached;
            const chain = chains.find((chain) => chain.id === chainId);
            if (!chain)
                throw new ChainNotConfiguredError({ chainId });
            const transport_ = typeof transport === 'function'
                ? transport({ chainId })
                : transport[chainId];
            if (!transport_)
                throw new TransportNotConfiguredError({ chainId });
            const client = createClient({ ...rest, chain, transport: transport_ });
            clients.set(chainId, client);
            return client;
        },
    };
}
/** Thrown when a Client is requested for an unconfigured chain. */
export class ChainNotConfiguredError extends BaseError {
    constructor({ chainId }) {
        super(`Chain with id ${chainId} is not configured.`, {
            name: 'createClientResolver.ChainNotConfiguredError',
        });
    }
}
/** Thrown when a configured chain has no transport. */
export class TransportNotConfiguredError extends BaseError {
    constructor({ chainId }) {
        super(`Transport for chain with id ${chainId} is not configured.`, {
            name: 'createClientResolver.TransportNotConfiguredError',
        });
    }
}
//# sourceMappingURL=createClientResolver.js.map