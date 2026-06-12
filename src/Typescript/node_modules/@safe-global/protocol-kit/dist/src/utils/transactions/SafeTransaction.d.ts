import { SafeSignature, SafeTransaction, SafeTransactionData } from '@safe-global/types-kit';
declare class EthSafeTransaction implements SafeTransaction {
    data: SafeTransactionData;
    signatures: Map<string, SafeSignature>;
    constructor(data: SafeTransactionData);
    getSignature(signer: string): SafeSignature | undefined;
    addSignature(signature: SafeSignature): void;
    encodedSignatures(): string;
}
export default EthSafeTransaction;
