import { type Client } from '../../../clients/createClient.js';
import type * as Relay from '../../Relay.js';
export type Result = {
    tx: Record<string, unknown>;
    capabilities?: Record<string, unknown> | undefined;
    sponsor?: unknown;
};
/** Compose middleware and execute post-fill hooks once for the selected result. */
export declare function compose(downstream: Relay.handleRequest.Handler, options?: Relay.handleRequest.Options, resolveClient?: ((chainId: number) => {
    chain: {
        id: number;
    };
}) | undefined): Relay.handleRequest.Handler;
/** Normalize a downstream fill without discarding capabilities added by other plugins. */
export declare function fill(client: Client, transaction: Record<string, unknown>, options?: Relay.handleRequest.RequestOptions): Promise<Result>;
//# sourceMappingURL=request.d.ts.map