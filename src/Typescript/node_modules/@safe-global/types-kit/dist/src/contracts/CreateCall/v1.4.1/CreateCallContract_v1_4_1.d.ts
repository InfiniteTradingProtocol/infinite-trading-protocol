import CreateCallBaseContract from '../CreateCallBaseContract';
declare const createCallContract_v1_4_1_AbiTypes: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "newContract";
        readonly type: "address";
    }];
    readonly name: "ContractCreation";
    readonly type: "event";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "deploymentData";
        readonly type: "bytes";
    }];
    readonly name: "performCreate";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "newContract";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "deploymentData";
        readonly type: "bytes";
    }, {
        readonly internalType: "bytes32";
        readonly name: "salt";
        readonly type: "bytes32";
    }];
    readonly name: "performCreate2";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "newContract";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
/**
 * Represents the ABI of the CreateCall contract version 1.4.1.
 *
 * @type {CreateCallContract_v1_4_1_Abi}
 */
export type CreateCallContract_v1_4_1_Abi = typeof createCallContract_v1_4_1_AbiTypes;
/**
 * Represents the contract type for a CreateCall contract version 1.4.1 defining read and write methods.
 * Utilizes the generic CreateCallBaseContract with the ABI specific to version 1.4.1.
 *
 * @type {CreateCallContract_v1_4_1_Contract}
 */
export type CreateCallContract_v1_4_1_Contract = CreateCallBaseContract<CreateCallContract_v1_4_1_Abi>;
export {};
