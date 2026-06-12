"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseContract_1 = __importDefault(require("../../contracts/BaseContract"));
/**
 * Abstract class  CompatibilityFallbackHandlerBaseContract extends BaseContract to specifically integrate with the CompatibilityFallbackHandler contract.
 * It is designed to be instantiated for different versions of the Safe contract.
 *
 * Subclasses of  CompatibilityFallbackHandlerBaseContract are expected to represent specific versions of the contract.
 *
 * @template CompatibilityFallbackHandlerContractAbiType - The ABI type specific to the version of the CompatibilityFallbackHandler contract, extending InterfaceAbi from Ethers.
 * @extends BaseContract<CompatibilityFallbackHandlerContractAbiType> - Extends the generic BaseContract.
 *
 * Example subclasses:
 * - CompatibilityFallbackHandlerContract_v1_4_1  extends  CompatibilityFallbackHandlerBaseContract<CompatibilityFallbackHandlerContract_v1_4_1_Abi>
 * - CompatibilityFallbackHandlerContract_v1_3_0  extends  CompatibilityFallbackHandlerBaseContract<CompatibilityFallbackHandlerContract_v1_3_0_Abi>
 */
class CompatibilityFallbackHandlerBaseContract extends BaseContract_1.default {
    /**
     * @constructor
     * Constructs an instance of  CompatibilityFallbackHandlerBaseContract.
     *
     * @param chainId - The chain ID of the contract.
     * @param safeProvider - An instance of SafeProvider.
     * @param defaultAbi - The default ABI for the CompatibilityFallbackHandler contract. It should be compatible with the specific version of the contract.
     * @param safeVersion - The version of the Safe contract.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the Safe deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the ABI is derived from the Safe deployments or the defaultAbi is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType) {
        const contractName = 'compatibilityFallbackHandler';
        super(contractName, chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        this.contractName = contractName;
    }
}
exports.default = CompatibilityFallbackHandlerBaseContract;
//# sourceMappingURL=CompatibilityFallbackHandlerBaseContract.js.map