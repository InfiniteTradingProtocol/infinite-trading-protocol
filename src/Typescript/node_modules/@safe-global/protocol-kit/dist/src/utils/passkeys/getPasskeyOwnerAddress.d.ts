import Safe from '../../Safe';
import { PasskeyArgType } from '../../types';
/**
 * Returns the owner address associated with the specific passkey.
 *
 * @param {Safe} safe The protocol-kit instance of the current Safe
 * @param {PasskeyArgType} passkey The passkey to check the owner address
 * @returns {Promise<string>} Returns the passkey owner address associated with the passkey
 */
declare function getPasskeyOwnerAddress(safe: Safe, passkey: PasskeyArgType): Promise<string>;
export default getPasskeyOwnerAddress;
