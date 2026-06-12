declare const _default: {
    readonly contractName: "ProxyFactory";
    readonly version: "1.1.1";
    readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "contract GnosisSafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }];
        readonly name: "ProxyCreation";
        readonly type: "event";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "masterCopy";
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
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [];
        readonly name: "proxyRuntimeCode";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly payable: false;
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly constant: true;
        readonly inputs: readonly [];
        readonly name: "proxyCreationCode";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly payable: false;
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_mastercopy";
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
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_mastercopy";
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
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly constant: false;
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_mastercopy";
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
        readonly payable: false;
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
};
export default _default;
