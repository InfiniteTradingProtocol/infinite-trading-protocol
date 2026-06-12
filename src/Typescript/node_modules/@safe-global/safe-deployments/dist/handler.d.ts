import { DeploymentFilter, SingletonDeployment, SingletonDeploymentV2 } from './types';
/**
 * Get the token callback handler deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if not found.
 */
export declare const getTokenCallbackHandlerDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get the default callback handler deployment based on the provided filter.
 * Note that this is an alias to `getTokenCallbackHandlerDeployment` for API backwards compatibility.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if not found.
 */
export declare const getDefaultCallbackHandlerDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all default callback handler deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in version 2 format or undefined if not found.
 */
export declare const getTokenCallbackHandlerDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get all default callback handler deployments based on the provided filter.
 * Note that this is an alias to `getTokenCallbackHandlerDeployments` for API backwards compatibility.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in version 2 format or undefined if not found.
 */
export declare const getDefaultCallbackHandlerDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the compatibility fallback handler deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if not found.
 */
export declare const getCompatibilityFallbackHandlerDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all compatibility fallback handler deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in version 2 format or undefined if not found.
 */
export declare const getCompatibilityFallbackHandlerDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the extensible fallback handler deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if not found.
 */
export declare const getExtensibleFallbackHandlerDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all extensible fallback handler deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeploymentV2 | undefined} - The found deployments in version 2 format or undefined if not found.
 */
export declare const getExtensibleFallbackHandlerDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the fallback handler deployment based on the provided filter. This method is an alias for `getCompatibilityFallbackHandlerDeployment`.
 * Kept for backwards compatibility.
 * @param {DeploymentFilter} [filter] - Optional filter to apply to the deployment search.
 * @returns {SingletonDeployment | undefined} - The found deployment or undefined if not found.
 */
export declare const getFallbackHandlerDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
