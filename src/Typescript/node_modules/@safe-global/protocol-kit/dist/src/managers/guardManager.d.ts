import { SafeContractImplementationType } from '../types';
import SafeProvider from '../SafeProvider';
declare class GuardManager {
    #private;
    constructor(safeProvider: SafeProvider, safeContract?: SafeContractImplementationType);
    private validateGuardAddress;
    private validateGuardIsNotEnabled;
    private validateGuardIsEnabled;
    private isGuardCompatible;
    getGuard(): Promise<string>;
    encodeEnableGuardData(guardAddress: string): Promise<string>;
    encodeDisableGuardData(): Promise<string>;
}
export default GuardManager;
