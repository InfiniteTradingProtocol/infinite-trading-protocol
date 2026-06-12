import { Eip3770Address, SafeEIP712Args } from '@safe-global/types-kit';
import { SafeProviderTransaction, SafeProviderConfig, SafeProviderInitOptions, ExternalClient, ExternalSigner, Eip1193Provider, HttpTransport, SocketTransport, SafeSigner } from './types';
import { Transaction, Abi, ReadContractParameters, ContractFunctionName, ContractFunctionArgs } from 'viem';
declare class SafeProvider {
    #private;
    signer?: SafeSigner;
    provider: Eip1193Provider | HttpTransport | SocketTransport;
    constructor({ provider, signer }: {
        provider: SafeProviderConfig['provider'];
        signer?: SafeSigner;
    });
    getExternalProvider(): ExternalClient;
    static init({ provider, signer, safeVersion, contractNetworks, safeAddress, owners }: SafeProviderInitOptions): Promise<SafeProvider>;
    getExternalSigner(): Promise<ExternalSigner | undefined>;
    isPasskeySigner(): Promise<boolean>;
    isAddress(address: string): boolean;
    getEip3770Address(fullAddress: string): Promise<Eip3770Address>;
    getBalance(address: string, blockTag?: string | number): Promise<bigint>;
    getNonce(address: string, blockTag?: string | number): Promise<number>;
    getChainId(): Promise<bigint>;
    getChecksummedAddress(address: string): string;
    getContractCode(address: string, blockTag?: string | number): Promise<string>;
    isContractDeployed(address: string, blockTag?: string | number): Promise<boolean>;
    getStorageAt(address: string, position: string): Promise<string>;
    getTransaction(transactionHash: string): Promise<Transaction>;
    getSignerAddress(): Promise<string | undefined>;
    signMessage(message: string): Promise<string>;
    signTypedData(safeEIP712Args: SafeEIP712Args): Promise<string>;
    estimateGas(transaction: SafeProviderTransaction): Promise<string>;
    call(transaction: SafeProviderTransaction, blockTag?: string | number): Promise<string>;
    readContract<const abi extends Abi | readonly unknown[], functionName extends ContractFunctionName<abi, 'pure' | 'view'>, const args extends ContractFunctionArgs<abi, 'pure' | 'view', functionName>>(args: ReadContractParameters<abi, functionName, args>): Promise<import("viem").ContractFunctionReturnType<abi, "pure" | "view", functionName, args>>;
    encodeParameters(types: string, values: any[]): string;
    decodeParameters(types: string, values: string): {
        [key: string]: any;
    };
}
export default SafeProvider;
