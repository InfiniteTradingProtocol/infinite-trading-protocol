import type { Address } from 'abitype';
import type { Client } from '../../../clients/createClient.js';
import type { Call } from '../../../types/calls.js';
export declare function resolveVirtualAddresses(client: Client, options: {
    calls: readonly Call[];
}): Promise<Record<Address, Address | null> | undefined>;
export declare function getVirtualAddressTargets(calls: readonly Call[]): readonly Address[];
export declare function extractCalls(transaction: Record<string, unknown>): readonly Call[];
//# sourceMappingURL=virtualAddress.d.ts.map