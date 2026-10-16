import type { Client } from '../../../clients/createClient.js';
import * as ExecutionError from '../../ExecutionError.js';
import type * as Store from './cache.js';
/** Distinguishes execution reverts from transport and plugin failures. */
export declare function isExecutionError(error: unknown): error is Error;
export declare function formatError(error: Error, parameters: Record<string, unknown>, client: Client, simulateStore?: Store.Store): Promise<{
    tx: {
        from: unknown;
        to: {} | null;
        gas: string;
        nonce: string;
        value: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
    };
    capabilities: {
        virtualAddresses?: Record<`0x${string}`, `0x${string}` | null>;
        balanceDiffs: {
            [x: string]: import("../../Capabilities.js").BalanceDiff[];
        } | undefined;
        error: ExecutionError.Rpc;
        insufficientFunds: {
            amount: `0x${string}`;
            decimals: number;
            formatted: string;
            token: `0x${string}`;
            symbol: string;
        } | undefined;
        sponsored: boolean;
    };
} | {
    tx: {
        from: unknown;
        to: {} | null;
        gas: string;
        nonce: string;
        value: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
    };
    capabilities: {
        virtualAddresses?: Record<`0x${string}`, `0x${string}` | null>;
        error: ExecutionError.Rpc;
        sponsored: boolean;
    };
}>;
//# sourceMappingURL=error.d.ts.map