import { OperationType, SafeVersion, SafeTransaction } from '@safe-global/types-kit';
import Safe from '../../Safe';
import SafeProvider from '../../SafeProvider';
import { ContractNetworksConfig, SafeContractImplementationType } from '../../types';
export declare function estimateGas(safeVersion: SafeVersion, safeContract: SafeContractImplementationType, safeProvider: SafeProvider, to: string, valueInWei: string, data: string, operation: OperationType, customContracts?: ContractNetworksConfig): Promise<string>;
export declare function estimateTxGas(safeContract: SafeContractImplementationType, safeProvider: SafeProvider, to: string, valueInWei: string, data: string, operation: OperationType): Promise<string>;
/**
 * This function estimates the baseGas of a Safe transaction.
 * The baseGas includes costs for:
 * - Generation of the Safe transaction hash (txHash)
 * - Increasing the nonce of the Safe
 * - Verifying the signatures of the Safe transaction
 * - Payment to relayers for executing the transaction
 * - Emitting events ExecutionSuccess or ExecutionFailure
 *
 * Note: it does not include the transaction execution cost (safeTxGas)
 *
 * @async
 * @function estimateTxBaseGas
 * @param {Safe} safe - The Safe instance containing all the information about the safe.
 * @param {SafeTransaction} safeTransaction - The transaction for which the baseGas is to be estimated.
 * @returns {Promise<string>} A Promise that resolves with the estimated baseGas as a string.
 */
export declare function estimateTxBaseGas(safe: Safe, safeTransaction: SafeTransaction): Promise<string>;
/**
 * This function estimates the safeTxGas of a Safe transaction.
 * The safeTxGas value represents the amount of gas required to execute the Safe transaction itself.
 * It does not include costs such as signature verification, transaction hash generation, nonce incrementing, and so on.
 *
 * The estimation method differs based on the version of the Safe:
 * - For versions >= 1.3.0, the simulate function defined in the simulateTxAccessor.sol Contract is used.
 * - For versions < 1.3.0, the deprecated requiredTxGas method defined in the GnosisSafe.sol contract is used.
 *
 * @async
 * @function estimateSafeTxGas
 * @param {Safe} safe - The Safe instance containing all the necessary information about the safe.
 * @param {SafeTransaction} safeTransaction - The transaction for which the safeTxGas is to be estimated.
 * @returns {Promise<string>} A Promise that resolves with the estimated safeTxGas as a string.
 *
 */
export declare function estimateSafeTxGas(safe: Safe, safeTransaction: SafeTransaction): Promise<string>;
/**
 * This function estimates the gas cost of deploying a Safe.
 * It considers also the costs of the Safe setup call.
 * The setup call includes tasks such as setting up initial owners, defining the threshold, and initializing the salt nonce used for address generation.
 *
 * @async
 * @function estimateSafeDeploymentGas
 * @param {Safe} safe - The Safe object containing all necessary information about the safe, including owners, threshold, and saltNonce.
 * @returns {Promise<string>} A Promise that resolves with the estimated gas cost of the safe deployment as a string.
 */
export declare function estimateSafeDeploymentGas(safe: Safe): Promise<string>;
