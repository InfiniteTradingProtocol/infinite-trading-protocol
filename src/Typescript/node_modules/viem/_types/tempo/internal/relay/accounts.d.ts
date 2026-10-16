import { AccountConfig, AccountOperation } from 'ox/tempo';
import { createClient } from '../../../clients/createClient.js';
import type * as Relay from '../../Relay.js';
/** Creates middleware for owner approval coordination. @internal */
export declare function create(options: Relay.accounts.Options): Relay.accounts.ReturnType;
/** Reads and validates a config commitment at one block. @internal */
export declare function validateConfig(options: {
    account: `0x${string}`;
    blockNumber: bigint;
    client: ReturnType<typeof createClient>;
    config: AccountConfig.Config;
}): Promise<`0x${string}`>;
/** Validates primitive approvals and translates invalid input into an RPC error. @internal */
export declare function selectApprovals(options: AccountOperation.selectApprovals.Options): Promise<AccountOperation.selectApprovals.ReturnValue>;
//# sourceMappingURL=accounts.d.ts.map