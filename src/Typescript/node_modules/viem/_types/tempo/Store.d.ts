import type { MaybePromise } from '../types/utils.js';
export type Store = {
    /** Atomically replaces `expected` with `value` when supported. */
    compareAndSet?: CompareAndSet | undefined;
    /** Reads a value. */
    getItem(key: string): MaybePromise<string | null | undefined>;
    /** Removes a value. */
    removeItem(key: string): MaybePromise<void>;
    /** Writes a value. */
    setItem(key: string, value: string): MaybePromise<void>;
};
/** Atomic compare-and-set operation. */
export type CompareAndSet = (key: string, expected: string | null, value: string, options?: CompareAndSet.Options | undefined) => MaybePromise<boolean>;
export declare namespace CompareAndSet {
    /** Compare-and-set options. */
    type Options = {
        /** Unix timestamp in milliseconds after which the value expires. */
        expiresAt?: number | undefined;
    };
}
/** Store with atomic compare-and-set support. */
export type Atomic = Store & {
    /** Atomically replaces `expected` with `value` and applies its expiration. */
    compareAndSet: CompareAndSet;
};
/**
 * Wraps a base store with an optional key prefix and request deduplication.
 * Concurrent `getItem` calls for the same key share one in-flight promise.
 *
 * @example
 * ```ts
 * import { Store } from 'viem/tempo'
 *
 * const store = Store.from(Store.memory(), { key: 'tempo' })
 * await store.setItem('foo', 'bar')
 * // stored under "tempo:foo"
 * ```
 */
export declare function from(store: Atomic, options?: from.Options | undefined): Atomic;
export declare function from(store: Store, options?: from.Options | undefined): Store;
export declare namespace from {
    /** Store options. */
    type Options = {
        /** Key prefix prepended to all store keys. */
        key?: string | undefined;
    };
}
/** Creates an in-memory store backed by a `Map`. */
export declare function memory(options?: from.Options): Atomic;
/** Creates a store backed by `globalThis.sessionStorage`. */
export declare function session(options?: from.Options): Store;
/**
 * Returns the default store for the current environment.
 *
 * Returns a singleton so that the zone transport and actions share the
 * same instance without requiring explicit plumbing.
 *
 * - Browser: `sessionStorage`
 * - Server/unsupported: in-memory `Map`-based store
 */
export declare function defaultStore(): Store;
//# sourceMappingURL=Store.d.ts.map