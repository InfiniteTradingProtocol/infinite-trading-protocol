import { PasskeyArgType, SafeWebAuthnSharedSignerContractImplementationType } from '../../types';
/**
 * Returns true if the passkey signer is a shared signer
 * @returns {Promise<boolean>} A promise that resolves to the signer's address.
 */
declare function isSharedSigner(passkey: PasskeyArgType, safeWebAuthnSharedSignerContract: SafeWebAuthnSharedSignerContractImplementationType, safeAddress: string, owners: string[], chainId: string): Promise<boolean>;
export default isSharedSigner;
