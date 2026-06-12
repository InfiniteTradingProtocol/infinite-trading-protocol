import MultiSendCallOnlyBaseContract from '../../../contracts/MultiSend/MultiSendCallOnlyBaseContract';
import SafeProvider from '../../../SafeProvider';
import { DeploymentType } from '../../../types';
import { MultiSendCallOnlyContract_v1_3_0_Abi, MultiSendCallOnlyContract_v1_3_0_Contract } from '@safe-global/types-kit';
/**
 * MultiSendCallOnlyContract_v1_3_0  is the implementation specific to the MultiSendCallOnly contract version 1.3.0.
 *
 * This class specializes in handling interactions with the MultiSendCallOnly contract version 1.3.0 using Ethers.js v6.
 *
 * @extends MultiSendCallOnlyBaseContract<MultiSendCallOnlyContract_v1_3_0_Abi> - Inherits from MultiSendCallOnlyBaseContract with ABI specific to MultiSendCallOnly contract version 1.3.0.
 * @implements MultiSendCallOnlyContract_v1_3_0_Contract - Implements the interface specific to MultiSendCallOnly contract version 1.3.0.
 */
declare class MultiSendCallOnlyContract_v1_3_0 extends MultiSendCallOnlyBaseContract<MultiSendCallOnlyContract_v1_3_0_Abi> implements MultiSendCallOnlyContract_v1_3_0_Contract {
    /**
     * Constructs an instance of MultiSendCallOnlyContract_v1_3_0
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the MultiSendCallOnly deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.3.0 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId: bigint, safeProvider: SafeProvider, customContractAddress?: string, customContractAbi?: MultiSendCallOnlyContract_v1_3_0_Abi, deploymentType?: DeploymentType);
}
export default MultiSendCallOnlyContract_v1_3_0;
