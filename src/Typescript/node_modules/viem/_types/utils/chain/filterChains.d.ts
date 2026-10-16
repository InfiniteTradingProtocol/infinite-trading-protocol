import type { ErrorType } from '../../errors/utils.js';
import type { Token } from '../../tokens/defineToken.js';
import type { Chain } from '../../types/chain.js';
export type FilterChainsParameters<criteria extends filterChains.Criteria = filterChains.Criteria> = {
    chains: filterChains.Chains;
} & criteria;
export type FilterChainsReturnType<criteria extends filterChains.Criteria | undefined> = (Chain & filterChains.TokenConstraint<criteria> & filterChains.TestnetConstraint<criteria>)[];
export type FilterChainsErrorType = ErrorType;
/**
 * Filters a chain registry or array by structured criteria.
 *
 * @experimental
 *
 * @param parameters - Chain registry or array and criteria to filter by.
 * @returns Matching chains.
 */
export declare function filterChains<const criteria extends filterChains.Criteria>(parameters: FilterChainsParameters<criteria>): FilterChainsReturnType<criteria>;
export declare namespace filterChains {
    type Chains = Record<string, unknown> | readonly unknown[];
    type Criteria = {
        /** Only include chains that have an address for the token. */
        token?: Token | undefined;
        /** Only include testnets (`true`) or mainnets (`false`). */
        testnet?: boolean | undefined;
        /** Sort the matching chains. */
        sort?: 'id' | 'name' | undefined;
    };
    type ReturnType<criteria extends Criteria | undefined> = FilterChainsReturnType<criteria>;
    type TokenConstraint<criteria extends Criteria | undefined> = criteria extends {
        token: infer token extends Token;
    } ? {
        id: Extract<keyof token['addresses'], number>;
    } : unknown;
    type TestnetConstraint<criteria extends Criteria | undefined> = criteria extends {
        testnet: infer testnet extends boolean;
    } ? testnet extends true ? {
        testnet: true;
    } : {
        testnet?: false | undefined;
    } : unknown;
}
//# sourceMappingURL=filterChains.d.ts.map