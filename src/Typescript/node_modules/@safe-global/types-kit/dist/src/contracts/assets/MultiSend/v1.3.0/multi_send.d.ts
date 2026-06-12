declare const _default: {
    readonly contractName: "MultiSend";
    readonly version: "1.3.0";
    readonly abi: readonly [{
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
};
export default _default;
