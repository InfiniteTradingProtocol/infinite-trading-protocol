import type { Address } from 'abitype';
import * as Hex from 'ox/Hex';
import type { Account } from '../../accounts/types.js';
import type { ReadContractReturnType } from '../../actions/public/readContract.js';
import { type SendTransactionReturnType, sendTransaction } from '../../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../../actions/wallet/sendTransactionSync.js';
import type { Client } from '../../clients/createClient.js';
import type { Transport } from '../../clients/transports/createTransport.js';
import type { BaseErrorType } from '../../errors/base.js';
import type { Chain } from '../../types/chain.js';
import type { GetEventArgs } from '../../types/contract.js';
import type { Log } from '../../types/log.js';
import type { Compute, UnionOmit } from '../../types/utils.js';
import * as Abis from '../Abis.js';
import type * as Errors from '../errors.js';
import type { ReadParameters, WriteParameters } from '../internal/types.js';
import type { TransactionReceipt } from '../Transaction.js';
import * as simulateActions from './simulate.js';
/**
 * Reads the base token of a propAMM pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const token = await Actions.propAmm.baseToken(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Base token address.
 */
export declare function baseToken<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: baseToken.Parameters): Promise<baseToken.ReturnValue>;
export declare namespace baseToken {
    type Args = {
        /** Pool address. */
        pool: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'baseToken'>;
    /**
     * Defines the pool's `baseToken` call.
     */
    function call({ pool }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "baseToken";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
                readonly internalType: "contract ITIP20";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "baseToken";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Reads the quote token of a propAMM pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const token = await Actions.propAmm.quoteToken(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Quote token address.
 */
export declare function quoteToken<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: quoteToken.Parameters): Promise<quoteToken.ReturnValue>;
export declare namespace quoteToken {
    type Args = {
        /** Pool address. */
        pool: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'quoteToken'>;
    /**
     * Defines the pool's `quoteToken` call.
     */
    function call({ pool }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "quoteToken";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "address";
                readonly internalType: "contract ITIP20";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "quoteToken";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Reads whether a propAMM pool is paused.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const isPaused = await Actions.propAmm.paused(client, { pool: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool and read options.
 * @returns Whether swaps are paused.
 */
export declare function paused<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: paused.Parameters): Promise<paused.ReturnValue>;
export declare namespace paused {
    type Args = {
        /** Pool address. */
        pool: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'paused'>;
    /**
     * Defines the pool's `paused` call.
     */
    function call({ pool }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "paused";
            readonly inputs: readonly [];
            readonly outputs: readonly [{
                readonly name: "";
                readonly type: "bool";
                readonly internalType: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "paused";
    } & {
        args?: readonly [] | undefined;
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Reads whether an address may call swaps on a pool.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const allowed = await Actions.propAmm.takerAllowed(client, { pool: '0x...', taker: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, taker, and read options.
 * @returns Whether the taker is allowed.
 */
export declare function takerAllowed<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: takerAllowed.Parameters): Promise<takerAllowed.ReturnValue>;
export declare namespace takerAllowed {
    type Args = {
        /** Pool address. */
        pool: Address;
        /** Address that calls the swap. */
        taker: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'takerAllowed'>;
    /**
     * Defines the pool's `takerAllowed` call.
     */
    function call({ pool, taker }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "takerAllowed";
            readonly inputs: readonly [{
                readonly name: "taker";
                readonly type: "address";
                readonly internalType: "address";
            }];
            readonly outputs: readonly [{
                readonly name: "allowed";
                readonly type: "bool";
                readonly internalType: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "takerAllowed";
    } & {
        args: readonly [taker: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Reads whether a resolved address may receive swap output.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const allowed = await Actions.propAmm.recipientAllowed(client, { pool: '0x...', recipient: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, resolved recipient, and read options.
 * @returns Whether the resolved recipient is allowed.
 */
export declare function recipientAllowed<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: recipientAllowed.Parameters): Promise<recipientAllowed.ReturnValue>;
export declare namespace recipientAllowed {
    type Args = {
        /** Pool address. */
        pool: Address;
        /** Resolved address to check. */
        recipient: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'recipientAllowed'>;
    /**
     * Defines the pool's `recipientAllowed` call.
     */
    function call({ pool, recipient }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "recipientAllowed";
            readonly inputs: readonly [{
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }];
            readonly outputs: readonly [{
                readonly name: "allowed";
                readonly type: "bool";
                readonly internalType: "bool";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "recipientAllowed";
    } & {
        args: readonly [recipient: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Resolves a Tempo recipient to the address checked by the pool's allowlist.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const resolved = await Actions.propAmm.resolveRecipient(client, { pool: '0x...', recipient: '0x...' })
 * ```
 *
 * @param client - Client.
 * @param parameters - Pool, recipient, and read options.
 * @returns Resolved recipient address.
 */
export declare function resolveRecipient<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: resolveRecipient.Parameters): Promise<resolveRecipient.ReturnValue>;
export declare namespace resolveRecipient {
    type Args = {
        /** Pool address. */
        pool: Address;
        /** Destination provided to the swap. */
        recipient: Address;
    };
    type Parameters = ReadParameters & Args;
    type ReturnValue = ReadContractReturnType<typeof Abis.directPropAmm, 'resolveRecipient'>;
    /**
     * Defines the pool's `resolveRecipient` call.
     */
    function call({ pool, recipient }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "resolveRecipient";
            readonly inputs: readonly [{
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }];
            readonly outputs: readonly [{
                readonly name: "resolved";
                readonly type: "address";
                readonly internalType: "address";
            }];
            readonly stateMutability: "view";
        }];
        functionName: "resolveRecipient";
    } & {
        args: readonly [recipient: `0x${string}`];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
}
/**
 * Quotes an exact input or exact output for a caller, recipient, and customer route.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http() })
 *
 * const { amountOut, price, updatedAt } = await Actions.propAmm.getSwapQuote(client, {
 *   pool: '0x...',
 *   taker: '0x...',
 *   recipient: '0x...',
 *   mode: 'exactInput',
 *   amountIn: 1_000_000n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Route, swap mode, amount, and read options. Taker defaults to the read or client account.
 * @returns Quoted amount, oracle observation, rounding credit, and swap request.
 */
export declare function getSwapQuote<chain extends Chain | undefined, const parameters extends getSwapQuote.Parameters>(client: Client<Transport, chain>, parameters: parameters): Promise<getSwapQuote.ReturnValue<parameters>>;
export declare namespace getSwapQuote {
    type Args = {
        /** True sends base and receives quote; false sends quote and receives base. */
        baseToQuote: boolean;
        /** Nonzero attribution and rounding-route identifier. */
        customerId: Hex.Hex;
        /** Pool address. */
        pool: Address;
        /** Destination of the output token. */
        recipient: Address;
        /** Address that will call the swap. */
        taker: Address;
    } & ({
        /** Exact-input quote. */
        mode: 'exactInput';
        /** Input amount in token base units. */
        amountIn: bigint;
    } | {
        /** Exact-output quote. */
        mode: 'exactOutput';
        /** Output amount in token base units. */
        amountOut: bigint;
    });
    type Parameters = ReadParameters & UnionOmit<Args, 'baseToQuote' | 'customerId' | 'recipient' | 'taker'> & {
        /** True sends base and receives quote. Defaults to true. */
        baseToQuote?: boolean | undefined;
        /** Route identifier. Defaults to the taker address left-padded to 32 bytes. */
        customerId?: Hex.Hex | undefined;
        /** Output destination. Defaults to the read account or client account. */
        recipient?: Address | undefined;
        /** Address that will call the swap. Defaults to the read account or client account. */
        taker?: Address | undefined;
    };
    /** Quoted amount, oracle observation, rounding credit, and swap request. */
    type ReturnValue<parameters extends Parameters = Parameters> = Compute<{
        /** Oracle price used for the quote. */
        price: bigint;
        /** Oracle observation timestamp. */
        updatedAt: bigint;
        /** Route's remaining rounding credit. */
        creditAfter: bigint;
    } & (parameters extends {
        mode: 'exactInput';
    } ? {
        /** Quoted output amount in token base units. */
        amountOut: bigint;
        /** Swap inputs bound to this quote. */
        request: Omit<Extract<swap.Args, {
            mode: 'exactInput';
        }>, 'deadline' | 'tradeId'>;
    } : {
        /** Required input amount in token base units. */
        amountIn: bigint;
        /** Swap inputs bound to this quote. */
        request: Omit<Extract<swap.Args, {
            mode: 'exactOutput';
        }>, 'deadline' | 'tradeId'>;
    })>;
    /**
     * Defines a route-aware quote call.
     */
    function call(parameters: Extract<Args, {
        mode: 'exactInput';
    }>): ReturnType<typeof quoteExactInputCall>;
    function call(parameters: Extract<Args, {
        mode: 'exactOutput';
    }>): ReturnType<typeof quoteExactOutputCall>;
    function call(parameters: Args): ReturnType<typeof quoteExactInputCall> | ReturnType<typeof quoteExactOutputCall>;
}
declare function quoteExactInputCall(parameters: Extract<getSwapQuote.Args, {
    mode: 'exactInput';
}>): {
    abi: [{
        readonly type: "function";
        readonly name: "quoteExactInputFor";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "creditAfter";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }];
    functionName: "quoteExactInputFor";
} & {
    args: readonly [taker: `0x${string}`, recipient: `0x${string}`, `0x${string}`, boolean, amountIn: bigint];
} & {
    address: Address;
} & {
    data: import("../../index.js").Hex;
    to: Address;
};
declare function quoteExactOutputCall(parameters: Extract<getSwapQuote.Args, {
    mode: 'exactOutput';
}>): {
    abi: [{
        readonly type: "function";
        readonly name: "quoteExactOutputFor";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "creditAfter";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }];
    functionName: "quoteExactOutputFor";
} & {
    args: readonly [taker: `0x${string}`, recipient: `0x${string}`, `0x${string}`, boolean, amountOut: bigint];
} & {
    address: Address;
} & {
    data: import("../../index.js").Hex;
    to: Address;
};
/**
 * Internal exact-input contract call.
 */
declare namespace exactInput {
    type Args = {
        amountIn: bigint;
        baseToQuote: boolean;
        customerId: Hex.Hex;
        deadline: bigint;
        expectedOraclePrice: bigint;
        minAmountOut: bigint;
        minimumOracleUpdatedAt: bigint;
        oraclePriceToleranceBps: bigint;
        pool: Address;
        recipient: Address;
        tradeId: Hex.Hex;
    };
    function call({ amountIn, baseToQuote, customerId, deadline, expectedOraclePrice, minAmountOut, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "swapExactInput";
            readonly inputs: readonly [{
                readonly name: "baseToQuote";
                readonly type: "bool";
                readonly internalType: "bool";
            }, {
                readonly name: "amountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minAmountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "customerId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "tradeId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "deadline";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "expectedOraclePrice";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "oraclePriceToleranceBps";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minimumOracleUpdatedAt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "amountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "swapExactInput";
    } & {
        args: readonly [boolean, amountIn: bigint, minAmountOut: bigint, recipient: `0x${string}`, `0x${string}`, `0x${string}`, deadline: bigint, bigint, bigint, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
}
/**
 * Internal exact-output contract call.
 */
declare namespace exactOutput {
    type Args = {
        amountOut: bigint;
        baseToQuote: boolean;
        customerId: Hex.Hex;
        deadline: bigint;
        expectedOraclePrice: bigint;
        maxAmountIn: bigint;
        minimumOracleUpdatedAt: bigint;
        oraclePriceToleranceBps: bigint;
        pool: Address;
        recipient: Address;
        tradeId: Hex.Hex;
    };
    function call({ amountOut, baseToQuote, customerId, deadline, expectedOraclePrice, maxAmountIn, minimumOracleUpdatedAt, oraclePriceToleranceBps, pool, recipient, tradeId, }: Args): {
        abi: [{
            readonly type: "function";
            readonly name: "swapExactOutput";
            readonly inputs: readonly [{
                readonly name: "baseToQuote";
                readonly type: "bool";
                readonly internalType: "bool";
            }, {
                readonly name: "amountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maxAmountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "customerId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "tradeId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "deadline";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "expectedOraclePrice";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "oraclePriceToleranceBps";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minimumOracleUpdatedAt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "amountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "swapExactOutput";
    } & {
        args: readonly [boolean, amountOut: bigint, maxAmountIn: bigint, recipient: `0x${string}`, `0x${string}`, `0x${string}`, deadline: bigint, bigint, bigint, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    };
}
/**
 * Approves the input token and swaps through an allowed propAMM pool in one transaction.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http(), account: '0x...' })
 *
 * const hash = await Actions.propAmm.swap(client, {
 *   pool: '0x...',
 *   mode: 'exactInput',
 *   amountIn: 1_000_000n,
 *   minAmountOut: 1_000_000n,
 *   expectedOraclePrice: 1_000_000_000_000_000_000n,
 *   minimumOracleUpdatedAt: 1_799_999_000n,
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Swap and transaction options.
 * @returns Transaction hash.
 */
export declare function swap<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: swap.Parameters<chain, account>): Promise<swap.ReturnValue>;
export declare namespace swap {
    type Args = {
        /** True sends base and receives quote; false sends quote and receives base. */
        baseToQuote: boolean;
        /** Nonzero attribution and rounding-route identifier. */
        customerId: Hex.Hex;
        /** Last accepted execution timestamp in seconds. */
        deadline: bigint;
        /** Oracle price returned by the quote. */
        expectedOraclePrice: bigint;
        /** Earliest accepted oracle observation timestamp. */
        minimumOracleUpdatedAt: bigint;
        /** Accepted oracle-price movement in basis points. Zero binds exactly. */
        oraclePriceToleranceBps: bigint;
        /** Pool address. */
        pool: Address;
        /** Destination of the output token. */
        recipient: Address;
        /** Trade attribution value, not replay protection. */
        tradeId: Hex.Hex;
    } & ({
        /** Exact-input swap. */
        mode: 'exactInput';
        /** Exact input amount in token base units. */
        amountIn: bigint;
        /** Lowest accepted output in token base units. */
        minAmountOut: bigint;
    } | {
        /** Exact-output swap. */
        mode: 'exactOutput';
        /** Exact output amount in token base units. */
        amountOut: bigint;
        /** Highest accepted input in token base units; unused approval remains. */
        maxAmountIn: bigint;
    });
    type InputArgs = UnionOmit<Args, 'baseToQuote' | 'customerId' | 'deadline' | 'oraclePriceToleranceBps' | 'recipient' | 'tradeId'> & {
        /** True sends base and receives quote. Defaults to true. */
        baseToQuote?: boolean | undefined;
        /** Route identifier. Defaults to the sender address left-padded to 32 bytes. */
        customerId?: Hex.Hex | undefined;
        /** Last accepted execution timestamp. Defaults to five minutes from now. */
        deadline?: bigint | undefined;
        /** Output destination. Defaults to the sending account. */
        recipient?: Address | undefined;
        /** Accepted oracle-price movement in basis points. Defaults to zero. */
        oraclePriceToleranceBps?: bigint | undefined;
        /** Trade attribution value. Defaults to a random 32-byte value per swap. */
        tradeId?: Hex.Hex | undefined;
    };
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = WriteParameters<chain, account> & InputArgs;
    type ReturnValue = SendTransactionReturnType;
    type ErrorType = Errors.ExecutionErrorType | BaseErrorType;
    /** @internal */
    function inner<action extends typeof sendTransaction | typeof sendTransactionSync, chain extends Chain | undefined, account extends Account | undefined>(action: action, client: Client<Transport, chain, account>, parameters: Parameters<chain, account>): Promise<ReturnType<action>>;
    /**
     * Estimates gas for the approval and swap transaction.
     *
     * @param client - Client.
     * @param parameters - Swap and transaction options.
     * @returns The gas estimate.
     */
    function estimateGas<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: Parameters<chain, account>): Promise<bigint>;
    /**
     * Simulates the approval and swap calls without submitting a transaction.
     *
     * @param client - Client.
     * @param parameters - Swap and simulation options.
     * @returns The approval and swap simulation results.
     */
    function simulate<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: simulate.Parameters): Promise<simulateActions.simulateCalls.ReturnType<readonly [{
        abi: [{
            readonly name: "approve";
            readonly type: "function";
            readonly stateMutability: "nonpayable";
            readonly inputs: readonly [{
                readonly type: "address";
                readonly name: "spender";
            }, {
                readonly type: "uint256";
                readonly name: "amount";
            }];
            readonly outputs: readonly [{
                readonly type: "bool";
            }];
        }];
        functionName: "approve";
    } & {
        args: readonly [spender: `0x${string}`, amount: bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }, ({
        abi: [{
            readonly type: "function";
            readonly name: "swapExactInput";
            readonly inputs: readonly [{
                readonly name: "baseToQuote";
                readonly type: "bool";
                readonly internalType: "bool";
            }, {
                readonly name: "amountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minAmountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "customerId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "tradeId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "deadline";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "expectedOraclePrice";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "oraclePriceToleranceBps";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minimumOracleUpdatedAt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "amountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "swapExactInput";
    } & {
        args: readonly [boolean, amountIn: bigint, minAmountOut: bigint, recipient: `0x${string}`, `0x${string}`, `0x${string}`, deadline: bigint, bigint, bigint, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    }) | ({
        abi: [{
            readonly type: "function";
            readonly name: "swapExactOutput";
            readonly inputs: readonly [{
                readonly name: "baseToQuote";
                readonly type: "bool";
                readonly internalType: "bool";
            }, {
                readonly name: "amountOut";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maxAmountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "recipient";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "customerId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "tradeId";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "deadline";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "expectedOraclePrice";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "oraclePriceToleranceBps";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "minimumOracleUpdatedAt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly outputs: readonly [{
                readonly name: "amountIn";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }];
            readonly stateMutability: "nonpayable";
        }];
        functionName: "swapExactOutput";
    } & {
        args: readonly [boolean, amountOut: bigint, maxAmountIn: bigint, recipient: `0x${string}`, `0x${string}`, `0x${string}`, deadline: bigint, bigint, bigint, bigint];
    } & {
        address: Address;
    } & {
        data: import("../../index.js").Hex;
        to: Address;
    })]>>;
    namespace simulate {
        /** Swap inputs and batch simulation options. */
        type Parameters = InputArgs & Omit<simulateActions.simulateCalls.Parameters, 'calls'>;
    }
    /**
     * Defines the raw swap call without its input-token approval.
     */
    function call(parameters: Extract<Args, {
        mode: 'exactInput';
    }>): ReturnType<typeof exactInput.call>;
    function call(parameters: Extract<Args, {
        mode: 'exactOutput';
    }>): ReturnType<typeof exactOutput.call>;
    function call(parameters: Args): ReturnType<typeof exactInput.call> | ReturnType<typeof exactOutput.call>;
    /**
     * Extracts the unique matching trade event from a receipt.
     */
    function extractEvent(logs: Log[], args: {
        pool: Address;
        tradeId: Hex.Hex;
    }): Log<bigint, number, false, undefined, true, readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [{
            readonly name: "baseToken_";
            readonly type: "address";
            readonly internalType: "contract ITIP20";
        }, {
            readonly name: "quoteToken_";
            readonly type: "address";
            readonly internalType: "contract ITIP20";
        }, {
            readonly name: "oracle_";
            readonly type: "address";
            readonly internalType: "contract IPriceOracle";
        }, {
            readonly name: "addressRegistry_";
            readonly type: "address";
            readonly internalType: "contract IAddressRegistry";
        }, {
            readonly name: "owner_";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "guardian_";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "maxOracleAge_";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maxPriceDeviationBps_";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "BPS";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "acceptOwnership";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "addressRegistry";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "contract IAddressRegistry";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "baseDecimals";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "baseToQuotePriceAnchor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "baseToken";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "contract ITIP20";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "fund";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "memo";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "guardian";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxOracleAge";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint80";
            readonly internalType: "uint80";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "maxPriceDeviationBps";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint16";
            readonly internalType: "uint16";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "oracle";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "contract IPriceOracle";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "oracleDecimals";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "owner";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pause";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "paused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pendingOwner";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "priceAnchor";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "priceScale";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteDecimals";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteExactInput";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteExactInputFor";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "creditAfter";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteExactOutput";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteExactOutputFor";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "creditAfter";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteToBasePriceAnchor";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "quoteToken";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "contract ITIP20";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "recipientAllowed";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "allowed";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "resetPriceAnchor";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "resolveRecipient";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "resolved";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "roundingCredit";
        readonly inputs: readonly [{
            readonly name: "routeKey";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "credit";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "roundingRouteKey";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "setGuardian";
        readonly inputs: readonly [{
            readonly name: "newGuardian";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxOracleAge";
        readonly inputs: readonly [{
            readonly name: "newMaxOracleAge";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxPriceDeviationBps";
        readonly inputs: readonly [{
            readonly name: "newMaxPriceDeviationBps";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setOracle";
        readonly inputs: readonly [{
            readonly name: "newOracle";
            readonly type: "address";
            readonly internalType: "contract IPriceOracle";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setRecipientAllowed";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "allowed";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setTakerAllowed";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "allowed";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "swapExactInput";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "minAmountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "tradeId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "deadline";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "expectedOraclePrice";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "oraclePriceToleranceBps";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "minimumOracleUpdatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "swapExactOutput";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maxAmountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "tradeId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "deadline";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "expectedOraclePrice";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "oraclePriceToleranceBps";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "minimumOracleUpdatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [{
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "takerAllowed";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "allowed";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "transferOwnership";
        readonly inputs: readonly [{
            readonly name: "newOwner";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "unpause";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "withdraw";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "memo";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "event";
        readonly name: "Funded";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "memo";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "GuardianUpdated";
        readonly inputs: readonly [{
            readonly name: "oldGuardian";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "newGuardian";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxOracleAgeUpdated";
        readonly inputs: readonly [{
            readonly name: "oldMaxAge";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "newMaxAge";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxPriceDeviationBpsUpdated";
        readonly inputs: readonly [{
            readonly name: "oldMaxPriceDeviationBps";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "newMaxPriceDeviationBps";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OracleUpdated";
        readonly inputs: readonly [{
            readonly name: "oldOracle";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "newOracle";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "decimals";
            readonly type: "uint8";
            readonly indexed: false;
            readonly internalType: "uint8";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OwnershipTransferStarted";
        readonly inputs: readonly [{
            readonly name: "oldOwner";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "pendingOwner";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OwnershipTransferred";
        readonly inputs: readonly [{
            readonly name: "oldOwner";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "newOwner";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "PausedStateChanged";
        readonly inputs: readonly [{
            readonly name: "paused";
            readonly type: "bool";
            readonly indexed: false;
            readonly internalType: "bool";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "PriceAnchorUpdated";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly indexed: true;
            readonly internalType: "bool";
        }, {
            readonly name: "oldAnchor";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "newAnchor";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RecipientPermissionUpdated";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "allowed";
            readonly type: "bool";
            readonly indexed: false;
            readonly internalType: "bool";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RoundingCreditUpdated";
        readonly inputs: readonly [{
            readonly name: "routeKey";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }, {
            readonly name: "previousCredit";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "newCredit";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "TakerPermissionUpdated";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "allowed";
            readonly type: "bool";
            readonly indexed: false;
            readonly internalType: "bool";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "TradeExecuted";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "customerId";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }, {
            readonly name: "tradeId";
            readonly type: "bytes32";
            readonly indexed: false;
            readonly internalType: "bytes32";
        }, {
            readonly name: "tokenIn";
            readonly type: "address";
            readonly indexed: false;
            readonly internalType: "address";
        }, {
            readonly name: "tokenOut";
            readonly type: "address";
            readonly indexed: false;
            readonly internalType: "address";
        }, {
            readonly name: "amountIn";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "amountOut";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "oraclePrice";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "oracleUpdatedAt";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "Withdrawn";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "recipient";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "memo";
            readonly type: "bytes32";
            readonly indexed: false;
            readonly internalType: "bytes32";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "AmountIsZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "CustomerIdIsZero";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "DeadlineExpired";
        readonly inputs: readonly [{
            readonly name: "deadline";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "currentTimestamp";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "ExactBalanceDeltaFailed";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "expected";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "FutureOracleTimestamp";
        readonly inputs: readonly [{
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "currentTime";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InsufficientInventory";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "available";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "required";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InvalidAddress";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidMaxOracleAge";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidMaxPriceDeviationBps";
        readonly inputs: readonly [{
            readonly name: "supplied";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maximum";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InvalidOraclePriceToleranceBps";
        readonly inputs: readonly [{
            readonly name: "supplied";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maximum";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "InvalidPrice";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotGuardianOrOwner";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOwner";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotPendingOwner";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OracleDecimalsChanged";
        readonly inputs: readonly [{
            readonly name: "currentDecimals";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }, {
            readonly name: "proposedDecimals";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }];
    }, {
        readonly type: "error";
        readonly name: "OraclePriceToleranceExceeded";
        readonly inputs: readonly [{
            readonly name: "expectedPrice";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "actualPrice";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "toleranceBps";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "OracleTimestampTooOld";
        readonly inputs: readonly [{
            readonly name: "minimumUpdatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "actualUpdatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "Paused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "PriceAnchorNotInitialized";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
    }, {
        readonly type: "error";
        readonly name: "PriceDeviationExceeded";
        readonly inputs: readonly [{
            readonly name: "baseToQuote";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "price";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "anchor";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maxDeviationBps";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "RecipientNotAllowed";
        readonly inputs: readonly [{
            readonly name: "recipient";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "ReentrancyGuardReentrantCall";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "SameToken";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "SlippageExceeded";
        readonly inputs: readonly [{
            readonly name: "limit";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "actual";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "StaleOraclePrice";
        readonly inputs: readonly [{
            readonly name: "updatedAt";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "maxAge";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
    }, {
        readonly type: "error";
        readonly name: "TakerNotAllowed";
        readonly inputs: readonly [{
            readonly name: "taker";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "TokenTransferFailed";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }, {
        readonly type: "error";
        readonly name: "UnsupportedDecimals";
        readonly inputs: readonly [{
            readonly name: "baseDecimals";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }, {
            readonly name: "quoteDecimals";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }, {
            readonly name: "oracleDecimals";
            readonly type: "uint8";
            readonly internalType: "uint8";
        }];
    }, {
        readonly type: "error";
        readonly name: "UnsupportedToken";
        readonly inputs: readonly [{
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }];
    }], "TradeExecuted">;
}
/**
 * Approves the input token, swaps, and returns the confirmed trade and receipt.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempo } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({ chain: tempo, transport: http(), account: '0x...' })
 *
 * const trade = await Actions.propAmm.swapSync(client, {
 *   pool: '0x...',
 *   mode: 'exactInput',
 *   amountIn: 1_000_000n,
 *   minAmountOut: 1_000_000n,
 *   expectedOraclePrice: 1_000_000_000_000_000_000n,
 *   minimumOracleUpdatedAt: 1_799_999_000n,
 * })
 * console.log(trade.amountOut, trade.receipt.transactionHash)
 * ```
 *
 * @param client - Client.
 * @param parameters - Swap and transaction options.
 * @returns Confirmed trade data and receipt.
 */
export declare function swapSync<chain extends Chain | undefined, account extends Account | undefined>(client: Client<Transport, chain, account>, parameters: swapSync.Parameters<chain, account>): Promise<swapSync.ReturnValue>;
export declare namespace swapSync {
    type Args = swap.InputArgs;
    type Parameters<chain extends Chain | undefined = Chain | undefined, account extends Account | undefined = Account | undefined> = swap.Parameters<chain, account>;
    type ReturnValue = Compute<GetEventArgs<typeof Abis.directPropAmm, 'TradeExecuted', {
        IndexedOnly: false;
        Required: true;
    }> & {
        /** Confirmed receipt. */
        receipt: TransactionReceipt;
    }>;
    type ErrorType = swap.ErrorType;
}
export {};
//# sourceMappingURL=propAmm.d.ts.map