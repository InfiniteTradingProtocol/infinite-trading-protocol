import * as Errors from '../core/Errors.js';
declare const chainIdConfig: {
    readonly 4217: {
        readonly base: 421700000;
        readonly range: 1002610000;
    };
    readonly 42431: {
        readonly base: 1424310000;
        readonly range: 723173648;
    };
};
/**
 * Base offset for deriving Presto zone chain IDs.
 */
export declare const chainIdBase: 421700000;
/** Tempo source chain ID. */
export type SourceId = keyof typeof chainIdConfig;
/**
 * Derives a zone ID from a zone chain ID.
 *
 * Zone chain IDs use the base assigned to their Tempo source chain.
 *
 * @example
 * ```ts twoslash
 * import { ZoneId } from 'ox/tempo'
 *
 * const zoneId = ZoneId.fromChainId(421_700_001)
 * // @log: 1
 * ```
 *
 * @param chainId - The zone chain ID.
 * @param sourceId - The Tempo source chain ID. Defaults to `4217` (Presto).
 * @returns The zone ID.
 */
export declare function fromChainId(chainId: number, sourceId?: SourceId): number;
export declare namespace fromChainId {
    type ErrorType = typeof UnsupportedSourceIdError | Errors.GlobalErrorType;
}
/**
 * Derives a zone chain ID from a zone ID.
 *
 * Zone chain IDs use the base and range assigned to their Tempo source chain.
 *
 * @example
 * ```ts twoslash
 * import { ZoneId } from 'ox/tempo'
 *
 * const chainId = ZoneId.toChainId(1)
 * // @log: 421700001
 * ```
 *
 * @param zoneId - The zone ID.
 * @param sourceId - The Tempo source chain ID. Defaults to `4217` (Presto).
 * @returns The zone chain ID.
 */
export declare function toChainId(zoneId: number, sourceId?: SourceId): number;
export declare namespace toChainId {
    type ErrorType = typeof UnsupportedSourceIdError | Errors.GlobalErrorType;
}
/** Thrown when a Tempo source chain ID is unsupported. */
export declare class UnsupportedSourceIdError extends Errors.BaseError {
    readonly name = "ZoneId.UnsupportedSourceIdError";
    constructor({ sourceId }: {
        sourceId: number;
    });
}
export {};
//# sourceMappingURL=ZoneId.d.ts.map