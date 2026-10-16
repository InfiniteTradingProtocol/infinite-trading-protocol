import type { Client } from '../../clients/createClient.js';
import type { Hints } from './errors.js';
export declare function toExecutionError(cause: unknown, options: {
    client: Client;
    hints?: Hints | undefined;
    parameters: Record<string, any>;
}): Promise<unknown>;
//# sourceMappingURL=resolveError.d.ts.map