import type { Address } from 'abitype';
import type { Client } from '../../../clients/createClient.js';
import type * as Relay from '../../Relay.js';
import * as Store from './cache.js';
export declare function create(): Relay.Plugin;
export declare function getDefaultTokens(chainId: number): Promise<readonly Address[]>;
/** Resolves a funded fee-token candidate with fee AMM liquidity. @internal */
export declare function resolveFeeToken(client: Client, options: resolveFeeToken.Options): Promise<{
    feeToken: `0x${string}` | undefined;
    virtualAddresses: Record<`0x${string}`, `0x${string}` | null> | undefined;
}>;
export declare namespace resolveFeeToken {
    type Options = {
        minimumBalance?: bigint | undefined;
        exclude?: Address | undefined;
        feeToken?: Address | undefined;
        account?: Address | undefined;
        tokens?: readonly Address[] | undefined;
        targets?: readonly Address[] | undefined;
    };
}
export declare function resolveTokenMetadata(client: Client, options: resolveTokenMetadata.Options): Promise<{
    decimals: number;
    symbol: string;
    name: string;
}>;
export declare namespace resolveTokenMetadata {
    type Options = {
        token: Address;
        tokenMetadata?: Record<Address, {
            name: string;
            symbol: string;
            currency: string;
        }> | undefined;
        store?: Store.Store | undefined;
    };
}
//# sourceMappingURL=feeToken.d.ts.map