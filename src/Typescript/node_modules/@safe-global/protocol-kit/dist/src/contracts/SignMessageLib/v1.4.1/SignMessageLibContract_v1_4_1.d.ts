import SignMessageLibBaseContract from '../../../contracts/SignMessageLib/SignMessageLibBaseContract';
import SafeProvider from '../../../SafeProvider';
import { DeploymentType } from '../../../types';
import { SafeContractFunction, SignMessageLibContract_v1_4_1_Abi, SignMessageLibContract_v1_4_1_Contract, SignMessageLibContract_v1_4_1_Function } from '@safe-global/types-kit';
/**
 * SignMessageLibContract_v1_4_1  is the implementation specific to the SignMessageLib contract version 1.4.1.
 *
 * This class specializes in handling interactions with the SignMessageLib contract version 1.4.1 using Ethers.js v6.
 *
 * @extends  SignMessageLibBaseContract<SignMessageLibContract_v1_4_1_Abi> - Inherits from  SignMessageLibBaseContract with ABI specific to SignMessageLib contract version 1.4.1.
 * @implements SignMessageLibContract_v1_4_1_Contract - Implements the interface specific to SignMessageLib contract version 1.4.1.
 */
declare class SignMessageLibContract_v1_4_1 extends SignMessageLibBaseContract<SignMessageLibContract_v1_4_1_Abi> implements SignMessageLibContract_v1_4_1_Contract {
    /**
     * Constructs an instance of SignMessageLibContract_v1_4_1
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the SignMessageLib deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.4.1 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId: bigint, safeProvider: SafeProvider, customContractAddress?: string, customContractAbi?: SignMessageLibContract_v1_4_1_Abi, deploymentType?: DeploymentType);
    /**
     * @param args - Array[message]
     */
    getMessageHash: SignMessageLibContract_v1_4_1_Function<'getMessageHash'>;
    /**
     * @param args - Array[data]
     */
    signMessage: SafeContractFunction<SignMessageLibContract_v1_4_1_Abi, 'signMessage'>;
}
export default SignMessageLibContract_v1_4_1;
