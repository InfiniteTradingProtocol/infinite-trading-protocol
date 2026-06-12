import { SafeContractImplementationType } from '../types';
import SafeContract_v1_0_0 from '../contracts/Safe/v1.0.0/SafeContract_v1_0_0';
import SafeContract_v1_1_1 from '../contracts/Safe/v1.1.1/SafeContract_v1_1_1';
import SafeContract_v1_2_0 from '../contracts/Safe/v1.2.0/SafeContract_v1_2_0';
import SafeContract_v1_3_0 from '../contracts/Safe/v1.3.0/SafeContract_v1_3_0';
import SafeContract_v1_4_1 from '../contracts/Safe/v1.4.1/SafeContract_v1_4_1';
export declare enum SAFE_FEATURES {
    SAFE_TX_GAS_OPTIONAL = "SAFE_TX_GAS_OPTIONAL",
    SAFE_TX_GUARDS = "SAFE_TX_GUARDS",
    SAFE_FALLBACK_HANDLER = "SAFE_FALLBACK_HANDLER",
    ETH_SIGN = "ETH_SIGN",
    ACCOUNT_ABSTRACTION = "ACCOUNT_ABSTRACTION",
    REQUIRED_TXGAS = "REQUIRED_TXGAS",
    SIMULATE_AND_REVERT = "SIMULATE_AND_REVERT",
    PASSKEY_SIGNER = "PASSKEY_SIGNER",
    SAFE_L2_CONTRACTS = "SAFE_L2_CONTRACTS"
}
export declare const hasSafeFeature: (feature: SAFE_FEATURES, version: string) => boolean;
export type SafeContractCompatibleWithFallbackHandler = SafeContract_v1_1_1 | SafeContract_v1_2_0 | SafeContract_v1_3_0 | SafeContract_v1_4_1;
export type SafeContractCompatibleWithGuardManager = SafeContract_v1_3_0 | SafeContract_v1_4_1;
export type SafeContractCompatibleWithModuleManager = SafeContract_v1_3_0 | SafeContract_v1_4_1;
export type SafeContractCompatibleWithRequiredTxGas = SafeContract_v1_0_0 | SafeContract_v1_1_1 | SafeContract_v1_2_0;
export type SafeContractCompatibleWithSimulateAndRevert = SafeContract_v1_3_0 | SafeContract_v1_4_1;
export declare function isSafeContractCompatibleWithRequiredTxGas(safeContract: SafeContractImplementationType): Promise<SafeContractCompatibleWithRequiredTxGas>;
export declare function isSafeContractCompatibleWithSimulateAndRevert(safeContract: SafeContractImplementationType): Promise<SafeContractCompatibleWithSimulateAndRevert>;
