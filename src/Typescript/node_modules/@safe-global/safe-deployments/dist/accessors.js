"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSimulateTxAccessorDeployments = exports.getSimulateTxAccessorDeployment = void 0;
const utils_1 = require("./utils");
const deployments_1 = require("./deployments");
/**
 * Retrieves a single simulate transaction accessor deployment based on the provided filter.
 *
 * @param {DeploymentFilter} [filter] - Optional filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
const getSimulateTxAccessorDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._ACCESSOR_DEPLOYMENTS);
};
exports.getSimulateTxAccessorDeployment = getSimulateTxAccessorDeployment;
/**
 * Retrieves multiple simulate transaction accessor deployments based on the provided filter.
 *
 * @param {DeploymentFilter} [filter] - Optional filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in the specified format or undefined if no deployments match the filter.
 */
const getSimulateTxAccessorDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._ACCESSOR_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSimulateTxAccessorDeployments = getSimulateTxAccessorDeployments;
