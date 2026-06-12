import { SafeSignature } from '@safe-global/types-kit';
export declare class EthSafeSignature implements SafeSignature {
    signer: string;
    data: string;
    isContractSignature: boolean;
    /**
     * Creates an instance of a Safe signature.
     *
     * @param signer - Ethers signer
     * @param signature - The Safe signature
     * @returns The Safe signature instance
     */
    constructor(signer: string, signature: string, isContractSignature?: boolean);
    /**
     * Returns the static part of the Safe signature.
     *
     * @returns The static part of the Safe signature
     */
    staticPart(dynamicOffset?: string): string;
    /**
     * Returns the dynamic part of the Safe signature.
     *
     * @returns The dynamic part of the Safe signature
     */
    dynamicPart(): string;
}
