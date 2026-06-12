import MultiSendCallOnlyBaseContract from '../MultiSendCallOnlyBaseContract';
declare const multiSendCallOnlyContract_v1_3_0_AbiTypes: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "transactions";
        readonly type: "bytes";
    }];
    readonly name: "multiSend";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}];
/**
 * Represents the ABI of the MultiSendCallOnly contract version 1.3.0.
 *
 * @type {MultiSendCallOnlyContract_v1_3_0_Abi}
 */
export type MultiSendCallOnlyContract_v1_3_0_Abi = typeof multiSendCallOnlyContract_v1_3_0_AbiTypes;
/**
 * Represents the contract type for a MultiSendCallOnly contract version 1.3.0 defining read and write methods.
 * Utilizes the generic MultiSendBaseContract with the ABI specific to version 1.3.0.
 *
 * @type {MultiSendCallOnlyContract_v1_3_0_Contract}
 */
export type MultiSendCallOnlyContract_v1_3_0_Contract = MultiSendCallOnlyBaseContract<MultiSendCallOnlyContract_v1_3_0_Abi>;
export {};
