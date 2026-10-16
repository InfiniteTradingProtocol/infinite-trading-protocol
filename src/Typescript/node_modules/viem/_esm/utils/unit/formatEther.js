import * as Value from './Value.js';
/**
 * Converts numerical wei to a string representation of ether.
 *
 * - Docs: https://viem.sh/docs/utilities/formatEther
 *
 * @example
 * import { formatEther } from 'viem'
 *
 * formatEther(1000000000000000000n)
 * // '1'
 */
export function formatEther(wei, unit = 'wei') {
    return Value.formatEther(wei, unit);
}
//# sourceMappingURL=formatEther.js.map