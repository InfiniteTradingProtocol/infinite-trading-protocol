import { SignatureEnvelope } from 'ox/tempo';
/** Parses a primitive owner approval. */
export function parseApproval(signature) {
    const approval = SignatureEnvelope.from(signature);
    if (approval.type === 'configurable' || approval.type === 'keychain')
        throw new Error('Configurable account owners must use primitive signatures.');
    return approval;
}
//# sourceMappingURL=Signature.js.map