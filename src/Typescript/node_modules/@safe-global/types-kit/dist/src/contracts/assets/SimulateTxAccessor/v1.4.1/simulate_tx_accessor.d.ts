declare const _default: {
    readonly contractName: "SimulateTxAccessor";
    readonly version: "1.4.1";
    readonly abi: readonly [{
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
};
export default _default;
