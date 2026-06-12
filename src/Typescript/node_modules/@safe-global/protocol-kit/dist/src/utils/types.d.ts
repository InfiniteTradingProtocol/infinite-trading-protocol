import { SafeConfig, SafeConfigWithPredictedSafe } from '../types';
import { Hex, Hash, Chain } from 'viem';
export declare function isSafeConfigWithPredictedSafe(config: SafeConfig): config is SafeConfigWithPredictedSafe;
export declare function asHash(hash: string): Hash;
export declare function asHex(hex?: string): Hex;
export declare function getChainById(chainId: bigint): Chain | undefined;
