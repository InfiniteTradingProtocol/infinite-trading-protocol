"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MultiSendBaseContract_1 = __importDefault(require("../../../contracts/MultiSend/MultiSendBaseContract"));
const types_kit_1 = require("@safe-global/types-kit");
/**
 * MultiSendContract_v1_1_1  is the implementation specific to the MultiSend contract version 1.1.1.
 *
 * This class specializes in handling interactions with the MultiSend contract version 1.1.1 using Ethers.js v6.
 *
 * @extends MultiSendBaseContract<MultiSendContract_v1_1_1_Abi> - Inherits from MultiSendBaseContract with ABI specific to MultiSend contract version 1.1.1.
 * @implements MultiSendContract_v1_1_1_Contract - Implements the interface specific to MultiSend contract version 1.1.1.
 */
class MultiSendContract_v1_1_1 extends MultiSendBaseContract_1.default {
    /**
     * Constructs an instance of MultiSendContract_v1_1_1
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the MultiSend deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.1.1 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, customContractAddress, customContractAbi, deploymentType) {
        const safeVersion = '1.1.1';
        const defaultAbi = types_kit_1.multisend_1_1_1_ContractArtifacts.abi;
        super(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
    }
}
exports.default = MultiSendContract_v1_1_1;
//# sourceMappingURL=MultiSendContract_v1_1_1.js.map