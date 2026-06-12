import { DeploymentFilter, SingletonDeployment, SingletonDeploymentJSON, DeploymentFormats, SingletonDeploymentV2 } from './types';
/**
 * Finds a deployment that matches the given criteria.
 * This function is implemented as a regular function to allow for overloading: https://github.com/microsoft/TypeScript/issues/33482
 *
 * @param {DeploymentFilter} [criteria=DEFAULT_FILTER] - The filter criteria to match deployments.
 * @param {SingletonDeploymentJSON[]} deployments - The list of deployment JSON objects to search.
 * @returns {SingletonDeployment | undefined} - The found deployment object or undefined if no match is found.
 */
declare function findDeployment(criteria: DeploymentFilter | undefined, deployments: SingletonDeploymentJSON[], format?: DeploymentFormats.SINGLETON): SingletonDeployment | undefined;
declare function findDeployment(criteria: DeploymentFilter | undefined, deployments: SingletonDeploymentJSON[], format: DeploymentFormats.MULTIPLE): SingletonDeploymentV2 | undefined;
export { findDeployment };
