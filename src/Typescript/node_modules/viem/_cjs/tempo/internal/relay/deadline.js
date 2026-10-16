"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const ox_1 = require("ox");
async function run(handler, request, options, config) {
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted)
        abort();
    const timeout = setTimeout(() => controller.abort(new ox_1.RpcResponse.LimitExceededError({
        message: 'Relay fill exceeded its deadline.',
    })), config.timeout ?? 10_000);
    const signal = controller.signal;
    let rejectAbort;
    const aborted = new Promise((_, reject) => {
        rejectAbort = reject;
    });
    const onAbort = () => rejectAbort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    try {
        signal.throwIfAborted();
        return await Promise.race([
            handler(request, { ...options, signal }),
            aborted,
        ]);
    }
    finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abort);
        signal.removeEventListener('abort', onAbort);
        controller.abort();
    }
}
//# sourceMappingURL=deadline.js.map