export declare const roles: readonly ["defaultAdmin", "pause", "unpause", "issuer", "burnBlocked", "burnAt"];
export type TokenRole = (typeof roles)[number];
export declare const toPreHashed: {
    readonly defaultAdmin: "DEFAULT_ADMIN_ROLE";
    readonly pause: "PAUSE_ROLE";
    readonly unpause: "UNPAUSE_ROLE";
    readonly issuer: "ISSUER_ROLE";
    readonly burnBlocked: "BURN_BLOCKED_ROLE";
    readonly burnAt: "BURN_AT_ROLE";
};
/**
 * Serializes a token role to its keccak256 hash representation.
 *
 * TIP-20 includes a built-in RBAC system with roles like `ISSUER_ROLE` (mint/burn),
 * `PAUSE_ROLE`/`UNPAUSE_ROLE` (emergency controls), `BURN_BLOCKED_ROLE` (compliance), and
 * `BURN_AT_ROLE` (burn from any unprotected account, T12+).
 *
 * [TIP-20 RBAC](https://docs.tempo.xyz/protocol/tip20/overview#role-based-access-control-rbac)
 *
 * @example
 * ```ts twoslash
 * import { TokenRole } from 'ox/tempo'
 *
 * const hash = TokenRole.serialize('issuer')
 * ```
 *
 * @param role - The token role to serialize.
 * @returns The keccak256 hash of the role.
 */
export declare function serialize(role: TokenRole): `0x${string}`;
//# sourceMappingURL=TokenRole.d.ts.map