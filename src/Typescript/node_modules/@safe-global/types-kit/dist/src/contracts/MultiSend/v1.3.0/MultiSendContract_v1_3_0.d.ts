import MultiSendBaseContract from '../MultiSendBaseContract';
declare const multiSendContract_v1_3_0_AbiTypes: readonly [{
    readonly inputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
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
 * Represents the ABI of the MultiSend contract version 1.3.0.
 *
 * @type {MultiSendContract_v1_3_0_Abi}
 */
export type MultiSendContract_v1_3_0_Abi = typeof multiSendContract_v1_3_0_AbiTypes;
/**
 * Represents the contract type for a MultiSend contract version 1.3.0 defining read and write methods.
 * Utilizes the generic MultiSendBaseContract with the ABI specific to version 1.3.0.
 *
 * @type {MultiSendContract_v1_3_0_Contract}
 */
export type MultiSendContract_v1_3_0_Contract = MultiSendBaseContract<MultiSendContract_v1_3_0_Abi>;
export {};
