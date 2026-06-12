"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyFactoryDeployments = exports.getProxyFactoryDeployment = void 0;
const utils_1 = require("./utils");
const deployments_1 = require("./deployments");
/**
 * Finds the latest proxy factory deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
const getProxyFactoryDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._FACTORY_DEPLOYMENTS);
};
exports.getProxyFactoryDeployment = getProxyFactoryDeployment;
/**
 * Finds all proxy factory deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
const getProxyFactoryDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._FACTORY_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getProxyFactoryDeployments = getProxyFactoryDeployments;
