import { SafeContractImplementationType } from '../types';
import SafeProvider from '../SafeProvider';
declare class OwnerManager {
    #private;
    constructor(safeProvider: SafeProvider, safeContract?: SafeContractImplementationType);
    private validateOwnerAddress;
    private validateThreshold;
    private validateAddressIsNotOwner;
    private validateAddressIsOwner;
    getOwners(): Promise<string[]>;
    getThreshold(): Promise<number>;
    isOwner(ownerAddress: string): Promise<boolean>;
    encodeAddOwnerWithThresholdData(ownerAddress: string, threshold?: number): Promise<string>;
    encodeRemoveOwnerData(ownerAddress: string, threshold?: number): Promise<string>;
    encodeSwapOwnerData(oldOwnerAddress: string, newOwnerAddress: string): Promise<string>;
    encodeChangeThresholdData(threshold: number): Promise<string>;
}
export default OwnerManager;
