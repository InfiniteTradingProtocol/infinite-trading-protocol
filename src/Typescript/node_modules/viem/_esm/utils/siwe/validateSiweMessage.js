import { isAddress } from '../address/isAddress.js';
import { isAddressEqual } from '../address/isAddressEqual.js';
/**
 * @description Validates EIP-4361 message.
 *
 * @see https://eips.ethereum.org/EIPS/eip-4361
 */
export function validateSiweMessage(parameters) {
    const { address, domain, message, nonce, scheme, time = new Date(), } = parameters;
    if (domain && message.domain !== domain)
        return false;
    if (nonce && message.nonce !== nonce)
        return false;
    if (scheme && message.scheme !== scheme)
        return false;
    // Invalid `time` makes both lifetime comparisons false in JS; reject first.
    if (Number.isNaN(time.getTime()))
        return false;
    // Invalid Date (e.g. non-RFC-3339 SIWE timestamp coerced at parse) is truthy;
    // comparisons against it are always false and previously skipped checks.
    if (message.expirationTime) {
        if (Number.isNaN(message.expirationTime.getTime()))
            return false;
        if (time >= message.expirationTime)
            return false;
    }
    if (message.notBefore) {
        if (Number.isNaN(message.notBefore.getTime()))
            return false;
        if (time < message.notBefore)
            return false;
    }
    try {
        if (!message.address)
            return false;
        if (!isAddress(message.address, { strict: false }))
            return false;
        if (address && !isAddressEqual(message.address, address))
            return false;
    }
    catch {
        return false;
    }
    return true;
}
//# sourceMappingURL=validateSiweMessage.js.map