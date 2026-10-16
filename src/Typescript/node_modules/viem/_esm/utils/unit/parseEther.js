import * as Value from './Value.js';
/**
 * Converts a string representation of ether to numerical wei.
 *
 * - Docs: https://viem.sh/docs/utilities/parseEther
 *
 * @example
 * import { parseEther } from 'viem'
 *
 * parseEther('420')
 * // 420000000000000000000n
 */
export function parseEther(ether, unit = 'wei') {
    return Value.fromEther(ether, unit);
}
//# sourceMappingURL=parseEther.js.map