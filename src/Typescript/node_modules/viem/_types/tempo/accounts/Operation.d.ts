import type * as Hex from 'ox/Hex';
import { AccountOperation, TxEnvelopeTempo } from 'ox/tempo';
import { BaseError } from '../../errors/base.js';
import type * as Store from '../Store.js';
/** Reads a persisted account operation. */
export declare function read(store: Store.Store, hash: Hex.Hex): Promise<AccountOperation.Operation | null>;
/** Atomically updates an account operation. */
export declare function update(store: Store.Atomic, hash: Hex.Hex, update: (operation: AccountOperation.Operation | null) => AccountOperation.Operation | Promise<AccountOperation.Operation>): Promise<AccountOperation.Operation>;
/** Reads a submission hash without rebuilding its envelope from mutable configurations. */
export declare function readSubmission(store: Store.Store, operation: AccountOperation.TransactionOperation, submissionId: Hex.Hex): Promise<Hex.Hex | null>;
/** Removes a persisted final envelope after its submission is settled. */
export declare function removeSubmission(store: Store.Store, hash: Hex.Hex, submissionId: Hex.Hex): Promise<void>;
/** Persists the final envelope before broadcast so recovery uses the exact transaction. */
export declare function writeSubmission(store: Store.Atomic, hash: Hex.Hex, submissionId: Hex.Hex, transaction: TxEnvelopeTempo.Serialized): Promise<void>;
/** Thrown when a stored account operation is malformed or unsupported. */
export declare class InvalidStoreValueError extends BaseError {
    /** Creates an invalid store value error. */
    constructor(options?: InvalidStoreValueError.Options);
}
export declare namespace InvalidStoreValueError {
    /** Error construction options. */
    type Options = {
        /** Underlying error. */
        cause?: unknown | undefined;
    };
}
//# sourceMappingURL=Operation.d.ts.map