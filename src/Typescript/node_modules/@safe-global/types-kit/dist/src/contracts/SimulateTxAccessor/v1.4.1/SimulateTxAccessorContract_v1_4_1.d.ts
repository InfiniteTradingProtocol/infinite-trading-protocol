import { ExtractAbiFunctionNames } from 'abitype';
import SimulateTxAccessorBaseContract from '../SimulateTxAccessorBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const simulateTxAccessorContract_v1_4_1_AbiTypes: readonly [{
    readonly inputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }, {
        readonly internalType: "enum Enum.Operation";
        readonly name: "operation";
        readonly type: "uint8";
    }];
    readonly name: "simulate";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "estimate";
        readonly type: "uint256";
    }, {
        readonly internalType: "bool";
        readonly name: "success";
        readonly type: "bool";
    }, {
        readonly internalType: "bytes";
        readonly name: "returnData";
        readonly type: "bytes";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
/**
 * Represents the ABI of the SimulateTxAccessor contract version 1.4.1.
 *
 * @type {SimulateTxAccessorContract_v1_4_1_Abi}
 */
export type SimulateTxAccessorContract_v1_4_1_Abi = typeof simulateTxAccessorContract_v1_4_1_AbiTypes;
/**
 * Represents the function type derived by the given function name from the SimulateTxAccessor contract version 1.4.1 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SimulateTxAccessorContract_v1_4_1_Function}
 */
export type SimulateTxAccessorContract_v1_4_1_Function<ContractFunctionName extends ExtractAbiFunctionNames<SimulateTxAccessorContract_v1_4_1_Abi>> = ContractFunction<SimulateTxAccessorContract_v1_4_1_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a SimulateTxAccessor contract version 1.4.1 defining read and write methods.
 * Utilizes the generic SimulateTxAccessorBaseContract with the ABI specific to version 1.4.1.
 *
 * @type {SimulateTxAccessorContract_v1_4_1_Contract}
 */
export type SimulateTxAccessorContract_v1_4_1_Contract = SimulateTxAccessorBaseContract<SimulateTxAccessorContract_v1_4_1_Abi>;
export {};
