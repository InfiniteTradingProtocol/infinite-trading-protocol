import type { Address } from 'abitype';
import { type Hex } from 'ox';
/** Derives a user withdrawal sender tag. @internal */
export declare function from(options: from.Options): Hex.Hex;
export declare namespace from {
    type Options = {
        fallbackNonce: bigint;
        sender: Address;
        transactionHash: Hex.Hex;
    };
}
//# sourceMappingURL=WithdrawalSenderTag.d.ts.map