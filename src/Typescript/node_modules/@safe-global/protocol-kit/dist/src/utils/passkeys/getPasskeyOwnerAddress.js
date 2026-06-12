"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SafeProvider_1 = __importDefault(require("../../SafeProvider"));
/**
 * Returns the owner address associated with the specific passkey.
 *
 * @param {Safe} safe The protocol-kit instance of the current Safe
 * @param {PasskeyArgType} passkey The passkey to check the owner address
 * @returns {Promise<string>} Returns the passkey owner address associated with the passkey
 */
async function getPasskeyOwnerAddress(safe, passkey) {
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
    const passkeySigner = await safePasskeyProvider.getExternalSigner();
    const passkeyOwnerAddress = passkeySigner.account.address;
    return passkeyOwnerAddress;
}
exports.default = getPasskeyOwnerAddress;
//# sourceMappingURL=getPasskeyOwnerAddress.js.map