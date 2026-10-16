"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportNotConfiguredError = exports.ChainNotConfiguredError = void 0;
exports.createClientResolver = createClientResolver;
const base_js_1 = require("../errors/base.js");
const createClient_js_1 = require("./createClient.js");
function createClientResolver(options) {
    const { chains, transport, ...rest } = options;
    const clients = new Map();
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
            const client = (0, createClient_js_1.createClient)({ ...rest, chain, transport: transport_ });
            clients.set(chainId, client);
            return client;
        },
    };
}
class ChainNotConfiguredError extends base_js_1.BaseError {
    constructor({ chainId }) {
        super(`Chain with id ${chainId} is not configured.`, {
            name: 'createClientResolver.ChainNotConfiguredError',
        });
    }
}
exports.ChainNotConfiguredError = ChainNotConfiguredError;
class TransportNotConfiguredError extends base_js_1.BaseError {
    constructor({ chainId }) {
        super(`Transport for chain with id ${chainId} is not configured.`, {
            name: 'createClientResolver.TransportNotConfiguredError',
        });
    }
}
exports.TransportNotConfiguredError = TransportNotConfiguredError;
//# sourceMappingURL=createClientResolver.js.map