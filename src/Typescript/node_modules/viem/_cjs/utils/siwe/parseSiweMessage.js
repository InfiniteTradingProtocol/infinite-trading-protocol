"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSiweMessage = parseSiweMessage;
const siweDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function isValidSiweDateTime(value) {
    if (!siweDateTimeRegex.test(value))
        return false;
    return !Number.isNaN(new Date(value).getTime());
}
function parseSiweDateTime(value) {
    if (!isValidSiweDateTime(value))
        return new Date(Number.NaN);
    return new Date(value);
}
function parseSiweMessage(message) {
    const { scheme, statement, ...prefix } = (message.match(prefixRegex)
        ?.groups ?? {});
    const { chainId, expirationTime, issuedAt, notBefore, requestId, resources: resources_, ...suffix } = (message.match(suffixRegex)?.groups ?? {});
    const resources = resources_?.split('\n- ').slice(1);
    return {
        ...prefix,
        ...suffix,
        ...(chainId ? { chainId: Number(chainId) } : {}),
        ...(expirationTime
            ? { expirationTime: parseSiweDateTime(expirationTime) }
            : {}),
        ...(issuedAt ? { issuedAt: parseSiweDateTime(issuedAt) } : {}),
        ...(notBefore ? { notBefore: parseSiweDateTime(notBefore) } : {}),
        ...(requestId ? { requestId } : {}),
        ...(resources ? { resources } : {}),
        ...(scheme ? { scheme } : {}),
        ...(statement ? { statement } : {}),
    };
}
const prefixRegex = /^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+\-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Ethereum account:\n)(?<address>0x[a-fA-F0-9]{40})\n\n(?:(?<statement>.*)\n\n)?/;
const suffixRegex = /(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.*))?(?:\nResources:(?<resources>(?:\n- .+)*))?/;
//# sourceMappingURL=parseSiweMessage.js.map