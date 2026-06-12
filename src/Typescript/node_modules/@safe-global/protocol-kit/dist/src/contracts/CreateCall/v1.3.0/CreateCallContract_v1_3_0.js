"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CreateCallBaseContract_1 = __importDefault(require("../../../contracts/CreateCall/CreateCallBaseContract"));
const types_kit_1 = require("@safe-global/types-kit");
const utils_1 = require("../../../contracts/utils");
/**
 * CreateCallContract_v1_3_0  is the implementation specific to the CreateCall contract version 1.3.0.
 *
 * This class specializes in handling interactions with the CreateCall contract version 1.3.0 using Ethers.js v6.
 *
 * @extends CreateCallBaseContract<CreateCallContract_v1_3_0_Abi> - Inherits from CreateCallBaseContract with ABI specific to CreateCall contract version 1.3.0.
 * @implements CreateCallContract_v1_3_0_Contract - Implements the interface specific to CreateCall contract version 1.3.0.
 */
class CreateCallContract_v1_3_0 extends CreateCallBaseContract_1.default {
    /**
     * Constructs an instance of CreateCallContract_v1_3_0
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the CreateCall deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.3.0 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, customContractAddress, customContractAbi, deploymentType) {
        const safeVersion = '1.3.0';
        const defaultAbi = types_kit_1.createCall_1_3_0_ContractArtifacts.abi;
        super(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        /**
         * @param args - Array[value, deploymentData]
         * @param options - TransactionOptions
         * @returns Promise<TransactionResult>
         */
        this.performCreate = async (args, options) => {
            if (options && !options.gasLimit) {
                options.gasLimit = (await this.estimateGas('performCreate', [...args], { ...options })).toString();
            }
            return (0, utils_1.toTxResult)(this.runner, await this.write('performCreate', args, options), options);
        };
        /**
         * @param args - Array[value, deploymentData, salt]
         * @param options - TransactionOptions
         * @returns Promise<TransactionResult>
         */
        this.performCreate2 = async (args, options) => {
            if (options && !options.gasLimit) {
                options.gasLimit = (await this.estimateGas('performCreate2', args, options)).toString();
            }
            return (0, utils_1.toTxResult)(this.runner, await this.write('performCreate2', args, options), options);
        };
    }
}
exports.default = CreateCallContract_v1_3_0;
//# sourceMappingURL=CreateCallContract_v1_3_0.js.map