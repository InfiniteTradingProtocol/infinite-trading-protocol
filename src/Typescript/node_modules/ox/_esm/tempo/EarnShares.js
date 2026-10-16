import * as Errors from '../core/Errors.js';
/** Basis-point denominator used by slippage bounds. */
export const basisPointScale = 10_000;
/**
 * Converts venue shares to a vault share amount at the anchor rate, rounding down.
 *
 * Mirrors `VaultAdapter.sharesToTokens`.
 *
 * @example
 * ```ts twoslash
 * import { EarnShares } from 'ox/tempo'
 *
 * const shareAmount = EarnShares.toAmount(
 *   { engineShares: 3n, shareSupply: 2n },
 *   7n,
 * )
 * // @log: 4n
 * ```
 *
 * @param anchor - The conversion anchor.
 * @param venueShareAmount - Venue share amount, base units.
 * @returns Vault share amount, rounded down.
 */
export function toAmount(anchor, venueShareAmount) {
    return (venueShareAmount * anchor.shareSupply) / anchor.engineShares;
}
/**
 * Converts venue shares to a vault share amount at the anchor rate, rounding up.
 *
 * Mirrors the adapter's ceiling conversion used by exact-asset exits.
 *
 * @example
 * ```ts twoslash
 * import { EarnShares } from 'ox/tempo'
 *
 * const shareAmount = EarnShares.toAmountUp(
 *   { engineShares: 3n, shareSupply: 2n },
 *   7n,
 * )
 * // @log: 5n
 * ```
 *
 * @param anchor - The conversion anchor.
 * @param venueShareAmount - Venue share amount, base units.
 * @returns Vault share amount, rounded up.
 */
export function toAmountUp(anchor, venueShareAmount) {
    const { engineShares, shareSupply } = anchor;
    return (venueShareAmount * shareSupply + engineShares - 1n) / engineShares;
}
/**
 * Converts a vault share amount to venue shares at the anchor rate, rounding down.
 *
 * Mirrors `VaultAdapter.tokensToShares`.
 *
 * @example
 * ```ts twoslash
 * import { EarnShares } from 'ox/tempo'
 *
 * const venueShareAmount = EarnShares.toVenueAmount(
 *   { engineShares: 3n, shareSupply: 2n },
 *   7n,
 * )
 * // @log: 10n
 * ```
 *
 * @param anchor - The conversion anchor.
 * @param shareAmount - Vault share amount, base units.
 * @returns Venue share amount, rounded down.
 */
export function toVenueAmount(anchor, shareAmount) {
    return (shareAmount * anchor.engineShares) / anchor.shareSupply;
}
/**
 * Computes the dilution-correct vault shares minted for an asset-denominated fee.
 *
 * Mirrors `FeeMath`:
 * `feeShares = floor(fee * shareSupply / (activeAssets - fee))`, zero when the
 * fee is zero or not smaller than the active assets. Minting this amount to the
 * fee ledger prices the fee at post-mint value per share.
 *
 * @example
 * ```ts twoslash
 * import { EarnShares } from 'ox/tempo'
 *
 * const shares = EarnShares.feeShares({
 *   activeAssets: 1_100n,
 *   shareSupply: 1_000n,
 *   totalFeeAssets: 100n,
 * })
 * // @log: 100n
 * ```
 *
 * @param options - Fee accrual inputs.
 * @returns Vault shares to mint for the fee, rounded down.
 */
export function feeShares(options) {
    const { activeAssets, shareSupply, totalFeeAssets } = options;
    if (totalFeeAssets === 0n || totalFeeAssets >= activeAssets)
        return 0n;
    return (totalFeeAssets * shareSupply) / (activeAssets - totalFeeAssets);
}
/**
 * Lowers an expected output by a basis-point slippage tolerance, flooring to `1n`.
 *
 * Suitable for lower bounds such as a deposit's minimum shares or a redeem's
 * minimum assets; not for upper bounds such as an exact withdrawal's maximum
 * shares.
 *
 * @example
 * ```ts twoslash
 * import { EarnShares } from 'ox/tempo'
 *
 * const minimumShares = EarnShares.minimumOutput(1_000_000n, 50)
 * // @log: 995_000n
 * ```
 *
 * @param expectedAmount - Expected output in base units.
 * @param slippageBps - Allowed slippage in basis points from `0` through `9_999`.
 * @returns The minimum accepted output, floored to `1n`.
 * @throws `InvalidExpectedOutputError` when `expectedAmount` is not positive.
 * @throws `InvalidSlippageError` when `slippageBps` is outside its valid range.
 */
export function minimumOutput(expectedAmount, slippageBps) {
    if (expectedAmount <= 0n)
        throw new InvalidExpectedOutputError({ expectedAmount });
    if (!Number.isInteger(slippageBps) ||
        slippageBps < 0 ||
        slippageBps >= basisPointScale)
        throw new InvalidSlippageError({ slippageBps });
    const scale = BigInt(basisPointScale);
    const bounded = (expectedAmount * (scale - BigInt(slippageBps))) / scale;
    return bounded === 0n ? 1n : bounded;
}
/**
 * Error thrown when an expected output is not positive.
 */
export class InvalidExpectedOutputError extends Errors.BaseError {
    constructor(options) {
        super(`Expected output \`${options.expectedAmount}\` must be greater than zero.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'EarnShares.InvalidExpectedOutputError'
        });
    }
}
/**
 * Error thrown when a slippage tolerance is not an integer from `0` through `9_999`.
 */
export class InvalidSlippageError extends Errors.BaseError {
    constructor(options) {
        super(`Slippage tolerance \`${options.slippageBps}\` is invalid.`, {
            metaMessages: [
                `Slippage must be a whole number from 0 through ${basisPointScale - 1} basis points.`,
            ],
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'EarnShares.InvalidSlippageError'
        });
    }
}
//# sourceMappingURL=EarnShares.js.map