import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as Hex from '../Hex.js';
/** @internal */
export function toPrivateKey(mnemonic, options = {}) {
    const { path = "m/44'/60'/0'/0/0", passphrase } = options;
    const privateKey = HDKey.fromMasterSeed(toSeed(mnemonic, { passphrase })).derive(path).privateKey;
    if (options.as === 'Bytes')
        return privateKey;
    return Hex.fromBytes(privateKey);
}
/** @internal */
export function toSeed(mnemonic, options = {}) {
    return mnemonicToSeedSync(mnemonic, options.passphrase);
}
//# sourceMappingURL=mnemonic.js.map