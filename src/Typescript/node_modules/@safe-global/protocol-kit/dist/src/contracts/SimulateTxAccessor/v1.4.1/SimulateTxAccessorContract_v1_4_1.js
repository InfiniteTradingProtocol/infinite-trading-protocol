"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SimulateTxAccessorBaseContract_1 = __importDefault(require("../../../contracts/SimulateTxAccessor/SimulateTxAccessorBaseContract"));
const types_kit_1 = require("@safe-global/types-kit");
const types_1 = require("../../../utils/types");
/**
 * SimulateTxAccessorContract_v1_4_1  is the implementation specific to the SimulateTxAccessor contract version 1.4.1.
 *
 * This class specializes in handling interactions with the SimulateTxAccessor contract version 1.4.1 using Ethers.js v6.
 *
 * @extends SimulateTxAccessorBaseContract<SimulateTxAccessorContract_v1_4_1_Abi> - Inherits from SimulateTxAccessorBaseContract with ABI specific to SimulateTxAccessor contract version 1.4.1.
 * @implements SimulateTxAccessorContract_v1_4_1_Contract - Implements the interface specific to SimulateTxAccessor contract version 1.4.1.
 */
class SimulateTxAccessorContract_v1_4_1 extends SimulateTxAccessorBaseContract_1.default {
    /**
     * Constructs an instance of SimulateTxAccessorContract_v1_4_1
     *
     * @param chainId - The chain ID where the contract resides.
     * @param safeProvider - An instance of SafeProvider.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the SimulateTxAccessor deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the default ABI for version 1.4.1 is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, customContractAddress, customContractAbi, deploymentType) {
        const safeVersion = '1.4.1';
        const defaultAbi = types_kit_1.simulateTxAccessor_1_4_1_ContractArtifacts.abi;
        super(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        /**
         * @param args - Array[to, value, data, operation]
         * @returns Array[estimate, success, returnData]
         */
        this.simulate = async (args) => {
            const [estimate, success, returnData] = await this.write('simulate', args);
            return [BigInt(estimate), !!success, (0, types_1.asHex)(returnData)];
        };
    }
}
exports.default = SimulateTxAccessorContract_v1_4_1;
//# sourceMappingURL=SimulateTxAccessorContract_v1_4_1.js.map