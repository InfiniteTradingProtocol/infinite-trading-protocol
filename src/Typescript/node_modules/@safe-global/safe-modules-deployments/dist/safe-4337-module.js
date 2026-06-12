"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAddModulesLibDeployment = exports.getSafeModuleSetupDeployment = exports.getSafe4337ModuleDeployment = void 0;
const safe_4337_module_json_1 = __importDefault(require("./assets/safe-4337-module/v0.3.0/safe-4337-module.json"));
const safe_4337_module_json_2 = __importDefault(require("./assets/safe-4337-module/v0.2.0/safe-4337-module.json"));
const safe_module_setup_json_1 = __importDefault(require("./assets/safe-4337-module/v0.3.0/safe-module-setup.json"));
const add_modules_lib_json_1 = __importDefault(require("./assets/safe-4337-module/v0.2.0/add-modules-lib.json"));
const utils_1 = require("./utils");
// The array should be sorted from the latest version to the oldest.
const SAFE_4337_MODULE_DEPLOYMENTS = [safe_4337_module_json_1.default, safe_4337_module_json_2.default];
const SAFE_MODULE_SETUP_DEPLOYMENTS = [safe_module_setup_json_1.default, add_modules_lib_json_1.default];
const getSafe4337ModuleDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), SAFE_4337_MODULE_DEPLOYMENTS);
};
exports.getSafe4337ModuleDeployment = getSafe4337ModuleDeployment;
const getSafeModuleSetupDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), SAFE_MODULE_SETUP_DEPLOYMENTS);
};
exports.getSafeModuleSetupDeployment = getSafeModuleSetupDeployment;
// From v0.2 to v0.3, the `AddModulesLib` contract was renamed to `SafeModuleSetup` while preserving
// its interface and functionality. As such, we consider both contracts to be the same with respect
// to deployments, and expose an alias for the `AddModulesLib` name for backwards compatibility.
exports.getAddModulesLibDeployment = exports.getSafeModuleSetupDeployment;
