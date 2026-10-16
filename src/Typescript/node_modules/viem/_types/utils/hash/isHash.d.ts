import type { ErrorType } from '../../errors/utils.js';
import type { Hex } from '../../types/misc.js';
import { type IsHexErrorType } from '../data/isHex.js';
export type IsHashErrorType = IsHexErrorType | ErrorType;
export declare function isHash(hash: string): hash is Hex;
//# sourceMappingURL=isHash.d.ts.map