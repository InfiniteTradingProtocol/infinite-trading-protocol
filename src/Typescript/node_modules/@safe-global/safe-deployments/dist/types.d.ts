export type AddressType = 'canonical' | 'eip155' | 'zksync';
export declare const enum DeploymentFormats {
    SINGLETON = "singleton",
    MULTIPLE = "multiple"
}
type AtLeastOne<T, U = {
    [K in keyof T]: Pick<T, K>;
}> = Partial<T> & U[keyof U];
export interface SingletonDeploymentJSON {
    released: boolean;
    contractName: string;
    version: string;
    deployments: AtLeastOne<Record<AddressType, {
        address: string;
        codeHash: string;
    }>>;
    networkAddresses: Record<string, AddressType | AddressType[]>;
    abi: any[];
}
export interface SingletonDeployment {
    defaultAddress: string;
    released: boolean;
    contractName: string;
    version: string;
    deployments: AtLeastOne<Record<AddressType, {
        address: string;
        codeHash: string;
    }>>;
    networkAddresses: Record<string, string>;
    abi: any[];
}
export interface SingletonDeploymentV2 {
    released: boolean;
    contractName: string;
    version: string;
    deployments: AtLeastOne<Record<AddressType, {
        address: string;
        codeHash: string;
    }>>;
    abi: any[];
    networkAddresses: Record<string, string | string[]>;
}
export interface DeploymentFilter {
    version?: string;
    released?: boolean;
    network?: string;
}
export {};
