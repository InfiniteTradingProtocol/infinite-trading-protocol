import MultiSendCallOnlyBaseContract from '../MultiSendCallOnlyBaseContract';
declare const multiSendCallOnlyContract_v1_4_1_AbiTypes: readonly [{
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
 * Represents the ABI of the MultiSendCallOnly contract version 1.4.1.
 *
 * @type {MultiSendCallOnlyContract_v1_4_1_Abi}
 */
export type MultiSendCallOnlyContract_v1_4_1_Abi = typeof multiSendCallOnlyContract_v1_4_1_AbiTypes;
/**
 * Represents the contract type for a MultiSendCallOnly contract version 1.4.1 defining read and write methods.
 * Utilizes the generic MultiSendBaseContract with the ABI specific to version 1.4.1.
 *
 * @type {MultiSendCallOnlyContract_v1_4_1_Contract}
 */
export type MultiSendCallOnlyContract_v1_4_1_Contract = MultiSendCallOnlyBaseContract<MultiSendCallOnlyContract_v1_4_1_Abi>;
export {};
