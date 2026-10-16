import type { AbiError, Address } from 'abitype';
import type { Hex } from 'ox';
import { BaseError } from '../errors/base.js';
import type * as accessKey from './actions/accessKey.js';
import type * as amm from './actions/amm.js';
import type * as channel from './actions/channel.js';
import type * as dex from './actions/dex.js';
import type * as fee from './actions/fee.js';
import type * as nonce from './actions/nonce.js';
import type * as policy from './actions/policy.js';
import type * as token from './actions/token.js';
import type * as ExecutionError from './ExecutionError.js';
export type GetVaultEngineChangedErrorType = GetVaultEngineChangedError & {
    name: 'GetVaultEngineChangedError';
};
export declare class GetVaultEngineChangedError extends BaseError {
    constructor({ vault }: {
        vault: Address;
    });
}
export type WaitForPrivateDepositTimeoutErrorType = WaitForPrivateDepositTimeoutError & {
    name: 'WaitForPrivateDepositTimeoutError';
};
/** Thrown when a Zone gateway deposit event is not found before the timeout. */
export declare class WaitForPrivateDepositTimeoutError extends BaseError {
    constructor({ actionId, gateway }: {
        actionId: Hex.Hex;
        gateway: Address;
    });
}
export type WaitForTempoBlockTimeoutErrorType = WaitForTempoBlockTimeoutError & {
    name: 'WaitForTempoBlockTimeoutError';
};
export declare class WaitForTempoBlockTimeoutError extends BaseError {
    constructor({ tempoBlockNumber }: {
        tempoBlockNumber: bigint;
    });
}
export type WaitForPrivateRedeemTimeoutErrorType = WaitForPrivateRedeemTimeoutError & {
    name: 'WaitForPrivateRedeemTimeoutError';
};
/** Thrown when a Zone gateway redeem event is not found before the timeout. */
export declare class WaitForPrivateRedeemTimeoutError extends BaseError {
    constructor({ actionId, gateway }: {
        actionId: Hex.Hex;
        gateway: Address;
    });
}
export type InvalidFeeTokenErrorType = InvalidFeeTokenError & {
    name: 'InvalidFeeTokenError';
};
export declare class InvalidFeeTokenError extends BaseError {
    constructor({ cause, token, }: {
        cause?: BaseError | Error | undefined;
        token: string;
    });
}
export type FeeTokenNotTip20ErrorType = FeeTokenNotTip20Error & {
    name: 'FeeTokenNotTip20Error';
};
export declare class FeeTokenNotTip20Error extends BaseError {
    constructor({ token }: {
        token: string;
    });
}
export type FeeTokenNotUsdErrorType = FeeTokenNotUsdError & {
    name: 'FeeTokenNotUsdError';
};
export declare class FeeTokenNotUsdError extends BaseError {
    constructor({ currency, token, }: {
        currency: string;
        token: string;
    });
}
export type FeeTokenPausedErrorType = FeeTokenPausedError & {
    name: 'FeeTokenPausedError';
};
export declare class FeeTokenPausedError extends BaseError {
    constructor({ token }: {
        token: string;
    });
}
/**
 * Errors thrown by Tempo actions for decoded Tempo precompile errors. Narrow with `error.name`,
 * then `error.errorName` for the base `TempoExecutionError`.
 */
export type ExecutionErrorType = TempoExecutionErrorType | accessKey.ExecutionErrorType | amm.ExecutionErrorType | channel.ExecutionErrorType | dex.ExecutionErrorType | fee.ExecutionErrorType | nonce.ExecutionErrorType | policy.ExecutionErrorType | token.ExecutionErrorType;
/** Union of `TempoExecutionError` per decoded error, so `errorName` narrows `args`. */
export type TempoExecutionErrorType<decoded extends TempoExecutionError.Decoded = TempoExecutionError.Decoded> = decoded extends TempoExecutionError.Decoded ? TempoExecutionError<decoded> & {
    name: 'TempoExecutionError';
} : never;
/** Thrown when a Tempo action fails with a decoded Tempo precompile error. */
export declare class TempoExecutionError<decoded extends TempoExecutionError.Decoded = TempoExecutionError.Decoded> extends BaseError {
    /** ABI item of the error. */
    abiItem: AbiError;
    /** Decoded error arguments, when the revert data carried them. */
    args: decoded['args'];
    /** Revert data, or the error selector when only the name is known. */
    data: Hex.Hex;
    /** Error name from `Abis.coreErrors`. */
    errorName: decoded['errorName'];
    /** Steps to resolve the error. */
    hints: readonly string[];
    constructor({ cause, error, hints }: TempoExecutionError.Parameters, { details, docsPath, name, shortMessage, }?: TempoExecutionError.Options);
}
export declare namespace TempoExecutionError {
    /** Decoded Tempo error, optionally narrowed to `name`. */
    type Decoded<name extends string = string> = Extract<Exclude<ExecutionError.ExecutionError, {
        errorName: 'unknown';
    }>, {
        errorName: name;
    }>;
    /** Name of any decoded Tempo error. */
    type ErrorName = Decoded['errorName'];
    /** Message options for subclasses. */
    type Options = {
        /** Rows printed below the short message. Empty values are omitted. */
        details?: Record<string, unknown> | undefined;
        /** Documentation path. */
        docsPath?: string | undefined;
        /** Error name. Defaults to `TempoExecutionError`. */
        name?: string | undefined;
        /** Short message. Defaults to the decoded error message. */
        shortMessage?: string | undefined;
    };
    /** Constructor parameters. */
    type Parameters = {
        /** Original error. */
        cause: BaseError;
        /** Decoded Tempo error. */
        error: Decoded;
        /** Steps to resolve the error. */
        hints: readonly string[];
    };
}
//# sourceMappingURL=errors.d.ts.map