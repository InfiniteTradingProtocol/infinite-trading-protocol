"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPrivateKey = toPrivateKey;
exports.toSeed = toSeed;
const bip32_1 = require("@scure/bip32");
const bip39_1 = require("@scure/bip39");
const Hex = require("../Hex.js");
function toPrivateKey(mnemonic, options = {}) {
    const { path = "m/44'/60'/0'/0/0", passphrase } = options;
    const privateKey = bip32_1.HDKey.fromMasterSeed(toSeed(mnemonic, { passphrase })).derive(path).privateKey;
    if (options.as === 'Bytes')
        return privateKey;
    return Hex.fromBytes(privateKey);
}
function toSeed(mnemonic, options = {}) {
    return (0, bip39_1.mnemonicToSeedSync)(mnemonic, options.passphrase);
}
//# sourceMappingURL=mnemonic.js.map