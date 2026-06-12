import { ExtractAbiFunctionNames } from 'abitype';
import SafeProxyFactoryBaseContract from '../SafeProxyFactoryBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const safeProxyFactoryContract_v1_4_1_AbiTypes: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "contract SafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "singleton";
        readonly type: "address";
    }];
    readonly name: "ProxyCreation";
    readonly type: "event";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_singleton";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "initializer";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256";
        readonly name: "saltNonce";
        readonly type: "uint256";
    }];
    readonly name: "createChainSpecificProxyWithNonce";
    readonly outputs: readonly [{
        readonly internalType: "contract SafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_singleton";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "initializer";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256";
        readonly name: "saltNonce";
        readonly type: "uint256";
    }, {
        readonly internalType: "contract IProxyCreationCallback";
        readonly name: "callback";
        readonly type: "address";
    }];
    readonly name: "createProxyWithCallback";
    readonly outputs: readonly [{
        readonly internalType: "contract SafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_singleton";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "initializer";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256";
        readonly name: "saltNonce";
        readonly type: "uint256";
    }];
    readonly name: "createProxyWithNonce";
    readonly outputs: readonly [{
        readonly internalType: "contract SafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getChainId";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "proxyCreationCode";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly stateMutability: "pure";
    readonly type: "function";
}];
/**
 * Represents the ABI of the Safe Proxy Factory contract version 1.4.1.
 *
 * @type {SafeProxyFactoryContract_v1_4_1_Abi}
 */
export type SafeProxyFactoryContract_v1_4_1_Abi = typeof safeProxyFactoryContract_v1_4_1_AbiTypes;
/**
 * Represents the function type derived by the given function name from the SafeProxyFactory contract version 1.4.1 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SafeProxyFactoryContract_v1_4_1_Function}
 */
export type SafeProxyFactoryContract_v1_4_1_Function<ContractFunctionName extends ExtractAbiFunctionNames<SafeProxyFactoryContract_v1_4_1_Abi>> = ContractFunction<SafeProxyFactoryContract_v1_4_1_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a Safe Proxy Factory contract version 1.4.1, defining read and write methods.
 * Utilizes the generic SafeProxyFactoryBaseContract with the ABI specific to version 1.4.1.
 *
 * @type {SafeProxyFactoryContract_v1_4_1_Contract}
 */
export type SafeProxyFactoryContract_v1_4_1_Contract = SafeProxyFactoryBaseContract<SafeProxyFactoryContract_v1_4_1_Abi>;
export {};
