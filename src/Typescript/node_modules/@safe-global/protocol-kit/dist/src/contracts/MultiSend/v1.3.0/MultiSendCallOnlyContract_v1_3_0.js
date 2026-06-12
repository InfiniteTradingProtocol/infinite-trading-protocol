"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MultiSendCallOnlyBaseContract_1 = __importDefault(require("../../../contracts/MultiSend/MultiSendCallOnlyBaseContract"));
const types_kit_1 = require("@safe-global/types-kit");
/**
 * MultiSendCallOnlyContract_v1_3_0  is the implementation specific to the MultiSendCallOnly contract version 1.3.0.
 *
 * This class specializes in handling interactions with the MultiSendCallOnly contract version 1.3.0 using Ethers.js v6.
 *
 * @extends MultiSendCallOnlyBaseContract<MultiSendCallOnlyContract_v1_3_0_Abi> - Inherits from MultiSendCallOnlyBaseContract with ABI specific to MultiSendCallOnly contract version 1.3.0.
 * @implements MultiSendCallOnlyContract_v1_3_0_Contract - Implements the interface specific to MultiSendCallOnly contract version 1.3.0.
 */
class MultiSendCallOnlyContract_v1_3_0 extends MultiSendCallOnlyBaseContract_1.default {
    /**
     * Constructs an instance of MultiSendCallOnlyContract_v1_3_0
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the MultiSendCallOnly deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.3.0 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, customContractAddress, customContractAbi, deploymentType) {
        const safeVersion = '1.3.0';
        const defaultAbi = types_kit_1.multiSendCallOnly_1_3_0_ContractArtifacts.abi;
        super(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
    }
}
exports.default = MultiSendCallOnlyContract_v1_3_0;
//# sourceMappingURL=MultiSendCallOnlyContract_v1_3_0.js.map