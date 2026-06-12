import { DeploymentFilter, SingletonDeployment, SingletonDeploymentV2 } from './types';
/**
 * Finds the latest proxy factory deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
export declare const getProxyFactoryDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Finds all proxy factory deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
export declare const getProxyFactoryDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
