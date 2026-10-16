import type { Address } from 'abitype';
import type { Client } from '../../../clients/createClient.js';
import type { Call } from '../../../types/calls.js';
import type { Log } from '../../../types/log.js';
import * as Actions from '../../actions/index.js';
import type * as Capabilities from '../../Capabilities.js';
import type * as Relay from '../../Relay.js';
import type * as Store from './cache.js';
export declare function create(options: Relay.simulate.Options): Relay.Plugin;
export declare function simulateAndParseDiffs(client: Client, options: simulateAndParseDiffs.Options): Promise<{
    balanceDiffs: {
        [x: string]: Capabilities.BalanceDiff[];
    } | undefined;
    fee: {
        amount: `0x${string}`;
        decimals: number;
        formatted: string;
        symbol: string;
    } | undefined;
    tokenMetadata: Actions.simulate.TokenMetadata;
} | {
    balanceDiffs: undefined;
    fee: {
        amount: `0x${string}`;
        decimals: number;
        formatted: string;
        symbol: string;
    } | undefined;
    tokenMetadata: undefined;
}>;
export declare namespace simulateAndParseDiffs {
    type Options = {
        account?: Address | undefined;
        calls: readonly Call[];
        feeToken?: Address | undefined;
        gas?: bigint | undefined;
        store?: Store.Store | undefined;
        signal?: AbortSignal | undefined;
        maxFeePerGas?: bigint | undefined;
    };
}
/** Builds a complete preview within the metadata lookup budget. @internal */
export declare function buildBalanceDiffs(client: Client, options: buildBalanceDiffs.Options): Promise<{
    [x: string]: Capabilities.BalanceDiff[];
} | undefined>;
export declare namespace buildBalanceDiffs {
    type Options = {
        account: Address;
        store?: Store.Store | undefined;
        signal?: AbortSignal | undefined;
        logs: Log[];
        tokenMetadata: Record<Address, {
            name: string;
            symbol: string;
            currency: string;
        }>;
    };
}
//# sourceMappingURL=simulate.d.ts.map