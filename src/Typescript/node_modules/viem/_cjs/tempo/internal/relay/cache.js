"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoped = scoped;
exports.memoize = memoize;
const withTimeout_js_1 = require("../../../utils/promise/withTimeout.js");
const flights = new WeakMap();
const prefix = 'viem:relay:cache:';
function scoped(store) {
    if (!store)
        return undefined;
    return {
        getItem: (key) => store.getItem(key),
        setItem: (key, value) => store.setItem(key, value),
        removeItem: (key) => store.removeItem(key),
    };
}
async function memoize(fetch, options) {
    const { store, ttl } = options;
    const key = `${prefix}${options.key}`;
    let active = true;
    const timeoutError = new Error('Relay cache operation timed out.');
    return (0, withTimeout_js_1.withTimeout)(async () => {
        const raw = await store.getItem(key);
        if (!active)
            throw timeoutError;
        if (raw) {
            try {
                const entry = JSON.parse(raw, (_key, item) => {
                    if (typeof item !== 'string' || !item.startsWith(prefix))
                        return item;
                    if (item.startsWith(`${prefix}string:`))
                        return item.slice(`${prefix}string:`.length);
                    if (item.startsWith(`${prefix}bigint:`))
                        return BigInt(item.slice(`${prefix}bigint:`.length));
                    throw new TypeError('Invalid relay cache value.');
                });
                if (entry.expiresAt > Date.now())
                    return entry.value;
            }
            catch {
            }
        }
        let pending = flights.get(store);
        if (!pending) {
            pending = new Map();
            flights.set(store, pending);
        }
        const existing = pending.get(key);
        if (existing)
            return existing;
        const result = (async () => {
            const value = await fetch();
            if (!active)
                throw timeoutError;
            if (value !== undefined)
                await store.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttl }, (_key, item) => {
                    if (typeof item === 'bigint')
                        return `${prefix}bigint:${item}`;
                    if (typeof item === 'string' && item.startsWith(prefix))
                        return `${prefix}string:${item}`;
                    return item;
                }));
            return value;
        })().finally(() => pending.delete(key));
        pending.set(key, result);
        return result;
    }, {
        timeout: 30_000,
        errorInstance: timeoutError,
    }).finally(() => {
        active = false;
    });
}
//# sourceMappingURL=cache.js.map