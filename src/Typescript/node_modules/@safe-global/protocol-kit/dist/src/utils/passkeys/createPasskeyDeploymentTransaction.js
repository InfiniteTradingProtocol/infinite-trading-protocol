"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SafeProvider_1 = __importDefault(require("../../SafeProvider"));
/**
 * Creates the deployment transaction to create a passkey signer.
 *
 * @param {Safe} safe The protocol-kit instance of the current Safe
 * @param {PasskeyArgType} passkey The passkey object
 * @returns {Promise<{ to: string; value: string; data: string; }>} The deployment transaction to create a passkey signer.
 */
async function createPasskeyDeploymentTransaction(safe, passkey) {
    const safeVersion = safe.getContractVersion();
    const safeAddress = await safe.getAddress();
    const owners = await safe.getOwners();
    const safePasskeyProvider = await SafeProvider_1.default.init({
        provider: safe.getSafeProvider().provider,
        signer: passkey,
        safeVersion,
        contractNetworks: safe.getContractManager().contractNetworks,
        safeAddress,
        owners
    });
    const passkeySigner = (await safePasskeyProvider.getExternalSigner());
    const passkeyAddress = passkeySigner.account.address;
    const isPasskeyDeployed = await safe.getSafeProvider().isContractDeployed(passkeyAddress);
    if (isPasskeyDeployed) {
        throw new Error('Passkey Signer contract already deployed');
    }
    return passkeySigner.createDeployTxRequest();
}
exports.default = createPasskeyDeploymentTransaction;
//# sourceMappingURL=createPasskeyDeploymentTransaction.js.map