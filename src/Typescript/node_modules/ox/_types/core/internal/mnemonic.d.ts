import type * as Bytes from '../Bytes.js';
import * as Hex from '../Hex.js';
/** @internal */
export declare function toPrivateKey<as extends 'Bytes' | 'Hex' = 'Bytes'>(mnemonic: string, options?: {
    as?: as | undefined;
    passphrase?: string | undefined;
    path?: string | undefined;
}): (as extends 'Bytes' ? Bytes.Bytes : never) | (as extends 'Hex' ? Hex.Hex : never);
/** @internal */
export declare function toSeed(mnemonic: string, options?: {
    passphrase?: string | undefined;
}): Bytes.Bytes;
//# sourceMappingURL=mnemonic.d.ts.map