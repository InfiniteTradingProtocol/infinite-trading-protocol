import * as Errors from '../Errors.js';
import * as Hex from '../Hex.js';
/**
 * Asserts keyed nonce constraints.
 * @internal
 */
export declare function assert(keys: readonly bigint[], nonce?: bigint): void;
/**
 * Decodes and validates RPC nonce keys and their shared sequence.
 * @internal
 */
export declare function fromRpc(keys: readonly Hex.Hex[], nonce?: Hex.Hex): readonly bigint[];
/**
 * Encodes and validates nonce keys and their shared sequence.
 * @internal
 */
export declare function toRpc(keys: readonly (Hex.Hex | bigint | number)[], nonce?: Hex.Hex | bigint | number): readonly Hex.Hex[];
export declare class InvalidError extends Errors.BaseError {
    readonly name = "FrameNonce.InvalidError";
}
//# sourceMappingURL=frameNonce.d.ts.map