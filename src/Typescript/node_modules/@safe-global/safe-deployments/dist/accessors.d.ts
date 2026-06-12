import { DeploymentFilter, SingletonDeployment, SingletonDeploymentV2 } from './types';
/**
 * Retrieves a single simulate transaction accessor deployment based on the provided filter.
 *
 * @param {DeploymentFilter} [filter] - Optional filter to apply when searching for the deployment.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if no deployment matches the filter.
 */
export declare const getSimulateTxAccessorDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Retrieves multiple simulate transaction accessor deployments based on the provided filter.
 *
 * @param {DeploymentFilter} [filter] - Optional filter to apply when searching for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in the specified format or undefined if no deployments match the filter.
 */
export declare const getSimulateTxAccessorDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
