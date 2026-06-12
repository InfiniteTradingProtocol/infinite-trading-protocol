import { SafeContractImplementationType } from '../types';
import SafeProvider from '../SafeProvider';
declare class FallbackHandlerManager {
    #private;
    constructor(safeProvider: SafeProvider, safeContract?: SafeContractImplementationType);
    private validateFallbackHandlerAddress;
    private validateFallbackHandlerIsNotEnabled;
    private validateFallbackHandlerIsEnabled;
    private isFallbackHandlerCompatible;
    getFallbackHandler(): Promise<string>;
    encodeEnableFallbackHandlerData(fallbackHandlerAddress: string): Promise<string>;
    encodeDisableFallbackHandlerData(): Promise<string>;
}
export default FallbackHandlerManager;
