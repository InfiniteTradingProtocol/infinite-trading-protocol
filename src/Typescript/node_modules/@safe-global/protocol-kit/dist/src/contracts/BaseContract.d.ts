import { Abi } from 'abitype';
import { ContractFunctionName, ContractFunctionArgs, Transport, WalletClient, Hash, Chain } from 'viem';
import { contractName } from '../contracts/config';
import { DeploymentType } from '../types';
import SafeProvider from '../SafeProvider';
import { EncodeFunction, EstimateGasFunction, GetAddressFunction, SafeVersion, TransactionOptions } from '@safe-global/types-kit';
import { WalletTransactionOptions, WalletLegacyTransactionOptions } from '../utils';
import { ExternalClient } from '../types';
/**
 * Abstract class BaseContract
 * It is designed to be instantiated for different contracts.
 *
 * This abstract class sets up the Ethers v6 Contract object that interacts with the smart contract.
 *
 * Subclasses of BaseContract are expected to represent specific contracts.
 *
 * @template ContractAbiType - The ABI type specific to the version of the contract, extending InterfaceAbi from Ethers.
 *
 * Example subclasses:
 * - SafeBaseContract<SafeContractAbiType> extends BaseContract<SafeContractAbiType>
 * - CreateCallBaseContract<CreateCallContractAbiType> extends BaseContract<CreateCallContractAbiType>
 * - SafeProxyFactoryBaseContract<SafeProxyFactoryContractAbiType> extends BaseContract<SafeProxyFactoryContractAbiType>
 */
declare class BaseContract<ContractAbiType extends Abi> {
    #private;
    contractAbi: ContractAbiType;
    contractAddress: string;
    contractName: contractName;
    safeVersion: SafeVersion;
    safeProvider: SafeProvider;
    chainId: bigint;
    runner: ExternalClient;
    wallet?: WalletClient<Transport, Chain | undefined>;
    /**
     * @constructor
     * Constructs an instance of BaseContract.
     *
     * @param contractName - The contract name.
     * @param chainId - The chain ID of the contract.
     * @param safeProvider - An instance of SafeProvider.
     * @param defaultAbi - The default ABI for the contract. It should be compatible with the specific version of the contract.
     * @param safeVersion - The version of the Safe contract.
     * @param customContractAddress - Optional custom address for the contract. If not provided, the address is derived from the Safe deployments based on the chainId and safeVersion.
     * @param customContractAbi - Optional custom ABI for the contract. If not provided, the ABI is derived from the Safe deployments or the defaultAbi is used.
     * @param deploymentType - Optional deployment type for the contract. If not provided, the first deployment retrieved from the safe-deployments array will be used.
     */
    constructor(contractName: contractName, chainId: bigint, safeProvider: SafeProvider, defaultAbi: ContractAbiType, safeVersion: SafeVersion, customContractAddress?: string, customContractAbi?: ContractAbiType, deploymentType?: DeploymentType);
    init(): Promise<void>;
    getTransactionReceipt(hash: Hash): Promise<import("viem").TransactionReceipt<bigint, number, "success" | "reverted", import("viem").TransactionType>>;
    /**
     * Converts a type of TransactionOptions to a viem transaction type. The viem transaction type creates a clear distinction between the multiple transaction objects (e.g., post-London hard fork) and doesn't allow a union of fields.
     * See: https://github.com/wevm/viem/blob/viem%402.18.0/src/types/fee.ts and https://github.com/wevm/viem/blob/603227e2588366914fb79a902d23fd9afc353cc6/src/types/transaction.ts#L200
     *
     * @param options - Transaction options as expected throughout safe sdk and propagated on the results.
     *
     * @returns Options object compatible with Viem
     */
    convertOptions(options?: TransactionOptions): WalletTransactionOptions | WalletLegacyTransactionOptions;
    getChain(): Chain | undefined;
    getAddress: GetAddressFunction;
    encode: EncodeFunction<ContractAbiType>;
    estimateGas: EstimateGasFunction<ContractAbiType>;
    getWallet(): WalletClient<Transport, Chain | undefined>;
    write<functionName extends ContractFunctionName<ContractAbiType, 'payable' | 'nonpayable'>, functionArgs extends ContractFunctionArgs<ContractAbiType, 'payable' | 'nonpayable', functionName>>(functionName: functionName, args: functionArgs, options?: TransactionOptions): Promise<`0x${string}`>;
    read<functionName extends ContractFunctionName<ContractAbiType, 'pure' | 'view'>, functionArgs extends ContractFunctionArgs<ContractAbiType, 'pure' | 'view', functionName>>(functionName: functionName, args?: functionArgs): Promise<import("viem").ContractFunctionReturnType<ContractAbiType, "pure" | "view", functionName, ContractFunctionArgs<ContractAbiType, "pure" | "view", functionName>>>;
}
export default BaseContract;
