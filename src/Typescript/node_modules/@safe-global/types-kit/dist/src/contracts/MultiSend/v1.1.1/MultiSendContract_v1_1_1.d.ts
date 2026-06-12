import MultiSendBaseContract from '../MultiSendBaseContract';
declare const multiSendContract_v1_1_1_AbiTypes: readonly [{
    readonly inputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "transactions";
        readonly type: "bytes";
    }];
    readonly name: "multiSend";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
/**
 * Represents the ABI of the MultiSend contract version 1.1.1.
 *
 * @type {MultiSendContract_v1_1_1_Abi}
 */
export type MultiSendContract_v1_1_1_Abi = typeof multiSendContract_v1_1_1_AbiTypes;
/**
 * Represents the contract type for a MultiSend contract version 1.1.1 defining read and write methods.
 * Utilizes the generic MultiSendBaseContract with the ABI specific to version 1.1.1.
 *
 * @type {MultiSendContract_v1_1_1_Contract}
 */
export type MultiSendContract_v1_1_1_Contract = MultiSendBaseContract<MultiSendContract_v1_1_1_Abi>;
export {};
