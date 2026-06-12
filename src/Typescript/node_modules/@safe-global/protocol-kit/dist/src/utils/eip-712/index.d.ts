import { EIP712MessageTypes, EIP712TxTypes, EIP712TypedData, SafeEIP712Args, EIP712TypedDataMessage, EIP712TypedDataTx } from '@safe-global/types-kit';
export declare const EIP712_DOMAIN_BEFORE_V130: {
    type: string;
    name: string;
}[];
export declare const EIP712_DOMAIN: {
    type: string;
    name: string;
}[];
export declare function getEip712TxTypes(safeVersion: string): EIP712TxTypes;
export declare function getEip712MessageTypes(safeVersion: string): EIP712MessageTypes;
export declare const hashTypedData: (typedData: EIP712TypedData) => string;
export declare const hashSafeMessage: (message: string | EIP712TypedData) => string;
export declare function generateTypedData({ safeAddress, safeVersion, chainId, data }: SafeEIP712Args): EIP712TypedDataTx | EIP712TypedDataMessage;
