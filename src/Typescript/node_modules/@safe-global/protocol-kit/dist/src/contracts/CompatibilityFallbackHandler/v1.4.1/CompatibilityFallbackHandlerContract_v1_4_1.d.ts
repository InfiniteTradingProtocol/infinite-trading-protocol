import CompatibilityFallbackHandlerBaseContract from '../../../contracts/CompatibilityFallbackHandler/CompatibilityFallbackHandlerBaseContract';
import SafeProvider from '../../../SafeProvider';
import { DeploymentType } from '../../../types';
import { CompatibilityFallbackHandlerContract_v1_4_1_Abi, CompatibilityFallbackHandlerContract_v1_4_1_Contract } from '@safe-global/types-kit';
/**
 * CompatibilityFallbackHandlerContract_v1_4_1  is the implementation specific to the CompatibilityFallbackHandler contract version 1.4.1.
 *
 * This class specializes in handling interactions with the CompatibilityFallbackHandler contract version 1.4.1 using Ethers.js v6.
 *
 * @extends  CompatibilityFallbackHandlerBaseContract<CompatibilityFallbackHandlerContract_v1_4_1_Abi> - Inherits from  CompatibilityFallbackHandlerBaseContract with ABI specific to CompatibilityFallbackHandler contract version 1.4.1.
 * @implements CompatibilityFallbackHandlerContract_v1_4_1_Contract - Implements the interface specific to CompatibilityFallbackHandler contract version 1.4.1.
 */
declare class CompatibilityFallbackHandlerContract_v1_4_1 extends CompatibilityFallbackHandlerBaseContract<CompatibilityFallbackHandlerContract_v1_4_1_Abi> implements CompatibilityFallbackHandlerContract_v1_4_1_Contract {
    /**
     * Constructs an instance of CompatibilityFallbackHandlerContract_v1_4_1
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the CompatibilityFallbackHandler deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.4.1 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId: bigint, safeProvider: SafeProvider, customContractAddress?: string, customContractAbi?: CompatibilityFallbackHandlerContract_v1_4_1_Abi, deploymentType?: DeploymentType);
}
export default CompatibilityFallbackHandlerContract_v1_4_1;
