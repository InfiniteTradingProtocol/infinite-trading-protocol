"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSafeL2SingletonDeployments = exports.getSafeL2SingletonDeployment = exports.getSafeSingletonDeployments = exports.getSafeSingletonDeployment = void 0;
const deployments_1 = require("./deployments");
const utils_1 = require("./utils");
/**
 * Finds the latest safe singleton deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
const getSafeSingletonDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_DEPLOYMENTS);
};
exports.getSafeSingletonDeployment = getSafeSingletonDeployment;
/**
 * Finds all safe singleton deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
const getSafeSingletonDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSafeSingletonDeployments = getSafeSingletonDeployments;
/**
 * Finds the latest safe L2 singleton deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
const getSafeL2SingletonDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_L2_DEPLOYMENTS);
};
exports.getSafeL2SingletonDeployment = getSafeL2SingletonDeployment;
/**
 * Finds all safe L2 singleton deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
const getSafeL2SingletonDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_L2_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSafeL2SingletonDeployments = getSafeL2SingletonDeployments;
