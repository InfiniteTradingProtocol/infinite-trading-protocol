"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.from = from;
exports.memory = memory;
const tempo_1 = require("ox/tempo");
const Store = require("./Store.js");
function from(options) {
    const { store } = options;
    return {
        async get(key) {
            const value = await store.getItem(getStoreKey(key));
            if (!value)
                return undefined;
            try {
                return tempo_1.KeyAuthorization.deserialize(value);
            }
            catch {
                return undefined;
            }
        },
        async remove(key) {
            await store.removeItem(getStoreKey(key));
        },
        async set(key, keyAuthorization) {
            await store.setItem(getStoreKey(key), tempo_1.KeyAuthorization.serialize(keyAuthorization));
        },
    };
}
function memory() {
    return from({ store: Store.memory() });
}
function getStoreKey(key) {
    return [
        'keyAuthorization',
        key.chainId,
        key.address.toLowerCase(),
        key.accessKey.toLowerCase(),
    ].join(':');
}
//# sourceMappingURL=KeyAuthorizationManager.js.map