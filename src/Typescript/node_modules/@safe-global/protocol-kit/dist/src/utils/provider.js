"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSignerPasskeyClient = exports.isPrivateKey = exports.isEip1193Provider = void 0;
const viem_1 = require("viem");
const passkeys_1 = require("./passkeys");
const isEip1193Provider = (provider) => typeof provider !== 'string';
exports.isEip1193Provider = isEip1193Provider;
const isPrivateKey = (signer) => typeof signer === 'string' && !(0, viem_1.isAddress)(signer);
exports.isPrivateKey = isPrivateKey;
const isSignerPasskeyClient = (signer) => !!signer && signer.key === passkeys_1.PASSKEY_CLIENT_KEY;
exports.isSignerPasskeyClient = isSignerPasskeyClient;
//# sourceMappingURL=provider.js.map