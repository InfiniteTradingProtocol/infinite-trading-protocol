declare const _default: {
    readonly contractName: "MultiSend";
    readonly version: "1.1.1";
    readonly abi: readonly [{
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
};
export default _default;
