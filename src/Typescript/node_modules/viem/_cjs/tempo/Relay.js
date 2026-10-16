"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.handleRequest = handleRequest;
exports.accounts = accounts;
exports.feePayer = feePayer;
exports.feeToken = feeToken;
exports.keyAuthorization = keyAuthorization;
exports.simulate = simulate;
const RpcResponse = require("ox/RpcResponse");
const createClientResolver_js_1 = require("../clients/createClientResolver.js");
const Accounts = require("./internal/relay/accounts.js");
const Sponsorship = require("./internal/relay/feePayer.js");
const FeeToken = require("./internal/relay/feeToken.js");
const KeyAuthorization = require("./internal/relay/keyAuthorization.js");
const Request_ = require("./internal/relay/request.js");
const Simulate = require("./internal/relay/simulate.js");
const internal = require("./internal/relay.js");
function create(options) {
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
            if (error instanceof createClientResolver_js_1.ChainNotConfiguredError)
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
function handleRequest(next, options = {}) {
    return Request_.compose(next, options);
}
function accounts(options) {
    return Accounts.create(options);
}
function feePayer(options = {}) {
    return Sponsorship.create(options);
}
function feeToken() {
    return FeeToken.create();
}
function keyAuthorization(options = {}) {
    return KeyAuthorization.create(options);
}
function simulate(options = {}) {
    return Simulate.create(options);
}
//# sourceMappingURL=Relay.js.map