import { ExtractAbiFunctionNames } from 'abitype';
import SignMessageLibBaseContract from '../SignMessageLibBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const signMessageLibContract_v1_3_0_AbiTypes: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "msgHash";
        readonly type: "bytes32";
    }];
    readonly name: "SignMsg";
    readonly type: "event";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "message";
        readonly type: "bytes";
    }];
    readonly name: "getMessageHash";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "_data";
        readonly type: "bytes";
    }];
    readonly name: "signMessage";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
/**
 * Represents the ABI of the SignMessageLib contract version 1.3.0.
 *
 * @type {SignMessageLibContract_v1_3_0_Abi}
 */
export type SignMessageLibContract_v1_3_0_Abi = typeof signMessageLibContract_v1_3_0_AbiTypes;
/**
 * Represents the function type derived by the given function name from the SignMessageLib contract version 1.3.0 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SignMessageLibContract_v1_3_0_Function}
 */
export type SignMessageLibContract_v1_3_0_Function<ContractFunctionName extends ExtractAbiFunctionNames<SignMessageLibContract_v1_3_0_Abi>> = ContractFunction<SignMessageLibContract_v1_3_0_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a SignMessageLib contract version 1.3.0 defining read and write methods.
 * Utilizes the generic SignMessageLibBaseContract with the ABI specific to version 1.3.0.
 *
 * @type {SignMessageLibContract_v1_3_0_Contract}
 */
export type SignMessageLibContract_v1_3_0_Contract = SignMessageLibBaseContract<SignMessageLibContract_v1_3_0_Abi>;
export {};
