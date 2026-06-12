import { Hex } from 'viem';
import Safe from '../../Safe';
import { PasskeyArgType } from '../../types';
/**
 * Creates the deployment transaction to create a passkey signer.
 *
 * @param {Safe} safe The protocol-kit instance of the current Safe
 * @param {PasskeyArgType} passkey The passkey object
 * @returns {Promise<{ to: string; value: string; data: string; }>} The deployment transaction to create a passkey signer.
 */
declare function createPasskeyDeploymentTransaction(safe: Safe, passkey: PasskeyArgType): Promise<{
    to: string;
    value: string;
    data: Hex;
}>;
export default createPasskeyDeploymentTransaction;
