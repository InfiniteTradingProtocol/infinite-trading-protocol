import { ContractNetworksConfig, MultiSendCallOnlyContractImplementationType, MultiSendContractImplementationType, SafeConfig, SafeContractImplementationType } from '../types';
import SafeProvider from '../SafeProvider';
declare class ContractManager {
    #private;
    static init(config: SafeConfig, safeProvider: SafeProvider): Promise<ContractManager>;
    get contractNetworks(): ContractNetworksConfig | undefined;
    get isL1SafeSingleton(): boolean | undefined;
    get safeContract(): SafeContractImplementationType | undefined;
    get multiSendContract(): MultiSendContractImplementationType;
    get multiSendCallOnlyContract(): MultiSendCallOnlyContractImplementationType;
}
export default ContractManager;
