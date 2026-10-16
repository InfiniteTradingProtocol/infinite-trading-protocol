import { defineToken } from '../defineToken.js';
/**
 * [Open USD](https://joinopenstandard.com/) token, with canonical contract
 * addresses on Ethereum, Tempo, and Base.
 *
 * @example
 * ```ts
 * import { ousd } from 'viem/tokens'
 *
 * ousd(4217)
 * // { address: '0x20c0000000000000000000006a37DA5C996874BE', ... }
 * ```
 */
export declare const ousd: defineToken.ReturnType<{
    readonly addresses: {
        readonly 1: "0x9f6F3991D525015a6F8CaF062C83b62fD3AC4436";
        readonly 4217: "0x20c0000000000000000000006a37DA5C996874BE";
        readonly 8453: "0xB2000000000000000000002fEb517dFeC7415344";
    };
    readonly currency: "USD";
    readonly decimals: 6;
    readonly name: "OpenUSD";
    readonly popular: true;
    readonly symbol: "OUSD";
}>;
//# sourceMappingURL=ousd.d.ts.map