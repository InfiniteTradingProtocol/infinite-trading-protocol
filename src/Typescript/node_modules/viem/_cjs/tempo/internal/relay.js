"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = fetch;
const RpcResponse = require("ox/RpcResponse");
const base_js_1 = require("../../errors/base.js");
const request_js_1 = require("../../errors/request.js");
async function fetch(request, handler, options = {}) {
    if (request.method !== 'POST')
        return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const contentType = request.headers
        .get('content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase();
    if (contentType !== 'application/json')
        return new Response(null, { status: 415 });
    const body = await (async () => {
        try {
            return { value: (await request.json()) };
        }
        catch {
            return {
                error: {
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: 'Parse error' },
                },
            };
        }
    })();
    if (body.error)
        return Response.json(body.error);
    const requestOptions = {
        ...options,
        signal: options.signal ?? request.signal,
    };
    const handle = async (value) => {
        if (!value ||
            typeof value !== 'object' ||
            Array.isArray(value) ||
            !('jsonrpc' in value) ||
            value.jsonrpc !== '2.0' ||
            !('method' in value) ||
            typeof value.method !== 'string' ||
            ('id' in value &&
                value.id !== null &&
                typeof value.id !== 'string' &&
                (typeof value.id !== 'number' || !Number.isFinite(value.id))) ||
            ('params' in value &&
                (value.params === null || typeof value.params !== 'object')))
            return {
                jsonrpc: '2.0',
                id: null,
                error: { code: -32600, message: 'Invalid Request' },
            };
        const id = 'id' in value ? value.id : undefined;
        try {
            if ('params' in value && !Array.isArray(value.params))
                throw new RpcResponse.InvalidParamsError({
                    message: 'Expected positional RPC parameters.',
                });
            const metadata = {};
            const result = await handler({
                method: value.method,
                ...('params' in value
                    ? { params: value.params }
                    : {}),
            }, {
                ...requestOptions,
                response: metadata,
            });
            if (id === undefined)
                return undefined;
            return JSON.parse(JSON.stringify({
                jsonrpc: '2.0',
                id,
                result: result ?? null,
                ...metadata,
            }));
        }
        catch (error) {
            requestOptions.signal.throwIfAborted();
            if (id === undefined)
                return undefined;
            const cause = error instanceof base_js_1.BaseError
                ? error.walk((error) => error instanceof request_js_1.RpcRequestError ||
                    error instanceof RpcResponse.BaseError)
                : error;
            const rpcError = cause instanceof request_js_1.RpcRequestError
                ? {
                    code: cause.code,
                    message: cause.details ?? 'RPC request failed',
                    data: cause.data,
                }
                : cause instanceof RpcResponse.BaseError
                    ? { code: cause.code, message: cause.message, data: cause.data }
                    : { code: -32603, message: 'Internal error' };
            try {
                return JSON.parse(JSON.stringify({ jsonrpc: '2.0', id, error: rpcError }));
            }
            catch {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32603, message: 'Internal error' },
                };
            }
        }
    };
    if (Array.isArray(body.value) && body.value.length > 0) {
        if (body.value.length > 100)
            return Response.json({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: 'Batch exceeds the limit of 100 requests.',
                },
            });
        const batch = body.value;
        const results = new Array(batch.length);
        let index = 0;
        await Promise.all(Array.from({ length: Math.min(10, batch.length) }, async () => {
            while (index < batch.length) {
                const current = index++;
                results[current] = await handle(batch[current]);
            }
        }));
        const responses = results.filter((value) => value !== undefined);
        return responses.length
            ? Response.json(responses)
            : new Response(null, { status: 204 });
    }
    const response = await handle(body.value);
    return response === undefined
        ? new Response(null, { status: 204 })
        : Response.json(response);
}
//# sourceMappingURL=relay.js.map