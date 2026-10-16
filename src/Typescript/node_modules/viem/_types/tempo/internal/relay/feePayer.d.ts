import type { Address } from 'abitype';
import { type Hex } from 'ox';
import type { LocalAccount } from '../../../accounts/types.js';
import type * as Relay from '../../Relay.js';
import * as Transaction from '../../Transaction.js';
export declare function create(options: Relay.feePayer.Options): Relay.Plugin;
/** Checks a prepared transaction with its chain ID. Rejected fills fall back to sender payment; rejected raw submissions return a refusal. */
export type Validate = (request: Transaction.TransactionRequest & {
    chainId?: number | Hex.Hex | undefined;
}) => Validation | Promise<Validation>;
/** A sponsorship verdict: `true` sponsors; `false` or a named reason refuses. */
export type Validation = boolean | 'billing_past_due' | 'billing_required' | 'fee_token_unsupported' | 'spend_limit_exceeded' | 'tx_fee_limit_exceeded';
/** Details recorded for a sponsored transaction. */
export type SponsorshipDetails = {
    /** Whether Tempo subsidizes the sponsorship instead of charging the API-key organization. */
    subsidized: boolean;
};
/** Signs a filled transaction as the fee payer. */
export declare function sign(options: sign.Options): Promise<{
    transaction: {
        feePayerSignature: {
            r: bigint;
            s: bigint;
            yParity: number;
        };
        from: `0x${string}` | undefined;
    };
    sponsorshipDetails?: SponsorshipDetails;
}>;
export declare namespace sign {
    type Options = {
        /** Abort signal for the enclosing fill. */
        signal?: AbortSignal | undefined;
        /** Account used as the fee payer. */
        account: LocalAccount;
        /** Called once the fee payer has signed the fill. Awaited: a throw aborts the fill. */
        onSponsored?: ((event: SponsoredEvent) => SponsorshipDetails | Promise<SponsorshipDetails | void> | void) | undefined;
        /** Filled transaction to sign. */
        transaction: Record<string, unknown>;
        /** Sender address from the original request. */
        sender?: Address | undefined;
    };
}
/** Facts of one sponsorship commitment, emitted at fee-payer signing time. */
export type SponsoredEvent = {
    /** Chain the sponsored transaction targets. */
    chainId: number;
    /** Fee token the sponsorship resolved, when known. */
    feeToken?: Address | undefined;
    /** Method that triggered sponsorship: a fill (intent) or a raw submission. */
    method: 'eth_fillTransaction' | 'eth_signRawTransaction' | 'eth_sendRawTransaction' | 'eth_sendRawTransactionSync';
    /** Transaction sender. */
    sender: Address;
    /** Fee-payer sign payload: a stable identity for the sponsored envelope. */
    signPayload: Hex.Hex;
    /** Serialized sponsored transaction (sender-unsigned for fill intents). */
    transaction: Hex.Hex;
    /** Transaction hash (keccak256 of the signed envelope); absent for fill intents, whose senders have not signed yet. */
    transactionHash?: Hex.Hex | undefined;
};
export declare namespace ExternalFeePayerUrl {
    type Options = {
        /** Whether to allow non-HTTPS or local/private external fee payer URLs. */
        allowUnsafe?: boolean | undefined;
    };
    /** Normalizes external fee-payer relay URLs before forwarding fill payloads. */
    export function normalize(value: string, options?: Options): string;
    export {};
}
//# sourceMappingURL=feePayer.d.ts.map