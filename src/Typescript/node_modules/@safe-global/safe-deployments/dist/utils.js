"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDeployment = findDeployment;
const satisfies_1 = __importDefault(require("semver/functions/satisfies"));
const DEFAULT_FILTER = { released: true };
// The older JSON format had a `defaultAddress` field, which became obsolete due to EIP-155 enforcement and non-EVM compatible chains.
// This led to multiple "default" addresses, sometimes on the same chain ID. To maintain backwards compatibility, we map `defaultAddress`
// to the address deployed on a chosen default network.
const DEFAULT_NETWORK_CHAIN_ID = '1';
/**
 * Maps a SingletonDeploymentJSON object to a SingletonDeployment object.
 *
 * @param {SingletonDeploymentJSON} deployment - The deployment JSON object to map.
 * @returns {SingletonDeployment} - The mapped deployment object.
 */
const mapJsonToDeploymentsFormatV1 = (deployment) => {
    const defaultAddressType = Array.isArray(deployment.networkAddresses[DEFAULT_NETWORK_CHAIN_ID])
        ? deployment.networkAddresses[DEFAULT_NETWORK_CHAIN_ID][0]
        : deployment.networkAddresses[DEFAULT_NETWORK_CHAIN_ID];
    // The usage of non-null assertion below is safe, because we validate that the asset files are properly formed in tests
    const defaultAddress = deployment.deployments[defaultAddressType].address;
    const networkAddresses = Object.fromEntries(Object.entries(deployment.networkAddresses).map(([chainId, addressTypes]) => [
        chainId,
        Array.isArray(addressTypes)
            ? deployment.deployments[addressTypes[0]].address
            : deployment.deployments[addressTypes].address,
    ]));
    return Object.assign(Object.assign({}, deployment), { defaultAddress, networkAddresses });
};
/**
 * Maps a SingletonDeploymentJSON object to a SingletonDeploymentV2 object.
 *
 * This function transforms the `networkAddresses` field of the deployment JSON object.
 * It converts each entry in `networkAddresses` to an array of addresses, using the `addresses` field
 * to resolve each address type.
 *
 * @param {SingletonDeploymentJSON} deployment - The deployment JSON object to map.
 * @returns {SingletonDeploymentV2} - The mapped deployment object in V2 format.
 */
const mapJsonToDeploymentsFormatV2 = (deployment) => (Object.assign(Object.assign({}, deployment), { networkAddresses: Object.fromEntries(Object.entries(deployment.networkAddresses).map(([chainId, addressTypes]) => [
        chainId,
        (Array.isArray(addressTypes)
            ? // The usage of non-null assertion below is safe, because we validate that the asset files are properly formed in tests
                addressTypes.map((addressType) => deployment.deployments[addressType].address)
            : deployment.deployments[addressTypes].address),
    ])) }));
function findDeployment(criteria = DEFAULT_FILTER, deployments, format = "singleton" /* DeploymentFormats.SINGLETON */) {
    const { version, released, network } = Object.assign(Object.assign({}, DEFAULT_FILTER), criteria);
    const deploymentJson = deployments.find((deployment) => {
        if (version && !(0, satisfies_1.default)(deployment.version, version))
            return false;
        if (typeof released === 'boolean' && deployment.released !== released)
            return false;
        if (network && !deployment.networkAddresses[network])
            return false;
        return true;
    });
    if (!deploymentJson)
        return undefined;
    if (format === "multiple" /* DeploymentFormats.MULTIPLE */) {
        return mapJsonToDeploymentsFormatV2(deploymentJson);
    }
    else {
        return mapJsonToDeploymentsFormatV1(deploymentJson);
    }
}
