import { DeploymentFilter, SingletonDeployment, SingletonDeploymentV2 } from './types';
/**
 * Get the MultiSend deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getMultiSendDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all MultiSend deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getMultiSendDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the MultiSendCallOnly deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getMultiSendCallOnlyDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all MultiSendCallOnly deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getMultiSendCallOnlyDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the CreateCall deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getCreateCallDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all CreateCall deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getCreateCallDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the SignMessageLib deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getSignMessageLibDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all SignMessageLib deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getSignMessageLibDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the SafeMigration deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getSafeMigrationDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all SafeMigration deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getSafeMigrationDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the SafeToL2Migration deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getSafeToL2MigrationDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all SafeToL2Migration deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getSafeToL2MigrationDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
/**
 * Get the SafeToL2Setup deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
export declare const getSafeToL2SetupDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined;
/**
 * Get all SafeToL2Setup deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
export declare const getSafeToL2SetupDeployments: (filter?: DeploymentFilter) => SingletonDeploymentV2 | undefined;
