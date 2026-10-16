import { isHex } from '../data/isHex.js';
export function isHash(hash) {
    return isHex(hash) && hash.length === 66;
}
//# sourceMappingURL=isHash.js.map