import { ExtractAbiFunctionNames } from 'abitype';
import SafeBaseContract from '../SafeBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const safeContract_v1_1_1_AbiTypes: readonly [{
    readonly inputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "AddedOwner";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "approvedHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "ApproveHash";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "masterCopy";
        readonly type: "address";
    }];
    readonly name: "ChangedMasterCopy";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "threshold";
        readonly type: "uint256";
    }];
    readonly name: "ChangedThreshold";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "contract Module";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "DisabledModule";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "contract Module";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "EnabledModule";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "txHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "payment";
        readonly type: "uint256";
    }];
    readonly name: "ExecutionFailure";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "ExecutionFromModuleFailure";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "ExecutionFromModuleSuccess";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "txHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "payment";
        readonly type: "uint256";
    }];
    readonly name: "ExecutionSuccess";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "RemovedOwner";
    readonly type: "event";
}, {
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
    readonly payable: true;
    readonly stateMutability: "payable";
    readonly type: "fallback";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "NAME";
    readonly outputs: readonly [{
        readonly internalType: "string";
        readonly name: "";
        readonly type: "string";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "VERSION";
    readonly outputs: readonly [{
        readonly internalType: "string";
        readonly name: "";
        readonly type: "string";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "_threshold";
        readonly type: "uint256";
    }];
    readonly name: "addOwnerWithThreshold";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly name: "approvedHashes";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_masterCopy";
        readonly type: "address";
    }];
    readonly name: "changeMasterCopy";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "_threshold";
        readonly type: "uint256";
    }];
    readonly name: "changeThreshold";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "contract Module";
        readonly name: "prevModule";
        readonly type: "address";
    }, {
        readonly internalType: "contract Module";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "disableModule";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "domainSeparator";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "contract Module";
        readonly name: "module";
        readonly type: "address";
    }];
    readonly name: "enableModule";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
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
    readonly name: "execTransactionFromModule";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "success";
        readonly type: "bool";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
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
    readonly name: "execTransactionFromModuleReturnData";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "success";
        readonly type: "bool";
    }, {
        readonly internalType: "bytes";
        readonly name: "returnData";
        readonly type: "bytes";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "getModules";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "";
        readonly type: "address[]";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "start";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "pageSize";
        readonly type: "uint256";
    }];
    readonly name: "getModulesPaginated";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "array";
        readonly type: "address[]";
    }, {
        readonly internalType: "address";
        readonly name: "next";
        readonly type: "address";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "getOwners";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "";
        readonly type: "address[]";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "getThreshold";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "isOwner";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "nonce";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "prevOwner";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "_threshold";
        readonly type: "uint256";
    }];
    readonly name: "removeOwner";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "handler";
        readonly type: "address";
    }];
    readonly name: "setFallbackHandler";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly name: "signedMessages";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "prevOwner";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "oldOwner";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "newOwner";
        readonly type: "address";
    }];
    readonly name: "swapOwner";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "_owners";
        readonly type: "address[]";
    }, {
        readonly internalType: "uint256";
        readonly name: "_threshold";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }, {
        readonly internalType: "address";
        readonly name: "fallbackHandler";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "paymentToken";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "payment";
        readonly type: "uint256";
    }, {
        readonly internalType: "address payable";
        readonly name: "paymentReceiver";
        readonly type: "address";
    }];
    readonly name: "setup";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
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
    }, {
        readonly internalType: "uint256";
        readonly name: "safeTxGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "baseGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasPrice";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "gasToken";
        readonly type: "address";
    }, {
        readonly internalType: "address payable";
        readonly name: "refundReceiver";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "signatures";
        readonly type: "bytes";
    }];
    readonly name: "execTransaction";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "success";
        readonly type: "bool";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
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
    readonly name: "requiredTxGas";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "hashToApprove";
        readonly type: "bytes32";
    }];
    readonly name: "approveHash";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "_data";
        readonly type: "bytes";
    }];
    readonly name: "signMessage";
    readonly outputs: readonly [];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: false;
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "_data";
        readonly type: "bytes";
    }, {
        readonly internalType: "bytes";
        readonly name: "_signature";
        readonly type: "bytes";
    }];
    readonly name: "isValidSignature";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly payable: false;
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly constant: true;
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
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
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
    }, {
        readonly internalType: "uint256";
        readonly name: "safeTxGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "baseGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasPrice";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "gasToken";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "refundReceiver";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "_nonce";
        readonly type: "uint256";
    }];
    readonly name: "encodeTransactionData";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
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
    }, {
        readonly internalType: "uint256";
        readonly name: "safeTxGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "baseGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasPrice";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "gasToken";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "refundReceiver";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "_nonce";
        readonly type: "uint256";
    }];
    readonly name: "getTransactionHash";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}];
/**
 * Represents the ABI of the Safe contract version 1.1.1.
 *
 * @type {SafeContract_v1_1_1_Abi}
 */
export type SafeContract_v1_1_1_Abi = typeof safeContract_v1_1_1_AbiTypes;
/**
 * Represents the function type derived by the given function name from the Safe contract version 1.1.1 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {SafeContract_v1_1_1_Function}
 */
export type SafeContract_v1_1_1_Function<ContractFunctionName extends ExtractAbiFunctionNames<SafeContract_v1_1_1_Abi>> = ContractFunction<SafeContract_v1_1_1_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a Safe contract version 1.1.1, defining read and write methods.
 * Utilizes the generic SafeBaseContract with the ABI specific to version 1.1.1.
 *
 * @type {SafeContract_v1_1_1_Contract}
 */
export type SafeContract_v1_1_1_Contract = SafeBaseContract<SafeContract_v1_1_1_Abi>;
export {};
