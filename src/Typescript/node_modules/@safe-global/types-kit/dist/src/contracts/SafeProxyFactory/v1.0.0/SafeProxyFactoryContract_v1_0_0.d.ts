import { ExtractAbiFunctionNames } from 'abitype';
import SafeProxyFactoryBaseContract from '../SafeProxyFactoryBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const safeProxyFactoryContract_v1_0_0_AbiTypes: readonly [{
    readonly constant: false;
    readonly inputs: readonly [{
        readonly name: "_mastercopy";
        readonly type: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
    }];
    readonly name: "createProxyWithNonce";
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "proxyCreationCode";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly payable: false;
    readonly stateMutability: "pure";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly name: "masterCopy";
        readonly type: "address";
    }, {
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly name: "createProxy";
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "proxyRuntimeCode";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly payable: false;
    readonly stateMutability: "pure";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly name: "ProxyCreation";
    readonly type: "event";
}];
/**
 * Represents the ABI of the Safe Proxy Factory contract version 1.0.0.
 *
 * @type {SafeProxyFactoryContract_v1_0_0_Abi}
 */
export type SafeProxyFactoryContract_v1_0_0_Abi = typeof safeProxyFactoryContract_v1_0_0_AbiTypes;
/**
 * Represents the function type derived by the given function name from the SafeProxyFactory contract version 1.0.0 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SafeProxyFactoryContract_v1_0_0_Function}
 */
export type SafeProxyFactoryContract_v1_0_0_Function<ContractFunctionName extends ExtractAbiFunctionNames<SafeProxyFactoryContract_v1_0_0_Abi>> = ContractFunction<SafeProxyFactoryContract_v1_0_0_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a Safe Proxy Factory contract version 1.0.0, defining read and write methods.
 * Utilizes the generic SafeProxyFactoryBaseContract with the ABI specific to version 1.0.0.
 *
 * @type {SafeProxyFactoryContract_v1_0_0_Contract}
 */
export type SafeProxyFactoryContract_v1_0_0_Contract = SafeProxyFactoryBaseContract<SafeProxyFactoryContract_v1_0_0_Abi>;
export {};
