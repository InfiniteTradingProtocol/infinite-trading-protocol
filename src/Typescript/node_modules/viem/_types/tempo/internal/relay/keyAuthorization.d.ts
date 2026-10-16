import type { Address } from 'abitype';
import { KeyAuthorization } from 'ox/tempo';
import type * as Relay from '../../Relay.js';
import * as Store from '../../Store.js';
/** Creates middleware that stores pending key authorizations and attaches them to fills. @internal */
export declare function create(options?: Relay.keyAuthorization.Options): Relay.keyAuthorization.ReturnType;
/**
 * Removes a stored authorization only while it still holds the value that was read,
 * so a concurrently saved replacement survives. The empty value expires immediately.
 * @internal
 */
export declare function remove(store: Store.Atomic, options: {
    key: string;
    value: string;
}): Promise<void>;
/**
 * Stores an authorization unless a pending authorization for the same key expires
 * later, so a replayed older authorization cannot replace a newer one.
 * @internal
 */
export declare function write(store: Store.Atomic, options: {
    account: Address;
    keyAuthorization: KeyAuthorization.Signed;
}): Promise<boolean>;
//# sourceMappingURL=keyAuthorization.d.ts.map