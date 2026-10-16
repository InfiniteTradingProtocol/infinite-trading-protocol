import type { Address } from 'abitype';
import type { Client } from '../../../clients/createClient.js';
/** Reads fee preferences, liquid fee-token balances, and virtual masters in one RPC request. */
export declare function read(client: Client, options: {
    account?: Address | undefined;
    tokens?: readonly Address[] | undefined;
    targets?: readonly Address[] | undefined;
}): Promise<{
    preferredToken: `0x${string}`;
    preferredBalance: bigint;
    balances: {
        address: `0x${string}`;
        balance: bigint;
    }[];
    virtualAddresses: Record<`0x${string}`, `0x${string}` | null> | undefined;
}>;
//# sourceMappingURL=preflight.d.ts.map