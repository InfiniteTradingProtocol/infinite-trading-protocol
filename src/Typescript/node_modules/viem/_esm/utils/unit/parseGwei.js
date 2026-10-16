import * as Value from './Value.js';
/**
 * Converts a string representation of gwei to numerical wei.
 *
 * - Docs: https://viem.sh/docs/utilities/parseGwei
 *
 * @example
 * import { parseGwei } from 'viem'
 *
 * parseGwei('420')
 * // 420000000000n
 */
export function parseGwei(ether, unit = 'wei') {
    return Value.fromGwei(ether, unit);
}
//# sourceMappingURL=parseGwei.js.map