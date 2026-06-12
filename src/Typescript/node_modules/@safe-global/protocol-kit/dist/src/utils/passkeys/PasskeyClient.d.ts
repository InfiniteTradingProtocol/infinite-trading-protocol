import { Client } from 'viem';
import { PasskeyArgType, PasskeyClient, SafeWebAuthnSignerFactoryContractImplementationType, SafeWebAuthnSharedSignerContractImplementationType } from '../../types';
export declare const PASSKEY_CLIENT_KEY = "passkeyWallet";
export declare const PASSKEY_CLIENT_NAME = "Passkey Wallet Client";
export declare const createPasskeyClient: (passkey: PasskeyArgType, safeWebAuthnSignerFactoryContract: SafeWebAuthnSignerFactoryContractImplementationType, safeWebAuthnSharedSignerContract: SafeWebAuthnSharedSignerContractImplementationType, provider: Client, safeAddress: string, owners: string[], chainId: string) => Promise<PasskeyClient>;
