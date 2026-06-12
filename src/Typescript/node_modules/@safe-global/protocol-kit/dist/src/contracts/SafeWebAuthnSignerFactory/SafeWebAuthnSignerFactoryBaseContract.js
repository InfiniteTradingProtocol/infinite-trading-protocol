"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseContract_1 = __importDefault(require("../../contracts/BaseContract"));
/**
 * Abstract class SafeWebAuthnSignerFactoryBaseContract extends BaseContract to specifically integrate with the SafeWebAuthnSignerFactory contract.
 * It is designed to be instantiated for different versions of the Safe contract.
 *
 * Subclasses of SafeWebAuthnSignerFactoryBaseContract are expected to represent specific versions of the contract.
 *
 * @template SafeWebAuthnSignerFactoryContractAbiType - The ABI type specific to the version of the Safe WebAuthn Signer Factory contract, extending InterfaceAbi from Ethers.
 * @extends BaseContract<SafeWebAuthnSignerFactoryContractAbiType> - Extends the generic BaseContract.
 *
 * Example subclasses:
 * - SafeWebAuthnSignerFactoryContract_v0_2_1  extends SafeWebAuthnSignerFactoryBaseContract<SafeWebAuthnSignerFactoryContract_v0_2_1_Abi>
 */
class SafeWebAuthnSignerFactoryBaseContract extends BaseContract_1.default {
    /**
     * @constructor
     * Constructs an instance of SafeWebAuthnSignerFactoryBaseContract.
     *
     * @param chainId - The chain ID of the contract.
     * @param safeProvider - An instance of SafeProvider.
     * @param defaultAbi - The default ABI for the Safe contract. It should be compatible with the specific version of the contract.
     * @param safeVersion - The version of the Safe contract.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the Safe deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the ABI is derived from the Safe deployments or the defaultAbi is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType) {
        const contractName = 'safeWebAuthnSignerFactoryVersion';
        super(contractName, chainId, safeProvider, defaultAbi, safeVersion, customContractAddress, customContractAbi, deploymentType);
        this.contractName = contractName;
    }
}
exports.default = SafeWebAuthnSignerFactoryBaseContract;
//# sourceMappingURL=SafeWebAuthnSignerFactoryBaseContract.js.map