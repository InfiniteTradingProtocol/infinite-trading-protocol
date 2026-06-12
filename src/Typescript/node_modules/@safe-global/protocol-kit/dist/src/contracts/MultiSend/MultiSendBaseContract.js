"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseContract_1 = __importDefault(require("../../contracts/BaseContract"));
/**
 * Abstract class MultiSendBaseContract extends BaseContract to specifically integrate with the MultiSend contract.
 * It is designed to be instantiated for different versions of the MultiSend contract.
 *
 * Subclasses of MultiSendBaseContract are expected to represent specific versions of the MultiSend contract.
 *
 * @template MultiSendContractAbiType - The ABI type specific to the version of the MultiSend contract, extending InterfaceAbi from Ethers.
 * @extends BaseContract<MultiSendContractAbiType> - Extends the generic BaseContract.
 *
 * Example subclasses:
 * - MultiSendContract_v1_4_1  extends MultiSendBaseContract<MultiSendContract_v1_4_1_Abi>
 * - MultiSendContract_v1_3_0  extends MultiSendBaseContract<MultiSendContract_v1_3_0_Abi>
 */
class MultiSendBaseContract extends BaseContract_1.default {
    /**
     * @constructor
     * Constructs an instance of MultiSendBaseContract.
     *
     * @param chainId - The chain ID of the contract.
     * @param safeProvider - An instance of SafeProvider.
     * @param defaultAbi - The default ABI for the MultiSend contract. It should be compatible with the specific version of the MultiSend contract.
     * @param safeVersion - The version of the MultiSend contract.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the MultiSend deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the ABI is derived from the MultiSend deployments or the defaultAbi is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType) {
        const contractName = 'multiSendVersion';
        super(contractName, chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        this.contractName = contractName;
    }
}
exports.default = MultiSendBaseContract;
//# sourceMappingURL=MultiSendBaseContract.js.map