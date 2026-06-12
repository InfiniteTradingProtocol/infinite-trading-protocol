import { DeploymentFilter, SingletonDeployment, SingletonDeploymentV2 } from './types';
/**
 * Finds the latest safe singleton deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
export declare const getSafeSingletonDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Finds all safe singleton deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
export declare const getSafeSingletonDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Finds the latest safe L2 singleton deployment that matches the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
export declare const getSafeL2SingletonDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Finds all safe L2 singleton deployments that match the given filter.
 * @param {DeploymentFilter} [filter] - The filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments or undefined if no deployments match the filter.
 */
export declare const getSafeL2SingletonDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
