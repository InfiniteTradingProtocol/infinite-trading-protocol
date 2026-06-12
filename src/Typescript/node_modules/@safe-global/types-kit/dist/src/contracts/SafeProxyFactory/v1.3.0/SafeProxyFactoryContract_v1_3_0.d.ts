import { ExtractAbiFunctionNames } from 'abitype';
import SafeProxyFactoryBaseContract from '../SafeProxyFactoryBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const safeProxyFactoryContract_v1_3_0_AbiTypes: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "contract GnosisSafeProxy";
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
    readonly name: "calculateCreateProxyWithNonceAddress";
    readonly outputs: readonly [{
        readonly internalType: "contract GnosisSafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "singleton";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly name: "createProxy";
    readonly outputs: readonly [{
        readonly internalType: "contract GnosisSafeProxy";
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
        readonly internalType: "contract GnosisSafeProxy";
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
        readonly internalType: "contract GnosisSafeProxy";
        readonly name: "proxy";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
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
}, {
    readonly inputs: readonly [];
    readonly name: "proxyRuntimeCode";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly stateMutability: "pure";
    readonly type: "function";
}];
/**
 * Represents the ABI of the Safe Proxy Factory contract version 1.3.0.
 *
 * @type {SafeProxyFactoryContract_v1_3_0_Abi}
 */
export type SafeProxyFactoryContract_v1_3_0_Abi = typeof safeProxyFactoryContract_v1_3_0_AbiTypes;
/**
 * Represents the function type derived by the given function name from the SafeProxyFactory contract version 1.3.0 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SafeProxyFactoryContract_v1_3_0_Function}
 */
export type SafeProxyFactoryContract_v1_3_0_Function<ContractFunctionName extends ExtractAbiFunctionNames<SafeProxyFactoryContract_v1_3_0_Abi>> = ContractFunction<SafeProxyFactoryContract_v1_3_0_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a Safe Proxy Factory contract version 1.3.0, defining read and write methods.
 * Utilizes the generic SafeProxyFactoryBaseContract with the ABI specific to version 1.3.0.
 *
 * @type {SafeProxyFactoryContract_v1_3_0_Contract}
 */
export type SafeProxyFactoryContract_v1_3_0_Contract = SafeProxyFactoryBaseContract<SafeProxyFactoryContract_v1_3_0_Abi>;
export {};
