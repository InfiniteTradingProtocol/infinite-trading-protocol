"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocialRecoveryModuleDeployment = void 0;
const social_recovery_module_json_1 = __importDefault(require("./assets/safe-recovery-module/v0.1.0/social-recovery-module.json"));
const utils_1 = require("./utils");
// The array should be sorted from the latest version to the oldest.
const SOCIAL_RECOVERY_MODULE_DEPLOYMENTS = [social_recovery_module_json_1.default];
const getSocialRecoveryModuleDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), SOCIAL_RECOVERY_MODULE_DEPLOYMENTS);
};
exports.getSocialRecoveryModuleDeployment = getSocialRecoveryModuleDeployment;
