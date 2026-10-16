import * as Address from 'ox/Address';
import type * as Hex from 'ox/Hex';
import { AccountConfig } from 'ox/tempo';
import type * as Store from '../Store.js';
/** Reads a cached account config. */
export declare function read(store: Store.Store, options: read.Options): Promise<AccountConfig.Config | null>;
export declare namespace read {
    /** Parameters for {@link read}. */
    type Options = {
        /** Configurable account address. */
        address: Address.Address;
        /** Config commitment observed onchain. */
        commitment: Hex.Hex;
    };
}
/** Writes a validated account config. */
export declare function write(store: Store.Store, options: write.Options): Promise<void>;
export declare namespace write {
    /** Parameters for {@link write}. */
    type Options = {
        /** Configurable account address. */
        address: Address.Address;
        /** Config commitment used for lookup. */
        commitment: Hex.Hex;
        /** Complete config. */
        config: AccountConfig.Config;
    };
}
//# sourceMappingURL=Config.d.ts.map