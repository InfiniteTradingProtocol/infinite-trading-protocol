"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SafeWebAuthnSharedSignerBaseContract_1 = __importDefault(require("../../../contracts/SafeWebAuthnSharedSigner/SafeWebAuthnSharedSignerBaseContract"));
const types_kit_1 = require("@safe-global/types-kit");
/**
 * SafeWebAuthnSharedSignerContract_v0_2_1 is the implementation specific to the SafeWebAuthnSharedSigner contract version 0.2.1.
 *
 * This class specializes in handling interactions with the SafeWebAuthnSharedSigner contract version 0.2.1 using Ethers.js v6.
 *
 * @extends SafeWebAuthnSharedSignerBaseContract<SafeWebAuthnSharedSignerContract_v0_2_1_Abi> - Inherits from SafeWebAuthnSharedSignerBaseContract with ABI specific to SafeWebAuthnSigner Factory contract version 0.2.1.
 * @implements SafeWebAuthnSharedSignerContract_v0_2_1_Contract - Implements the interface specific to SafeWebAuthnSharedSigner contract version 0.2.1.
 */
class SafeWebAuthnSharedSignerContract_v0_2_1 extends SafeWebAuthnSharedSignerBaseContract_1.default {
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
    constructor(chainId, safeProvider, safeVersion, customContractAddress, customContractAbi, deploymentType) {
        const defaultAbi = types_kit_1.SafeWebAuthnSharedSigner_0_2_1_ContractArtifacts.abi;
        super(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        /**
         * Return the signer configuration for the specified account.
         * @param args - Array[address]
         * @returns Array[signer]
         */
        this.getConfiguration = async (args) => {
            return [await this.read('getConfiguration', args)];
        };
        /**
         * Sets the signer configuration for the calling account.
         * @param args - Array[signer]
         * @returns Array[]
         */
        this.configure = async (args) => {
            await this.write('configure', args);
            return [];
        };
        this.isValidSignature = async (args) => {
            return [await this.read('isValidSignature', args)];
        };
        /**
         * @returns The starting storage slot on the account containing the signer data.
         */
        this.SIGNER_SLOT = async () => {
            return [await this.read('SIGNER_SLOT')];
        };
    }
}
exports.default = SafeWebAuthnSharedSignerContract_v0_2_1;
//# sourceMappingURL=SafeWebAuthnSharedSignerContract_v0_2_1.js.map