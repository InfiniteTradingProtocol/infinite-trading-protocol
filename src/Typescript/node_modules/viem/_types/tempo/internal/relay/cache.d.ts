import type * as Store_ from '../../Store.js';
export type Store = Store_.Store;
export declare function scoped(store: Store | undefined): Store | undefined;
export declare function memoize<value>(fetch: () => Promise<value>, options: {
    key: string;
    store: Store;
    ttl: number;
}): Promise<value>;
//# sourceMappingURL=cache.d.ts.map