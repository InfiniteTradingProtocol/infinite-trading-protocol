"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFCLP256VerifierDeployment = exports.getDaimoP256VerifierDeployment = exports.getSafeWebAuthnShareSignerDeployment = exports.getSafeWebAuthnSignerFactoryDeployment = void 0;
const safe_webauthn_signer_factory_json_1 = __importDefault(require("./assets/safe-passkey-module/v0.2.1/safe-webauthn-signer-factory.json"));
const safe_webauthn_signer_factory_json_2 = __importDefault(require("./assets/safe-passkey-module/v0.2.0/safe-webauthn-signer-factory.json"));
const safe_webauthn_shared_signer_json_1 = __importDefault(require("./assets/safe-passkey-module/v0.2.1/safe-webauthn-shared-signer.json"));
const daimo_p256_verifier_json_1 = __importDefault(require("./assets/safe-passkey-module/v0.2.1/daimo-p256-verifier.json"));
const daimo_p256_verifier_json_2 = __importDefault(require("./assets/safe-passkey-module/v0.2.0/daimo-p256-verifier.json"));
const fcl_p256_verifier_json_1 = __importDefault(require("./assets/safe-passkey-module/v0.2.1/fcl-p256-verifier.json"));
const fcl_p256_verifier_json_2 = __importDefault(require("./assets/safe-passkey-module/v0.2.0/fcl-p256-verifier.json"));
const utils_1 = require("./utils");
// The array should be sorted from the latest version to the oldest.
const SAFE_WEBAUTHN_SIGNER_FACTORY_DEPLOYMENTS = [
    safe_webauthn_signer_factory_json_1.default,
    safe_webauthn_signer_factory_json_2.default,
];
const SAFE_WEBAUTHN_SHARED_SIGNER_DEPLOYMENTS = [safe_webauthn_shared_signer_json_1.default];
const DAIMO_P256_VERIFIER_DEPLOYMENTS = [daimo_p256_verifier_json_1.default, daimo_p256_verifier_json_2.default];
const FCL_P256_VERIFIER_DEPLOYMENTS = [fcl_p256_verifier_json_1.default, fcl_p256_verifier_json_2.default];
const getSafeWebAuthnSignerFactoryDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), SAFE_WEBAUTHN_SIGNER_FACTORY_DEPLOYMENTS);
};
exports.getSafeWebAuthnSignerFactoryDeployment = getSafeWebAuthnSignerFactoryDeployment;
const getSafeWebAuthnShareSignerDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), SAFE_WEBAUTHN_SHARED_SIGNER_DEPLOYMENTS);
};
exports.getSafeWebAuthnShareSignerDeployment = getSafeWebAuthnShareSignerDeployment;
const getDaimoP256VerifierDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), DAIMO_P256_VERIFIER_DEPLOYMENTS);
};
exports.getDaimoP256VerifierDeployment = getDaimoP256VerifierDeployment;
const getFCLP256VerifierDeployment = (filter) => {
    return (0, utils_1.findDeployment)((0, utils_1.applyFilterDefaults)(filter), FCL_P256_VERIFIER_DEPLOYMENTS);
};
exports.getFCLP256VerifierDeployment = getFCLP256VerifierDeployment;
