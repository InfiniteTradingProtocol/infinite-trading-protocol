"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllowanceModuleDeployment = void 0;
const allowance_module_json_1 = __importDefault(require("./assets/allowance-module/v0.1.0/allowance-module.json"));
const allowance_module_json_2 = __importDefault(require("./assets/allowance-module/v0.1.1/allowance-module.json"));
const utils_1 = require("./utils");
// The array should be sorted from the latest version to the oldest.
const ALLOWANCE_MODULE_DEPLOYMENTS = [allowance_module_json_2.default, allowance_module_json_1.default];
const getAllowanceModuleDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), ALLOWANCE_MODULE_DEPLOYMENTS);
};
exports.getAllowanceModuleDeployment = getAllowanceModuleDeployment;
