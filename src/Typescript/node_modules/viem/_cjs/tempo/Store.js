"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.from = from;
exports.memory = memory;
exports.session = session;
exports.defaultStore = defaultStore;
function from(store, options = {}) {
    const { key } = options;
    const prefix = key ? `${key}:` : '';
    const inflight = new Map();
    const compareAndSet = store.compareAndSet?.bind(store);
    return {
        ...(compareAndSet
            ? {
                compareAndSet(k, expected, value, options) {
                    const fullKey = `${prefix}${k}`;
                    inflight.delete(fullKey);
                    return compareAndSet(fullKey, expected, value, options);
                },
            }
            : {}),
        getItem(k) {
            const fullKey = `${prefix}${k}`;
            const existing = inflight.get(fullKey);
            if (existing)
                return existing;
            const result = Promise.resolve(store.getItem(fullKey)).finally(() => {
                inflight.delete(fullKey);
            });
            inflight.set(fullKey, result);
            return result;
        },
        setItem(k, value) {
            const fullKey = `${prefix}${k}`;
            inflight.delete(fullKey);
            return store.setItem(fullKey, value);
        },
        removeItem(k) {
            const fullKey = `${prefix}${k}`;
            inflight.delete(fullKey);
            return store.removeItem(fullKey);
        },
    };
}
function memory(options = {}) {
    const store = new Map();
    const get = (key) => {
        const entry = store.get(key);
        if (!entry)
            return undefined;
        if (entry.expiresAt === undefined || entry.expiresAt > Date.now())
            return entry;
        store.delete(key);
        return undefined;
    };
    return from({
        compareAndSet(key, expected, value, options) {
            if ((get(key)?.value ?? null) !== expected)
                return false;
            store.set(key, { expiresAt: options?.expiresAt, value });
            return true;
        },
        getItem(key) {
            return get(key)?.value ?? null;
        },
        setItem(key, value) {
            store.set(key, { expiresAt: undefined, value });
        },
        removeItem(key) {
            store.delete(key);
        },
    }, options);
}
function session(options = {}) {
    return from({
        getItem(key) {
            return globalThis.sessionStorage.getItem(key);
        },
        setItem(key, value) {
            try {
                globalThis.sessionStorage.setItem(key, value);
            }
            catch { }
        },
        removeItem(key) {
            globalThis.sessionStorage.removeItem(key);
        },
    }, options);
}
let _default;
function defaultStore() {
    if (_default)
        return _default;
    try {
        if (globalThis.sessionStorage)
            _default = session();
    }
    catch { }
    _default ??= memory();
    return _default;
}
//# sourceMappingURL=Store.js.map