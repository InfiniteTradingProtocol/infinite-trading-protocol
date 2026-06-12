import SafeProvider from '../../SafeProvider';
import { SafeSignature, SafeEIP712Args, SafeTransactionData } from '@safe-global/types-kit';
import { SigningMethod } from '../../types';
export declare function generatePreValidatedSignature(ownerAddress: string): SafeSignature;
export declare function isTxHashSignedWithPrefix(txHash: string, signature: string, ownerAddress: string): Promise<boolean>;
type AdjustVOverload = {
    (signingMethod: SigningMethod.ETH_SIGN_TYPED_DATA, signature: string): Promise<string>;
    (signingMethod: SigningMethod.ETH_SIGN, signature: string, safeTxHash: string, sender: string): Promise<string>;
};
export declare const adjustVInSignature: AdjustVOverload;
export declare function generateSignature(safeProvider: SafeProvider, hash: string): Promise<SafeSignature>;
export declare function generateEIP712Signature(safeProvider: SafeProvider, safeEIP712Args: SafeEIP712Args, methodVersion?: 'v3' | 'v4'): Promise<SafeSignature>;
export declare const buildContractSignature: (signatures: SafeSignature[], signerSafeAddress: string) => Promise<SafeSignature>;
export declare const buildSignatureBytes: (signatures: SafeSignature[]) => string;
export declare const preimageSafeTransactionHash: (safeAddress: string, safeTx: SafeTransactionData, safeVersion: string, chainId: bigint) => string;
export declare const preimageSafeMessageHash: (safeAddress: string, message: string, safeVersion: string, chainId: bigint) => string;
export declare const calculateSafeTransactionHash: (safeAddress: string, safeTx: SafeTransactionData, safeVersion: string, chainId: bigint) => string;
export declare const calculateSafeMessageHash: (safeAddress: string, message: string, safeVersion: string, chainId: bigint) => string;
export {};
