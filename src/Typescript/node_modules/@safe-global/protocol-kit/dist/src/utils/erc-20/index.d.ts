import Safe from '../../Safe';
import { Transaction } from '@safe-global/types-kit';
/**
 * Returns the number of decimals of a given ERC-20 token.
 *
 * @async
 * @param {string} tokenAddress - The address of the ERC-20 token.
 * @param {Safe} safe - The Safe object.
 * @returns {Promise<number>} The number of decimals that the token uses.
 * @throws "Invalid ERC-20 decimals"
 */
export declare function getERC20Decimals(tokenAddress: string, safe: Safe): Promise<number>;
/**
 * Checks if the given gas token is compatible with the handlePayment function present in the Safe smart contract.
 * A token is considered compatible if it is a native token or a standard ERC-20 token with 18 decimals.
 *
 * @async
 * @export
 * @param {string} gasToken - The address of the gas token.
 * @param {Safe} safe - The Safe object.
 * @returns {Promise<boolean>} Returns true if the gas token is compatible, otherwise false.
 */
export declare function isGasTokenCompatibleWithHandlePayment(gasToken: string, safe: Safe): Promise<boolean>;
/**
 * Creates a transaction object to perform a transfer of a specified amount of ERC-20 tokens to a given address.
 *
 * @export
 * @param {string} tokenAddress - The address of the ERC-20 token.
 * @param {string} toAddress - The address to which the tokens should be transferred.
 * @param {string} amount - The amount of tokens to transfer.
 * @returns {Transaction} Returns a transaction object that represents the transfer.
 */
export declare function createERC20TokenTransferTransaction(tokenAddress: string, toAddress: string, amount: string): Transaction;
