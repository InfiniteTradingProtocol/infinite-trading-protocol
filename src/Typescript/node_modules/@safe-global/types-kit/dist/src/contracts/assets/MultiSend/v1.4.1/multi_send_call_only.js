"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Source: https://github.com/safe-global/safe-deployments/blob/main/src/assets/v1.4.1/multi_send_call_only.json
exports.default = {
    contractName: 'MultiSendCallOnly',
    version: '1.4.1',
    abi: [
        {
            inputs: [
                {
                    internalType: 'bytes',
                    name: 'transactions',
                    type: 'bytes'
                }
            ],
            name: 'multiSend',
            outputs: [],
            stateMutability: 'payable',
            type: 'function'
        }
    ]
};
//# sourceMappingURL=multi_send_call_only.js.map