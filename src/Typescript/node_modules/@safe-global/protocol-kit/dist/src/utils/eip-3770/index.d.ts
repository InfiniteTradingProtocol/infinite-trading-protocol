import { Eip3770Address } from '@safe-global/types-kit';
export declare function parseEip3770Address(fullAddress: string): Eip3770Address;
export declare function getEip3770NetworkPrefixFromChainId(chainId: bigint): string;
export declare function isValidEip3770NetworkPrefix(prefix: string): boolean;
export declare function validateEip3770NetworkPrefix(prefix: string, currentChainId: bigint): void;
export declare function validateEthereumAddress(address: string): void;
export declare function validateEip3770Address(fullAddress: string, currentChainId: bigint): Eip3770Address;
