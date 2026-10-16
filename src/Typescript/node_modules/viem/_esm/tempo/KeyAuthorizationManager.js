import { KeyAuthorization } from 'ox/tempo';
import * as Store from './Store.js';
/**
 * Creates a key authorization manager backed by a store.
 *
 * Entries use the same keys as the `Relay.keyAuthorization` plugin, so both can
 * share one store.
 *
 * @example
 * ```ts
 * import { Account, KeyAuthorizationManager, Store } from 'viem/tempo'
 *
 * const accessKey = Account.fromP256(privateKey, {
 *   access: root,
 *   keyAuthorizationManager: KeyAuthorizationManager.from({
 *     store: Store.session(),
 *   }),
 * })
 * ```
 *
 * @param options - Manager options.
 * @returns A key authorization manager.
 */
export function from(options) {
    const { store } = options;
    return {
        async get(key) {
            const value = await store.getItem(getStoreKey(key));
            if (!value)
                return undefined;
            try {
                return KeyAuthorization.deserialize(value);
            }
            catch {
                return undefined;
            }
        },
        async remove(key) {
            await store.removeItem(getStoreKey(key));
        },
        async set(key, keyAuthorization) {
            await store.setItem(getStoreKey(key), KeyAuthorization.serialize(keyAuthorization));
        },
    };
}
/**
 * Creates a key authorization manager backed by a process-local memory store.
 *
 * @example
 * ```ts
 * import { KeyAuthorizationManager } from 'viem/tempo'
 *
 * const keyAuthorizationManager = KeyAuthorizationManager.memory()
 * ```
 *
 * @returns A key authorization manager.
 */
export function memory() {
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