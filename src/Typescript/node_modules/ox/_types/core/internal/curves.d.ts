/**
 * Curve constants, inlined so that modules needing nothing but an order do not
 * pull a curve implementation into the bundle.
 *
 * These are fixed by the curve specifications and are asserted against
 * `@noble/curves` in `src/core/_test/curves.test.ts`.
 *
 * @internal
 */
/**
 * Order of the secp256r1 (P-256) curve.
 *
 * @see https://www.secg.org/sec2-v2.pdf
 * @internal
 */
export declare const p256N = 115792089210356248762697446949407573529996955224135760342422259061068512044369n;
/** Order of the secp256k1 curve. @internal */
export declare const secp256k1N = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;
//# sourceMappingURL=curves.d.ts.map