import SafeWebAuthnSharedSignerBaseContract from '../../../contracts/SafeWebAuthnSharedSigner/SafeWebAuthnSharedSignerBaseContract';
import { SafeVersion, SafeWebAuthnSharedSignerContract_v0_2_1_Abi, SafeWebAuthnSharedSignerContract_v0_2_1_Contract, SafeWebAuthnSharedSignerContract_v0_2_1_Function } from '@safe-global/types-kit';
import SafeProvider from '../../../SafeProvider';
import { DeploymentType } from '../../../types';
/**
 * SafeWebAuthnSharedSignerContract_v0_2_1 is the implementation specific to the SafeWebAuthnSharedSigner contract version 0.2.1.
 *
 * This class specializes in handling interactions with the SafeWebAuthnSharedSigner contract version 0.2.1 using Ethers.js v6.
 *
 * @extends SafeWebAuthnSharedSignerBaseContract<SafeWebAuthnSharedSignerContract_v0_2_1_Abi> - Inherits from SafeWebAuthnSharedSignerBaseContract with ABI specific to SafeWebAuthnSigner Factory contract version 0.2.1.
 * @implements SafeWebAuthnSharedSignerContract_v0_2_1_Contract - Implements the interface specific to SafeWebAuthnSharedSigner contract version 0.2.1.
 */
declare class SafeWebAuthnSharedSignerContract_v0_2_1 extends SafeWebAuthnSharedSignerBaseContract<SafeWebAuthnSharedSignerContract_v0_2_1_Abi> implements SafeWebAuthnSharedSignerContract_v0_2_1_Contract {
    /**
     * Constructs an instance of SafeWebAuthnSharedSignerContract_v0_2_1
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param safeVersion - The version of the Safe contract.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the Safe deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 0.2.1 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId: bigint, safeProvider: SafeProvider, safeVersion: SafeVersion, customContractAddress?: string, customContractAbi?: SafeWebAuthnSharedSignerContract_v0_2_1_Abi, deploymentType?: DeploymentType);
    /**
     * Return the signer configuration for the specified account.
     * @param args - Array[address]
     * @returns Array[signer]
     */
    getConfiguration: SafeWebAuthnSharedSignerContract_v0_2_1_Function<'getConfiguration'>;
    /**
     * Sets the signer configuration for the calling account.
     * @param args - Array[signer]
     * @returns Array[]
     */
    configure: SafeWebAuthnSharedSignerContract_v0_2_1_Function<'configure'>;
    isValidSignature: SafeWebAuthnSharedSignerContract_v0_2_1_Function<'isValidSignature'>;
    /**
     * @returns The starting storage slot on the account containing the signer data.
     */
    SIGNER_SLOT: SafeWebAuthnSharedSignerContract_v0_2_1_Function<'SIGNER_SLOT'>;
}
export default SafeWebAuthnSharedSignerContract_v0_2_1;
