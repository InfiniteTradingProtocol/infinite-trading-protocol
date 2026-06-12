"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSafeToL2SetupDeployments = exports.getSafeToL2SetupDeployment = exports.getSafeToL2MigrationDeployments = exports.getSafeToL2MigrationDeployment = exports.getSafeMigrationDeployments = exports.getSafeMigrationDeployment = exports.getSignMessageLibDeployments = exports.getSignMessageLibDeployment = exports.getCreateCallDeployments = exports.getCreateCallDeployment = exports.getMultiSendCallOnlyDeployments = exports.getMultiSendCallOnlyDeployment = exports.getMultiSendDeployments = exports.getMultiSendDeployment = void 0;
const deployments_1 = require("./deployments");
const utils_1 = require("./utils");
/**
 * Get the MultiSend deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getMultiSendDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._MULTI_SEND_DEPLOYMENTS);
};
exports.getMultiSendDeployment = getMultiSendDeployment;
/**
 * Get all MultiSend deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getMultiSendDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._MULTI_SEND_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getMultiSendDeployments = getMultiSendDeployments;
/**
 * Get the MultiSendCallOnly deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getMultiSendCallOnlyDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._MULTI_SEND_CALL_ONLY_DEPLOYMENTS);
};
exports.getMultiSendCallOnlyDeployment = getMultiSendCallOnlyDeployment;
/**
 * Get all MultiSendCallOnly deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getMultiSendCallOnlyDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._MULTI_SEND_CALL_ONLY_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getMultiSendCallOnlyDeployments = getMultiSendCallOnlyDeployments;
/**
 * Get the CreateCall deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getCreateCallDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._CREATE_CALL_DEPLOYMENTS);
};
exports.getCreateCallDeployment = getCreateCallDeployment;
/**
 * Get all CreateCall deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getCreateCallDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._CREATE_CALL_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getCreateCallDeployments = getCreateCallDeployments;
/**
 * Get the SignMessageLib deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getSignMessageLibDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SIGN_MESSAGE_LIB_DEPLOYMENTS);
};
exports.getSignMessageLibDeployment = getSignMessageLibDeployment;
/**
 * Get all SignMessageLib deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getSignMessageLibDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SIGN_MESSAGE_LIB_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSignMessageLibDeployments = getSignMessageLibDeployments;
/**
 * Get the SafeMigration deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getSafeMigrationDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_MIGRATION_DEPLOYMENTS);
};
exports.getSafeMigrationDeployment = getSafeMigrationDeployment;
/**
 * Get all SafeMigration deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getSafeMigrationDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_MIGRATION_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSafeMigrationDeployments = getSafeMigrationDeployments;
/**
 * Get the SafeToL2Migration deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getSafeToL2MigrationDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_TO_L2_MIGRATION_DEPLOYMENTS);
};
exports.getSafeToL2MigrationDeployment = getSafeToL2MigrationDeployment;
/**
 * Get all SafeToL2Migration deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getSafeToL2MigrationDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_TO_L2_MIGRATION_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSafeToL2MigrationDeployments = getSafeToL2MigrationDeployments;
/**
 * Get the SafeToL2Setup deployment based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployment.
 * @returns {SingletonDeployment | undefined} - The matched deployment or undefined if not found.
 */
const getSafeToL2SetupDeployment = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_TO_L2_SETUP_DEPLOYMENTS);
};
exports.getSafeToL2SetupDeployment = getSafeToL2SetupDeployment;
/**
 * Get all SafeToL2Setup deployments based on the provided filter.
 * @param {DeploymentFilter} [filter] - The filter criteria for the deployments.
 * @returns {SingletonDeploymentV2 | undefined} - The matched deployments or undefined if not found.
 */
const getSafeToL2SetupDeployments = (filter) => {
    return (0, utils_1.findDeployment)(filter, deployments_1._SAFE_TO_L2_SETUP_DEPLOYMENTS, "multiple" /* DeploymentFormats.MULTIPLE */);
};
exports.getSafeToL2SetupDeployments = getSafeToL2SetupDeployments;
