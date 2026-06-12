"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extractPasskeyData_1 = require("./extractPasskeyData");
const types_1 = require("../../utils/types");
/**
 * Returns true if the passkey signer is a shared signer
 * @returns {Promise<boolean>} A promise that resolves to the signer's address.
 */
async function isSharedSigner(passkey, safeWebAuthnSharedSignerContract, safeAddress, owners, chainId) {
    const sharedSignerContractAddress = safeWebAuthnSharedSignerContract.contractAddress;
    // is a shared signer if the shared signer contract address is present in the owners and its configured in the Safe slot
    if (safeAddress && owners.includes(sharedSignerContractAddress)) {
        const [sharedSignerSlot] = await safeWebAuthnSharedSignerContract.getConfiguration([
            (0, types_1.asHex)(safeAddress)
        ]);
        const { x, y, verifiers } = sharedSignerSlot;
        const verifierAddress = passkey.customVerifierAddress || (0, extractPasskeyData_1.getDefaultFCLP256VerifierAddress)(chainId);
        const isSharedSigner = BigInt(passkey.coordinates.x) === x &&
            BigInt(passkey.coordinates.y) === y &&
            BigInt(verifierAddress) === verifiers;
        return isSharedSigner;
    }
    return false;
}
exports.default = isSharedSigner;
//# sourceMappingURL=isSharedSigner.js.map