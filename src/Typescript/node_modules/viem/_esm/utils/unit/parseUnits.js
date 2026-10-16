import * as Value from './Value.js';
/**
 * Multiplies a string representation of a number by a given exponent of base 10 (10exponent).
 *
 * - Docs: https://viem.sh/docs/utilities/parseUnits
 *
 * @example
 * import { parseUnits } from 'viem'
 *
 * parseUnits('420', 9)
 * // 420000000000n
 */
export function parseUnits(value, decimals) {
    return Value.from(value, decimals);
}
//# sourceMappingURL=parseUnits.js.map