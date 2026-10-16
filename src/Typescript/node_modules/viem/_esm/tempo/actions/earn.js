import { Hex } from 'ox';
import { EarnShares, TokenId } from 'ox/tempo';
import { parseAccount } from '../../accounts/utils/parseAccount.js';
import { estimateContractGas } from '../../actions/public/estimateContractGas.js';
import { getBlockNumber } from '../../actions/public/getBlockNumber.js';
import { getLogs } from '../../actions/public/getLogs.js';
import { multicall } from '../../actions/public/multicall.js';
import { readContract, } from '../../actions/public/readContract.js';
import { simulateContract, } from '../../actions/public/simulateContract.js';
import * as internal_Token from '../../actions/token/internal.js';
import { sendTransaction, } from '../../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../../actions/wallet/sendTransactionSync.js';
import { writeContractSync } from '../../actions/wallet/writeContractSync.js';
import { AccountNotFoundError } from '../../errors/account.js';
import { encodeAbiParameters } from '../../utils/abi/encodeAbiParameters.js';
import { getAbiItem } from '../../utils/abi/getAbiItem.js';
import { parseEventLogs } from '../../utils/abi/parseEventLogs.js';
import { getAddress } from '../../utils/address/getAddress.js';
import { isAddressEqual } from '../../utils/address/isAddressEqual.js';
import { observe } from '../../utils/observe.js';
import { poll } from '../../utils/poll.js';
import { withResolvers } from '../../utils/promise/withResolvers.js';
import { stringify } from '../../utils/stringify.js';
import * as Abis from '../Abis.js';
import * as Addresses from '../Addresses.js';
import { GetVaultEngineChangedError, WaitForPrivateDepositTimeoutError, WaitForPrivateRedeemTimeoutError, } from '../errors.js';
import { withExecutionError } from '../internal/errors.js';
import { defineCall, pickWriteParameters, resolveCallParameters, resolveTokenWithDecimals, } from '../internal/utils.js';
import * as policyActions from './policy.js';
import * as tokenActions from './token.js';
import * as zoneActions from './zone.js';
// biome-ignore lint/performance/noBarrelFile: namespace module
export * from './earn/deployment.js';
/** TIP-403 policy ID that allows every sender, recipient, and mint recipient. */
export const alwaysAllowPolicyId = 1n;
/**
 * Creates and attaches an admission-only TIP-403 policy to an Earn share
 * token. Existing holders remain able to send shares while recipients and mint
 * recipients must belong to the same whitelist.
 *
 * The action submits three or four sequential transactions and is not atomic.
 * Use {@link validateExitSafePolicy} to verify the final state.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const account = privateKeyToAccount('0x...')
 * const client = createClient({
 *   account,
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { policy, receipts } =
 *   await Actions.earn.configureExitSafePolicy(client, {
 *     accessAdministrator: '0x...',
 *     initialMembers: ['0x...', '0x...'],
 *     shareToken: '0x...',
 *   })
 * ```
 *
 * @param client - Client authorized to change the Earn share token policy.
 * @param parameters - Share token, administrator, and initial members.
 * @returns The configured policy IDs and transaction receipts.
 */
export async function configureExitSafePolicy(client, parameters) {
    const account_ = parameters.account ?? client.account;
    if (!account_)
        throw new AccountNotFoundError();
    const account = parseAccount(account_);
    const initialMembers = [
        ...new Set(parameters.initialMembers.map((member) => getAddress(member))),
    ];
    if (initialMembers.length === 0)
        throw new Error('At least one initial policy member is required.');
    const eligibility = await policyActions.createSync(client, {
        account,
        addresses: initialMembers,
        chain: client.chain,
        type: 'whitelist',
    });
    if (eligibility.receipt.status === 'pending')
        return { receipt: eligibility.receipt };
    const compoundPolicy = await writeContractSync(client, {
        account,
        abi: Abis.tip403Registry,
        address: Addresses.tip403Registry,
        args: [alwaysAllowPolicyId, eligibility.policyId, eligibility.policyId],
        chain: client.chain,
        functionName: 'createCompoundPolicy',
        throwOnReceiptRevert: true,
    });
    if (compoundPolicy.status === 'pending')
        return { receipt: compoundPolicy };
    const [compoundEvent] = parseEventLogs({
        abi: Abis.tip403Registry,
        eventName: 'CompoundPolicyCreated',
        logs: compoundPolicy.logs,
        strict: true,
    });
    if (!compoundEvent)
        throw new Error('`CompoundPolicyCreated` event not found.');
    const tokenPolicy = await tokenActions.changeTransferPolicySync(client, {
        account,
        chain: client.chain,
        policyId: compoundEvent.args.policyId,
        token: parameters.shareToken,
    });
    if (tokenPolicy.receipt.status === 'pending')
        return { receipt: tokenPolicy.receipt };
    const policyAdmin = isAddressEqual(parameters.accessAdministrator, account.address)
        ? undefined
        : await policyActions.setAdminSync(client, {
            account,
            admin: parameters.accessAdministrator,
            chain: client.chain,
            policyId: eligibility.policyId,
        });
    if (policyAdmin &&
        policyAdmin.receipt.status === 'pending')
        return { receipt: policyAdmin.receipt };
    return {
        policy: {
            transferPolicyId: compoundEvent.args.policyId,
            senderPolicyId: alwaysAllowPolicyId,
            recipientPolicyId: eligibility.policyId,
            mintRecipientPolicyId: eligibility.policyId,
        },
        receipts: {
            eligibilityPolicy: eligibility.receipt,
            compoundPolicy,
            tokenPolicy: tokenPolicy.receipt,
            policyAdmin: policyAdmin?.receipt,
        },
    };
}
/**
 * Verifies that an Earn share token uses the expected exit-safe TIP-403
 * policy and that every required member can receive transfers and mints.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * await Actions.earn.validateExitSafePolicy(client, {
 *   accessAdministrator: '0x...',
 *   policy: {
 *     transferPolicyId: 3n,
 *     senderPolicyId: 1n,
 *     recipientPolicyId: 2n,
 *     mintRecipientPolicyId: 2n,
 *   },
 *   requiredMembers: ['0x...', '0x...'],
 *   shareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Expected policy, administrator, and required members.
 * @returns Nothing when the policy is valid.
 */
export async function validateExitSafePolicy(client, parameters) {
    const { accessAdministrator, policy, requiredMembers, shareToken, ...rest } = parameters;
    const [tokenPolicyId, compound, simplePolicy, memberResults] = await Promise.all([
        withExecutionError(readContract)(client, {
            ...rest,
            abi: Abis.tip20,
            address: shareToken,
            functionName: 'transferPolicyId',
        }),
        withExecutionError(readContract)(client, {
            ...rest,
            abi: Abis.tip403Registry,
            address: Addresses.tip403Registry,
            args: [policy.transferPolicyId],
            functionName: 'compoundPolicyData',
        }),
        withExecutionError(readContract)(client, {
            ...rest,
            abi: Abis.tip403Registry,
            address: Addresses.tip403Registry,
            args: [policy.recipientPolicyId],
            functionName: 'policyData',
        }),
        Promise.all(requiredMembers.map(async (member) => {
            const [recipient, mintRecipient] = await Promise.all([
                withExecutionError(readContract)(client, {
                    ...rest,
                    abi: Abis.tip403Registry,
                    address: Addresses.tip403Registry,
                    args: [policy.transferPolicyId, member],
                    functionName: 'isAuthorizedRecipient',
                }),
                withExecutionError(readContract)(client, {
                    ...rest,
                    abi: Abis.tip403Registry,
                    address: Addresses.tip403Registry,
                    args: [policy.transferPolicyId, member],
                    functionName: 'isAuthorizedMintRecipient',
                }),
            ]);
            return { member, mintRecipient, recipient };
        })),
    ]);
    if (tokenPolicyId !== policy.transferPolicyId)
        throw new Error('Earn share token transfer policy mismatch.');
    if (compound[0] !== policy.senderPolicyId ||
        compound[1] !== policy.recipientPolicyId ||
        compound[2] !== policy.mintRecipientPolicyId)
        throw new Error('TIP-403 compound policy components mismatch.');
    if (policy.senderPolicyId !== alwaysAllowPolicyId)
        throw new Error('TIP-403 sender policy is not always allow.');
    if (policy.recipientPolicyId !== policy.mintRecipientPolicyId)
        throw new Error('TIP-403 recipient and mint-recipient policies must match.');
    if (simplePolicy[0] !== 0)
        throw new Error('TIP-403 eligibility policy is not a whitelist.');
    if (!isAddressEqual(simplePolicy[1], accessAdministrator))
        throw new Error('TIP-403 access administrator mismatch.');
    const unauthorized = memberResults.find((result) => !result.recipient || !result.mintRecipient);
    if (unauthorized)
        throw new Error(`Required TIP-403 member is unauthorized: ${unauthorized.member}`);
}
/**
 * Deposits assets into a vault and mints Earn shares to `recipient`. The
 * transaction includes the required asset approval.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.earn.deposit(client, {
 *   assetAmount: 100_000_000n,
 *   shareAmount: 99_900_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function deposit(client, parameters) {
    return deposit.inner(sendTransaction, client, parameters);
}
(function (deposit) {
    /** @internal Shared dispatch; reads the asset for the approval. */
    async function inner(action, client, parameters) {
        const [args, assetToken] = await Promise.all([
            toDepositArgs(client, parameters),
            withExecutionError(readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'asset',
            }),
        ]);
        return (await withExecutionError(action)(client, {
            ...parameters,
            calls: deposit.calls({ ...args, assetToken }),
        }));
    }
    deposit.inner = inner;
    /**
     * Defines a deposit call without an approval. Provide token decimals for
     * formatted inputs and an explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call(...parameters) {
        const [, args] = resolveCallParameters(parameters);
        const { recipient, vault } = args;
        const shareAmountMin = (() => {
            if (args.shareAmountMin !== undefined)
                return args.shareAmountMin;
            return EarnShares.minimumOutput(args.shareAmount, args.slippageBps);
        })();
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            functionName: 'deposit',
            args: [
                internal_Token.toBaseUnits(args.assetAmount, undefined),
                recipient,
                shareAmountMin,
            ],
        });
    }
    deposit.call = call;
    /**
     * Defines the asset approval and deposit calls for atomic execution. Pass
     * `assetToken` and token decimals explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { assetToken, vault } = args;
        const assetAmount = internal_Token.toBaseUnits(args.assetAmount, undefined);
        return [
            defineCall({
                address: TokenId.toAddress(assetToken),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, assetAmount],
            }),
            deposit.call({ ...args, assetAmount }),
        ];
    }
    deposit.calls = calls;
    /**
     * Extracts a `Deposited` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `Deposited` event.
     */
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        // Earn contracts are user-deployed: several adapters can emit the same
        // signature in one receipt, so filter by emitting address before decode.
        const [log] = parseEventLogs({
            abi: Abis.earnVault,
            eventName: 'Deposited',
            logs: logs.filter((log) => isAddressEqual(log.address, vault)),
        });
        if (!log)
            throw new Error('`Deposited` event not found.');
        return log;
    }
    deposit.extractEvent = extractEvent;
    /**
     * Estimates gas for a deposit, assuming the vault has enough asset allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    async function estimateGas(client, parameters) {
        return estimateContractGas(client, {
            ...pickWriteParameters(parameters),
            ...deposit.call(await toDepositArgs(client, parameters)),
        });
    }
    deposit.estimateGas = estimateGas;
    /**
     * Simulates a deposit, assuming the vault has enough asset allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    async function simulate(client, parameters) {
        return simulateContract(client, {
            ...pickWriteParameters(parameters),
            ...deposit.call(await toDepositArgs(client, parameters)),
        });
    }
    deposit.simulate = simulate;
})(deposit || (deposit = {}));
/**
 * Deposits assets and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions, EarnShares } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { shareAmount } = await Actions.earn.depositSync(client, {
 *   assetAmount: 100_000_000n,
 *   shareAmountMin: EarnShares.minimumOutput(99_900_000n, 50),
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function depositSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await deposit.inner(sendTransactionSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = deposit.extractEvent(receipt.logs, { vault });
    return {
        assetAmount: args.assets,
        caller: args.caller,
        receipt,
        recipient: args.receiver,
        shareAmount: args.earnShares,
    };
}
/**
 * Deposits venue shares into a vault and mints Earn shares to `recipient`.
 * The transaction includes the required venue share approval.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.earn.depositShares(client, {
 *   earnShareAmount: 499_000_000n,
 *   slippageBps: 30,
 *   vault: '0x...',
 *   venueShareAmount: 500_000_000n,
 *   venueShareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function depositShares(client, parameters) {
    return depositShares.inner(sendTransaction, client, parameters);
}
(function (depositShares) {
    /** @internal Shared dispatch; reads the engine for the approval. */
    async function inner(action, client, parameters) {
        const engine = await withExecutionError(readContract)(client, {
            abi: Abis.earnVault,
            address: parameters.vault,
            functionName: 'engine',
        });
        return (await withExecutionError(action)(client, {
            ...parameters,
            calls: depositShares.calls({
                ...toDepositSharesArgs(client, parameters),
                engine,
                venueShareToken: parameters.venueShareToken,
            }),
        }));
    }
    depositShares.inner = inner;
    /**
     * Defines a venue share deposit call without an approval. Provide an
     * explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call(...parameters) {
        const [, args] = resolveCallParameters(parameters);
        const { recipient, vault, venueShareAmount } = args;
        const earnShareAmountMin = (() => {
            if (args.earnShareAmountMin !== undefined)
                return args.earnShareAmountMin;
            return EarnShares.minimumOutput(args.earnShareAmount, args.slippageBps);
        })();
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            functionName: 'depositVenueShares',
            args: [venueShareAmount, recipient, earnShareAmountMin],
        });
    }
    depositShares.call = call;
    /**
     * Defines the venue share approval and deposit calls for atomic execution.
     * Pass the vault's current `engine` and `venueShareToken` explicitly.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { engine, venueShareAmount, venueShareToken } = args;
        return [
            defineCall({
                address: venueShareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [engine, venueShareAmount],
            }),
            depositShares.call(args),
        ];
    }
    depositShares.calls = calls;
    /**
     * Extracts a `VenueSharesDeposited` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `VenueSharesDeposited` event.
     */
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        // Earn contracts are user-deployed: several adapters can emit the same
        // signature in one receipt, so filter by emitting address before decode.
        const [log] = parseEventLogs({
            abi: Abis.earnVault,
            eventName: 'VenueSharesDeposited',
            logs: logs.filter((log) => isAddressEqual(log.address, vault)),
        });
        if (!log)
            throw new Error('`VenueSharesDeposited` event not found.');
        return log;
    }
    depositShares.extractEvent = extractEvent;
    /**
     * Estimates gas for a venue share deposit, assuming enough allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    async function estimateGas(client, parameters) {
        return estimateContractGas(client, {
            ...pickWriteParameters(parameters),
            ...depositShares.call(toDepositSharesArgs(client, parameters)),
        });
    }
    depositShares.estimateGas = estimateGas;
    /**
     * Simulates a venue share deposit, assuming enough allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    async function simulate(client, parameters) {
        return simulateContract(client, {
            ...pickWriteParameters(parameters),
            ...depositShares.call(toDepositSharesArgs(client, parameters)),
        });
    }
    depositShares.simulate = simulate;
})(depositShares || (depositShares = {}));
/**
 * Deposits venue shares and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions, EarnShares } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { earnShareAmount } = await Actions.earn.depositSharesSync(client, {
 *   earnShareAmount: 499_000_000n,
 *   slippageBps: 30,
 *   vault: '0x...',
 *   venueShareAmount: 500_000_000n,
 *   venueShareToken: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function depositSharesSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await depositShares.inner(sendTransactionSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = depositShares.extractEvent(receipt.logs, { vault });
    return {
        caller: args.caller,
        earnShareAmount: args.earnShares,
        receipt,
        receivedVenueShareAmount: args.receivedEngineShares,
        recipient: args.receiver,
        venueShareAmount: args.requestedVenueShares,
    };
}
/**
 * Withdraws assets from a Zone and deposits them into a vault on the parent
 * chain. Use {@link privateDeposit.prepare} to build the encrypted callback.
 *
 * @example
 * ```ts
 * const prepared = await Actions.earn.privateDeposit.prepare(parentClient, {
 *   assetAmount: 100_000_000n,
 *   assetToken: '0x...',
 *   gateway: '0x...',
 *   recipient: '0x...',
 *   shareAmountMin: 99_500_000n,
 *   tempoRefundRecipient: '0x...',
 *   vault: '0x...',
 *   vaultAssetAmountMin: 99_000_000n,
 *   zoneId: 7,
 * })
 * const hash = await Actions.earn.privateDeposit(zoneClient, prepared)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Prepared deposit and transaction parameters.
 * @returns The transaction hash.
 */
export async function privateDeposit(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawal(client, parameters);
}
(function (privateDeposit) {
    /**
     * Builds an encrypted Zone withdrawal that deposits into the selected vault
     * and returns the resulting shares to the Zone.
     *
     * @param client - Parent-chain client.
     * @param parameters - Deposit intent and recovery parameters.
     * @returns The prepared withdrawal and correlation data.
     */
    async function prepare(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { actionId = Hex.random(32), assetAmount, callbackGas = zoneGatewayCallbackGas, tempoRefundRecipient, fallbackRecipient = tempoRefundRecipient, gateway, portalAddress: portalAddress_, recipient, returnMemo, vault, withdrawalMemo, zoneId, } = parameters;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const readParameters = pickReadParameters(parameters);
        const [fromBlock, config] = await Promise.all([
            getBlockNumber(client, { cacheTime: 0 }),
            getZoneGatewayConfig(client, {
                ...readParameters,
                flow: 0,
                gateway,
                vault,
                zoneId,
                zonePortal: portalAddress,
            }),
        ]);
        const assetToken = parameters.assetToken ?? config.privateAsset;
        if (!isAddressEqual(assetToken, config.privateAsset))
            throw new Error('`assetToken` must match the Zone gateway private asset.');
        const { encrypted, keyIndex } = await zoneActions.encryptedDeposit.prepareRecipient(client, {
            ...readParameters,
            memo: returnMemo,
            portalAddress: config.zonePortal,
            recipient,
            sender: gateway,
            zoneId: config.zoneId,
        });
        const shareAmountMin = resolveMinimumShareAmount(parameters);
        const data = encodeAbiParameters(Abis.earnRouterCallbackData, [
            {
                actionId,
                flow: 0,
                minEarnShares: shareAmountMin,
                minOutputAmount: 0n,
                minVaultAssets: parameters.vaultAssetAmountMin ?? assetAmount,
                zoneReturn: {
                    encrypted,
                    keyIndex,
                    refundRecipient: tempoRefundRecipient,
                },
            },
        ]);
        return {
            actionId,
            amount: assetAmount,
            callbackGas,
            chainId,
            data,
            fallbackRecipient,
            fromBlock,
            memo: withdrawalMemo,
            to: gateway,
            token: assetToken,
            zoneId: config.zoneId,
        };
    }
    privateDeposit.prepare = prepare;
    /**
     * Defines the approval and Zone withdrawal calls for a prepared deposit.
     *
     * @param args - Prepared deposit arguments.
     * @returns The Zone withdrawal calls.
     */
    function calls(args) {
        return zoneActions.requestWithdrawal.calls(args);
    }
    privateDeposit.calls = calls;
})(privateDeposit || (privateDeposit = {}));
/**
 * Requests a private Zone deposit and waits for the Zone transaction receipt.
 * The receipt confirms withdrawal acceptance, not the parent-chain deposit.
 *
 * @param client - Zone client.
 * @param parameters - Prepared deposit and transaction parameters.
 * @returns The Zone transaction receipt and parent-chain withdrawal sender tag.
 */
export async function privateDepositSync(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawalSync(client, parameters);
}
/**
 * Waits for a Zone gateway deposit to complete on the parent chain.
 *
 * @example
 * ```ts
 * const result = await Actions.earn.waitForPrivateDeposit(parentClient, {
 *   actionId: prepared.actionId,
 *   fromBlock: prepared.fromBlock,
 *   gateway: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Parent-chain client.
 * @param parameters - Prepared action correlation and polling parameters.
 * @returns The completed gateway deposit.
 */
export async function waitForPrivateDeposit(client, parameters) {
    const { actionId, fromBlock, gateway, pollingInterval = client.pollingInterval, timeout = 60_000, vault, } = parameters;
    const event = getAbiItem({
        abi: Abis.earnRouter,
        name: 'EarnDeposit',
    });
    const observerId = stringify([
        'waitForPrivateDeposit',
        client.uid,
        gateway,
        vault,
        actionId,
        fromBlock,
    ]);
    const { promise, reject, resolve } = withResolvers();
    let timer;
    let unobserve;
    const cleanup = () => {
        clearTimeout(timer);
        unobserve();
    };
    const resolve_ = (result) => {
        cleanup();
        resolve(result);
    };
    const reject_ = (error) => {
        cleanup();
        reject(error);
    };
    unobserve = observe(observerId, { reject: reject_, resolve: resolve_ }, (emit) => {
        const unpoll = poll(async () => {
            try {
                const [log] = await getLogs(client, {
                    address: gateway,
                    args: { actionId, earnVault: vault },
                    event,
                    fromBlock,
                    strict: true,
                    toBlock: 'latest',
                });
                if (!log)
                    return;
                unpoll();
                emit.resolve({
                    actionId: log.args.actionId,
                    inputAmount: log.args.inputAmount,
                    inputToken: log.args.inputToken,
                    shares: log.args.earnShares,
                    tempoBlockNumber: log.blockNumber,
                    vaultAssets: log.args.vaultAssets,
                    zoneDepositHash: log.args.zoneDepositHash,
                });
            }
            catch (error) {
                unpoll();
                emit.reject(error);
            }
        }, { emitOnBegin: true, interval: pollingInterval });
        return unpoll;
    });
    timer = timeout
        ? setTimeout(() => {
            reject_(new WaitForPrivateDepositTimeoutError({ actionId, gateway }));
        }, timeout)
        : undefined;
    return await promise;
}
/**
 * Gets the vault's active fee configuration, pending fees, and fee baselines.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const feeState = await Actions.earn.getFeeState(client, {
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The active fee configuration, pending fees, and baselines.
 */
export async function getFeeState(client, parameters) {
    const { recipient, vault, ...rest } = parameters;
    const fees = await withExecutionError(readContract)(client, {
        ...rest,
        abi: Abis.earnVault,
        address: vault,
        functionName: 'earnFees',
    });
    const contracts = [
        defineCall({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'currentFeeConfigId',
        }),
        defineCall({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'feesActive',
        }),
        defineCall({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'highWaterMark',
        }),
        defineCall({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'previewAccruedFees',
        }),
        defineCall({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'targetBase',
        }),
    ];
    // Stored configs are immutable per id, so a follow-up `feeConfig` read stays
    // consistent with the batched id.
    const feeConfig = async (configId) => toFeeConfig(await withExecutionError(readContract)(client, {
        ...rest,
        abi: Abis.earnFees,
        address: fees,
        functionName: 'feeConfig',
        args: [configId],
    }));
    if (recipient !== undefined) {
        const [configId, feesActive, highWaterMark, preview, targetBase, shares] = await multicall(client, {
            ...rest,
            allowFailure: false,
            contracts: [
                ...contracts,
                defineCall({
                    address: fees,
                    abi: Abis.earnFees,
                    functionName: 'claimableEarnShares',
                    args: [recipient],
                }),
            ],
            deployless: true,
        });
        return {
            claimableShares: shares,
            config: await feeConfig(configId),
            configId,
            feesActive,
            highWaterMark,
            preview: toFeePreview(preview),
            targetBase,
        };
    }
    const [configId, feesActive, highWaterMark, preview, targetBase] = await multicall(client, {
        ...rest,
        allowFailure: false,
        contracts,
        deployless: true,
    });
    return {
        config: await feeConfig(configId),
        configId,
        feesActive,
        highWaterMark,
        preview: toFeePreview(preview),
        targetBase,
    };
}
/**
 * Gets an account's asset and Earn share balances, allowances, and current
 * share value. The value includes fees.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const position = await Actions.earn.getPosition(client, {
 *   account: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The asset and Earn share balances, allowances, and value.
 */
export async function getPosition(client, parameters) {
    const { account: account_ = client.account, vault, ...rest } = parameters;
    if (!account_)
        throw new AccountNotFoundError();
    const account = parseAccount(account_).address;
    const [assetToken, shareToken] = await multicall(client, {
        ...rest,
        allowFailure: false,
        contracts: [
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asset',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'earnShare',
            }),
        ],
        deployless: true,
    });
    const [assetAllowance, assetBalance, shareAllowance, shareBalance] = await multicall(client, {
        ...rest,
        allowFailure: false,
        contracts: [
            defineCall({
                address: assetToken,
                abi: Abis.tip20,
                functionName: 'allowance',
                args: [account, vault],
            }),
            defineCall({
                address: assetToken,
                abi: Abis.tip20,
                functionName: 'balanceOf',
                args: [account],
            }),
            defineCall({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'allowance',
                args: [account, vault],
            }),
            defineCall({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'balanceOf',
                args: [account],
            }),
        ],
        deployless: true,
    });
    const value = await withExecutionError(readContract)(client, {
        ...rest,
        abi: Abis.earnVault,
        address: vault,
        args: [shareBalance],
        functionName: 'previewRedeem',
    });
    return {
        assetAllowance,
        assetBalance,
        assetToken,
        shareAllowance,
        shareBalance,
        shareToken,
        value,
    };
}
/**
 * Gets the asset output for an exact Earn share input, including fees.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const assetAmount = await Actions.earn.getRedeemQuote(client, {
 *   shareAmount: 100_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The asset output, including fees.
 */
export async function getRedeemQuote(client, parameters) {
    const { shareAmount, vault, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getRedeemQuote.call({ shareAmount, vault }),
    });
}
(function (getRedeemQuote) {
    /**
     * Defines a call to the vault's `previewRedeem` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`multicall`](https://viem.sh/docs/contract/multicall): batch the call with other contract reads
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     *
     * @example
     * ```ts
     * import { Actions } from 'viem/tempo'
     *
     * const call = Actions.earn.getRedeemQuote.call({
     *   shareAmount: 100_000_000n,
     *   vault: '0x...',
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { shareAmount, vault } = args;
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            args: [shareAmount],
            functionName: 'previewRedeem',
        });
    }
    getRedeemQuote.call = call;
})(getRedeemQuote || (getRedeemQuote = {}));
/**
 * Gets the vault's addresses, configuration, accounting state, and supported
 * actions. Throws {@link GetVaultEngineChangedError} if its engine changes mid-read.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const vault = await Actions.earn.getVault(client, {
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The vault state and metadata.
 */
export async function getVault(client, parameters) {
    const { vault, ...rest } = parameters;
    const [engine, fees] = await Promise.all([
        withExecutionError(readContract)(client, {
            ...rest,
            abi: Abis.earnVault,
            address: vault,
            functionName: 'engine',
        }),
        withExecutionError(readContract)(client, {
            ...rest,
            abi: Abis.earnVault,
            address: vault,
            functionName: 'earnFees',
        }),
    ]);
    const [assetToken, engine_, shareToken, operator, emergencyGuardian, asyncJanitor, engineMigrationMode, depositsPaused, engineShares, shareSupply, isSynced, pendingRedeemCount, feesActive, totalAssets, name, symbol, asyncRedeem, exactWithdraw, inKindDeposit, syncRedeem,] = await multicall(client, {
        ...rest,
        allowFailure: false,
        contracts: getVault.calls({ engine, fees, vault }),
        deployless: true,
    });
    if (!isAddressEqual(engine, engine_))
        throw new GetVaultEngineChangedError({ vault });
    return {
        assetToken,
        asyncJanitor,
        capabilities: { asyncRedeem, exactWithdraw, inKindDeposit, syncRedeem },
        depositsPaused,
        emergencyGuardian,
        engine: { address: engine_, name, symbol, totalAssets },
        // `EngineMigrationMode`: 0 = UserOnly, 1 = OperatorEnabled.
        engineMigrationMode: engineMigrationMode === 0 ? 'userOnly' : 'operatorEnabled',
        engineShares,
        feesActive,
        isSynced,
        operator,
        pendingRedeemCount,
        shareSupply,
        shareToken,
    };
}
(function (getVault) {
    /**
     * Defines the reads used by {@link getVault}. Pass the current engine and
     * fee contract addresses.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { engine, fees, vault } = args;
        return [
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asset',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engine',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'earnShare',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'operator',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'emergencyGuardian',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asyncJanitor',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engineMigrationMode',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'depositsPaused',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engineShares',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'totalEarnShares',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'isAccountingAligned',
            }),
            defineCall({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'openRedeemRequestCount',
            }),
            defineCall({
                address: fees,
                abi: Abis.earnFees,
                functionName: 'feesActive',
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'totalAssets',
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'name',
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'symbol',
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.asyncRedeem],
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.exactWithdraw],
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.inKindDeposit],
            }),
            defineCall({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.syncRedeem],
            }),
        ];
    }
    getVault.calls = calls;
})(getVault || (getVault = {}));
/**
 * Gets the Earn shares required for an exact asset output, including fees
 * and ceiling rounding.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const shareAmount = await Actions.earn.getWithdrawQuote(client, {
 *   assetAmount: 250_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The required Earn share input, ceiling-rounded.
 */
export async function getWithdrawQuote(client, parameters) {
    const { assetAmount, vault, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        ...getWithdrawQuote.call({ assetAmount, vault }),
    });
}
(function (getWithdrawQuote) {
    /**
     * Defines a call to the vault's `previewWithdraw` function.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`multicall`](https://viem.sh/docs/contract/multicall): batch the call with other contract reads
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     *
     * @example
     * ```ts
     * import { Actions } from 'viem/tempo'
     *
     * const call = Actions.earn.getWithdrawQuote.call({
     *   assetAmount: 250_000_000n,
     *   vault: '0x...',
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { assetAmount, vault } = args;
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            args: [assetAmount],
            functionName: 'previewWithdraw',
        });
    }
    getWithdrawQuote.call = call;
})(getWithdrawQuote || (getWithdrawQuote = {}));
/**
 * Redeems Earn shares for assets sent to `recipient`. The transaction
 * includes the required Earn share approval.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.earn.redeem(client, {
 *   shareAmount: 100_000_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function redeem(client, parameters) {
    return redeem.inner(sendTransaction, client, parameters);
}
(function (redeem) {
    /** @internal Shared dispatch; reads the Earn share token for the approval. */
    async function inner(action, client, parameters) {
        const [args, shareToken] = await Promise.all([
            toRedeemArgs(client, parameters),
            withExecutionError(readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'earnShare',
            }),
        ]);
        return (await withExecutionError(action)(client, {
            ...parameters,
            calls: redeem.calls({ ...args, shareToken }),
        }));
    }
    redeem.inner = inner;
    /**
     * Defines a redeem call without an approval. Provide Earn share decimals
     * for formatted inputs and an explicit output bound because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call(...parameters) {
        const [, args] = resolveCallParameters(parameters);
        const { recipient, vault } = args;
        const assetAmountMin = (() => {
            if (args.assetAmountMin !== undefined)
                return args.assetAmountMin;
            return EarnShares.minimumOutput(args.assetAmount, args.slippageBps);
        })();
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            functionName: 'redeem',
            args: [
                internal_Token.toBaseUnits(args.shareAmount, undefined),
                recipient,
                assetAmountMin,
            ],
        });
    }
    redeem.call = call;
    /**
     * Defines the Earn share approval and redeem calls for atomic execution.
     * Pass `shareToken` explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { shareToken, vault } = args;
        const shareAmount = internal_Token.toBaseUnits(args.shareAmount, undefined);
        return [
            defineCall({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, shareAmount],
            }),
            redeem.call({ ...args, shareAmount }),
        ];
    }
    redeem.calls = calls;
    /**
     * Extracts a `Redeemed` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `Redeemed` event.
     */
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        // Earn contracts are user-deployed: several adapters can emit the same
        // signature in one receipt, so filter by emitting address before decode.
        const [log] = parseEventLogs({
            abi: Abis.earnVault,
            eventName: 'Redeemed',
            logs: logs.filter((log) => isAddressEqual(log.address, vault)),
        });
        if (!log)
            throw new Error('`Redeemed` event not found.');
        return log;
    }
    redeem.extractEvent = extractEvent;
    /**
     * Estimates gas for a redemption, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    async function estimateGas(client, parameters) {
        return estimateContractGas(client, {
            ...pickWriteParameters(parameters),
            ...redeem.call(await toRedeemArgs(client, parameters)),
        });
    }
    redeem.estimateGas = estimateGas;
    /**
     * Simulates a redemption, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    async function simulate(client, parameters) {
        return simulateContract(client, {
            ...pickWriteParameters(parameters),
            ...redeem.call(await toRedeemArgs(client, parameters)),
        });
    }
    redeem.simulate = simulate;
})(redeem || (redeem = {}));
/**
 * Redeems Earn shares and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { assetAmount } = await Actions.earn.redeemSync(client, {
 *   assetAmountMin: 99_500_000n,
 *   shareAmount: 100_000_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function redeemSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await redeem.inner(sendTransactionSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = redeem.extractEvent(receipt.logs, { vault });
    return {
        assetAmount: args.assets,
        caller: args.caller,
        receipt,
        recipient: args.receiver,
        shareAmount: args.earnShares,
    };
}
/**
 * Withdraws Earn shares from a Zone and redeems them on the parent chain. Use
 * {@link privateRedeem.prepare} to build the encrypted callback.
 *
 * @example
 * ```ts
 * const prepared = await Actions.earn.privateRedeem.prepare(parentClient, {
 *   gateway: '0x...',
 *   recipient: '0x...',
 *   shareAmount: 100_000_000n,
 *   slippageBps: 50,
 *   tempoRefundRecipient: '0x...',
 *   vault: '0x...',
 *   zoneId: 7,
 * })
 * const hash = await Actions.earn.privateRedeem(zoneClient, prepared)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Prepared redemption and transaction parameters.
 * @returns The transaction hash.
 */
export async function privateRedeem(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawal(client, parameters);
}
(function (privateRedeem) {
    /**
     * Builds an encrypted Zone withdrawal that redeems Earn shares and returns
     * the resulting assets to the Zone.
     *
     * @param client - Parent-chain client.
     * @param parameters - Redemption intent and recovery parameters.
     * @returns The prepared withdrawal and correlation data.
     */
    async function prepare(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { actionId = Hex.random(32), callbackGas = zoneGatewayCallbackGas, tempoRefundRecipient, fallbackRecipient = tempoRefundRecipient, gateway, portalAddress: portalAddress_, recipient, returnMemo, shareAmount, vault, withdrawalMemo, zoneId, } = parameters;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const readParameters = pickReadParameters(parameters);
        const [fromBlock, config] = await Promise.all([
            getBlockNumber(client, { cacheTime: 0 }),
            getZoneGatewayConfig(client, {
                ...readParameters,
                flow: 1,
                gateway,
                vault,
                zoneId,
                zonePortal: portalAddress,
            }),
        ]);
        const assetToken = parameters.assetToken ?? config.privateAsset;
        if (!isAddressEqual(assetToken, config.privateAsset))
            throw new Error('`assetToken` must match the Zone gateway private asset.');
        const [{ encrypted, keyIndex }, assetAmountMin] = await Promise.all([
            zoneActions.encryptedDeposit.prepareRecipient(client, {
                ...readParameters,
                memo: returnMemo,
                portalAddress: config.zonePortal,
                recipient,
                sender: gateway,
                zoneId: config.zoneId,
            }),
            (async () => {
                if (parameters.assetAmountMin !== undefined)
                    return EarnShares.minimumOutput(parameters.assetAmountMin, 0);
                if (parameters.assetAmount !== undefined)
                    return EarnShares.minimumOutput(parameters.assetAmount, parameters.slippageBps);
                const assetAmount = await getRedeemQuote(client, {
                    ...readParameters,
                    shareAmount,
                    vault: config.vault,
                });
                return EarnShares.minimumOutput(assetAmount, parameters.slippageBps);
            })(),
        ]);
        const data = encodeAbiParameters(Abis.earnRouterCallbackData, [
            {
                actionId,
                flow: 1,
                minEarnShares: 0n,
                minOutputAmount: assetAmountMin,
                minVaultAssets: assetAmountMin,
                zoneReturn: {
                    encrypted,
                    keyIndex,
                    refundRecipient: tempoRefundRecipient,
                },
            },
        ]);
        return {
            actionId,
            amount: shareAmount,
            callbackGas,
            chainId,
            data,
            fallbackRecipient,
            fromBlock,
            memo: withdrawalMemo,
            to: gateway,
            token: config.shareToken,
            zoneId: config.zoneId,
        };
    }
    privateRedeem.prepare = prepare;
    /**
     * Defines the approval and Zone withdrawal calls for a prepared redemption.
     *
     * @param args - Prepared redemption arguments.
     * @returns The Zone withdrawal calls.
     */
    function calls(args) {
        return zoneActions.requestWithdrawal.calls(args);
    }
    privateRedeem.calls = calls;
})(privateRedeem || (privateRedeem = {}));
/**
 * Requests a private Zone redemption and waits for the Zone transaction
 * receipt. The receipt confirms withdrawal acceptance, not redemption.
 *
 * @param client - Zone client.
 * @param parameters - Prepared redemption and transaction parameters.
 * @returns The Zone transaction receipt and parent-chain withdrawal sender tag.
 */
export async function privateRedeemSync(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawalSync(client, parameters);
}
/**
 * Waits for a Zone gateway redemption to complete on the parent chain.
 *
 * @example
 * ```ts
 * const result = await Actions.earn.waitForPrivateRedeem(parentClient, {
 *   actionId: prepared.actionId,
 *   fromBlock: prepared.fromBlock,
 *   gateway: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Parent-chain client.
 * @param parameters - Prepared action correlation and polling parameters.
 * @returns The completed gateway redemption.
 */
export async function waitForPrivateRedeem(client, parameters) {
    const { actionId, fromBlock, gateway, pollingInterval = client.pollingInterval, timeout = 60_000, vault, } = parameters;
    const event = getAbiItem({
        abi: Abis.earnRouter,
        name: 'EarnRedeem',
    });
    const observerId = stringify([
        'waitForPrivateRedeem',
        client.uid,
        gateway,
        vault,
        actionId,
        fromBlock,
    ]);
    const { promise, reject, resolve } = withResolvers();
    let timer;
    let unobserve;
    const cleanup = () => {
        clearTimeout(timer);
        unobserve();
    };
    const resolve_ = (result) => {
        cleanup();
        resolve(result);
    };
    const reject_ = (error) => {
        cleanup();
        reject(error);
    };
    unobserve = observe(observerId, { reject: reject_, resolve: resolve_ }, (emit) => {
        const unpoll = poll(async () => {
            try {
                const [log] = await getLogs(client, {
                    address: gateway,
                    args: { actionId, earnVault: vault },
                    event,
                    fromBlock,
                    strict: true,
                    toBlock: 'latest',
                });
                if (!log)
                    return;
                unpoll();
                emit.resolve({
                    actionId: log.args.actionId,
                    outputAmount: log.args.outputAmount,
                    outputToken: log.args.outputToken,
                    shares: log.args.earnShares,
                    tempoBlockNumber: log.blockNumber,
                    vaultAssets: log.args.vaultAssets,
                    zoneDepositHash: log.args.zoneDepositHash,
                });
            }
            catch (error) {
                unpoll();
                emit.reject(error);
            }
        }, { emitOnBegin: true, interval: pollingInterval });
        return unpoll;
    });
    timer = timeout
        ? setTimeout(() => {
            reject_(new WaitForPrivateRedeemTimeoutError({ actionId, gateway }));
        }, timeout)
        : undefined;
    return await promise;
}
/**
 * Withdraws an exact asset amount to `recipient`, up to the specified Earn
 * share limit. The transaction includes the required Earn share approval;
 * use {@link redeem} for a full exit.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.earn.withdrawExact(client, {
 *   assetAmount: 40_000_000n,
 *   slippageBps: 50,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function withdrawExact(client, parameters) {
    return withdrawExact.inner(sendTransaction, client, parameters);
}
(function (withdrawExact) {
    /** @internal Shared dispatch; reads the Earn share token for the approval. */
    async function inner(action, client, parameters) {
        const [args, shareToken] = await Promise.all([
            toWithdrawExactArgs(client, parameters),
            withExecutionError(readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'earnShare',
            }),
        ]);
        return (await withExecutionError(action)(client, {
            ...parameters,
            calls: withdrawExact.calls({ ...args, shareToken }),
        }));
    }
    withdrawExact.inner = inner;
    /**
     * Defines an exact withdrawal call without an approval. Provide asset
     * decimals and an explicit input limit because this builder performs no reads.
     *
     * @param parameters - Client (optional), followed by the call arguments.
     * @returns The call.
     */
    function call(...parameters) {
        const [, args] = resolveCallParameters(parameters);
        const { recipient, vault } = args;
        const shareAmountMax = (() => {
            if (args.shareAmountMax !== undefined)
                return args.shareAmountMax;
            return maximumInput(args.shareAmount, args.slippageBps);
        })();
        return defineCall({
            address: vault,
            abi: Abis.earnVault,
            functionName: 'withdrawExact',
            args: [
                internal_Token.toBaseUnits(args.assetAmount, undefined),
                recipient,
                shareAmountMax,
            ],
        });
    }
    withdrawExact.call = call;
    /**
     * Defines the Earn share approval and withdrawal calls for atomic
     * execution. Pass `shareToken` explicitly because this builder performs no reads.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { shareToken, vault } = args;
        const assetAmount = internal_Token.toBaseUnits(args.assetAmount, undefined);
        const call = withdrawExact.call({ ...args, assetAmount });
        const [, , shareAmountMax] = call.args;
        return [
            defineCall({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, shareAmountMax],
            }),
            call,
        ];
    }
    withdrawExact.calls = calls;
    /**
     * Extracts a `WithdrewExact` event from the vault's logs.
     *
     * @param logs - Logs.
     * @param parameters - Parameters.
     * @returns The `WithdrewExact` event.
     */
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        // Earn contracts are user-deployed: several adapters can emit the same
        // signature in one receipt, so filter by emitting address before decode.
        const [log] = parseEventLogs({
            abi: Abis.earnVault,
            eventName: 'WithdrewExact',
            logs: logs.filter((log) => isAddressEqual(log.address, vault)),
        });
        if (!log)
            throw new Error('`WithdrewExact` event not found.');
        return log;
    }
    withdrawExact.extractEvent = extractEvent;
    /**
     * Estimates gas for an exact withdrawal, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The gas estimate.
     */
    async function estimateGas(client, parameters) {
        return estimateContractGas(client, {
            ...pickWriteParameters(parameters),
            ...withdrawExact.call(await toWithdrawExactArgs(client, parameters)),
        });
    }
    withdrawExact.estimateGas = estimateGas;
    /**
     * Simulates an exact withdrawal, assuming enough Earn share allowance.
     *
     * @param client - Client.
     * @param parameters - Parameters.
     * @returns The simulation result and write request.
     */
    async function simulate(client, parameters) {
        return simulateContract(client, {
            ...pickWriteParameters(parameters),
            ...withdrawExact.call(await toWithdrawExactArgs(client, parameters)),
        });
    }
    withdrawExact.simulate = simulate;
})(withdrawExact || (withdrawExact = {}));
/**
 * Withdraws an exact asset amount and returns the confirmed receipt and event data.
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Actions } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 *
 * const { shareAmount } = await Actions.earn.withdrawExactSync(client, {
 *   assetAmount: 40_000_000n,
 *   shareAmountMax: 40_200_000n,
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction receipt and event data.
 */
export async function withdrawExactSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await withdrawExact.inner(sendTransactionSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = withdrawExact.extractEvent(receipt.logs, { vault });
    return {
        assetAmount: args.assets,
        caller: args.caller,
        receipt,
        recipient: args.receiver,
        shareAmount: args.earnSharesBurned,
    };
}
const zoneGatewayCallbackGas = 10000000n;
function resolveMinimumShareAmount(parameters) {
    if (parameters.shareAmountMin !== undefined)
        return EarnShares.minimumOutput(parameters.shareAmountMin, 0);
    return EarnShares.minimumOutput(parameters.shareAmount, parameters.slippageBps);
}
async function assertPreparedZoneRequestChain(client, parameters) {
    const chain = client.chain;
    if (!chain)
        throw new Error('`chain` is required.');
    if (chain.sourceId !== parameters.chainId)
        throw new Error('Prepared Zone request parent chain ID does not match client chain.');
    const { zoneId } = await zoneActions.getZoneInfo(client);
    if (zoneId !== parameters.zoneId)
        throw new Error('Prepared Zone request Zone ID does not match client chain.');
}
function pickReadParameters(parameters) {
    const { blockOverrides, stateOverride } = parameters;
    if (parameters.blockNumber !== undefined)
        return {
            blockNumber: parameters.blockNumber,
            blockOverrides,
            stateOverride,
        };
    return { blockOverrides, blockTag: parameters.blockTag, stateOverride };
}
async function getZoneGatewayConfig(client, parameters) {
    const { flow, gateway, vault, zoneId, zonePortal, ...rest } = parameters;
    const [vaultAsset, shareToken, allowedZoneId, routerVault, privateAsset, routerVaultAsset, routerShareToken, supportsFlow,] = await multicall(client, {
        ...rest,
        allowFailure: false,
        contracts: [
            {
                abi: Abis.earnVault,
                address: vault,
                functionName: 'asset',
            },
            {
                abi: Abis.earnVault,
                address: vault,
                functionName: 'earnShare',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                functionName: 'allowedZoneId',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                functionName: 'earnVault',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                functionName: 'privateAsset',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                functionName: 'vaultAsset',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                functionName: 'earnShare',
            },
            {
                abi: Abis.earnRouter,
                address: gateway,
                args: [flow],
                functionName: 'supportsFlow',
            },
        ],
        deployless: true,
    });
    if (!supportsFlow)
        throw new Error('Zone gateway flow is not supported.');
    if (allowedZoneId !== zoneId)
        throw new Error('Zone gateway is configured for a different Zone.');
    if (!isAddressEqual(routerVault, vault))
        throw new Error('Zone gateway is configured for a different Earn vault.');
    if (!isAddressEqual(routerVaultAsset, vaultAsset))
        throw new Error('Zone gateway vault asset does not match the Earn vault.');
    if (!isAddressEqual(routerShareToken, shareToken))
        throw new Error('Zone gateway share token does not match the Earn vault.');
    return {
        privateAsset,
        shareToken,
        vault,
        vaultAsset,
        zoneId,
        zonePortal,
    };
}
// ERC-165 ids of the optional engine capability interfaces (XOR of each
// interface's function selectors).
const interfaceIds = {
    /** `IEarnEngineAsyncRedeem`. */
    asyncRedeem: '0xa1a6a1d7',
    /** `IEarnEngineExactWithdraw`. */
    exactWithdraw: '0x0adfb0b9',
    /** `IEarnEngineInKindDeposit`. */
    inKindDeposit: '0xce4790a9',
    /** `IEarnEngineRedeem`. */
    syncRedeem: '0x94a2d467',
};
/** Trims the decoded `FeeConfig` to its active fixed-fee count. */
function toFeeConfig(config) {
    return {
        excess: config.excess,
        fixedFees: config.fixedFees.slice(0, config.fixedFeeCount),
    };
}
/** Maps decoded fee fields to the action result. */
function toFeePreview(preview) {
    const { allocationCount, allocations, postFeeValuePerEarnShare, preFeeValuePerEarnShare, targetValuePerEarnShare, totalFeeEarnShares, ...rest } = preview;
    return {
        ...rest,
        allocations: allocations
            .slice(0, allocationCount)
            .map(({ feeEarnShares, ...allocation }) => ({
            ...allocation,
            feeShares: feeEarnShares,
        })),
        postFeeValuePerShare: postFeeValuePerEarnShare,
        preFeeValuePerShare: preFeeValuePerEarnShare,
        targetValuePerShare: targetValuePerEarnShare,
        totalFeeShares: totalFeeEarnShares,
    };
}
/** Resolves `deposit` parameters into the adapter call args. @internal */
async function toDepositArgs(client, parameters) {
    const { vault } = parameters;
    const assetAmount = await toBaseUnitsLive(client, {
        amount: parameters.assetAmount,
        token: 'asset',
        vault,
    });
    const args = {
        assetAmount,
        recipient: resolveRecipient(client, parameters),
        vault,
    };
    if (parameters.shareAmountMin !== undefined)
        return { ...args, shareAmountMin: parameters.shareAmountMin };
    return {
        ...args,
        shareAmount: parameters.shareAmount,
        slippageBps: parameters.slippageBps,
    };
}
/** Resolves `depositShares` parameters into the adapter call args. @internal */
function toDepositSharesArgs(client, parameters) {
    const { vault, venueShareAmount } = parameters;
    const args = {
        recipient: resolveRecipient(client, parameters),
        vault,
        venueShareAmount,
    };
    if (parameters.earnShareAmountMin !== undefined)
        return { ...args, earnShareAmountMin: parameters.earnShareAmountMin };
    return {
        ...args,
        earnShareAmount: parameters.earnShareAmount,
        slippageBps: parameters.slippageBps,
    };
}
/** Resolves `redeem` parameters into the adapter call args. @internal */
async function toRedeemArgs(client, parameters) {
    const { vault } = parameters;
    const shareAmount = await toBaseUnitsLive(client, {
        amount: parameters.shareAmount,
        token: 'shareToken',
        vault,
    });
    const args = {
        recipient: resolveRecipient(client, parameters),
        shareAmount,
        vault,
    };
    if (parameters.assetAmountMin !== undefined)
        return { ...args, assetAmountMin: parameters.assetAmountMin };
    const assetAmount = await (async () => {
        if (parameters.assetAmount !== undefined)
            return parameters.assetAmount;
        return getRedeemQuote(client, { shareAmount, vault });
    })();
    return {
        ...args,
        assetAmount,
        slippageBps: parameters.slippageBps,
    };
}
/** Resolves `withdrawExact` parameters into the adapter call args. @internal */
async function toWithdrawExactArgs(client, parameters) {
    const { vault } = parameters;
    const assetAmount = await toBaseUnitsLive(client, {
        amount: parameters.assetAmount,
        token: 'asset',
        vault,
    });
    const args = {
        assetAmount,
        recipient: resolveRecipient(client, parameters),
        vault,
    };
    if (parameters.shareAmountMax !== undefined)
        return { ...args, shareAmountMax: parameters.shareAmountMax };
    const shareAmount = await (async () => {
        if (parameters.shareAmount !== undefined)
            return parameters.shareAmount;
        return getWithdrawQuote(client, { assetAmount, vault });
    })();
    return {
        ...args,
        shareAmount,
        slippageBps: parameters.slippageBps,
    };
}
/** Raises a quoted input by basis points with ceiling rounding. @internal */
function maximumInput(shareAmount, slippageBps) {
    if (shareAmount <= 0n)
        throw new EarnShares.InvalidExpectedOutputError({
            expectedAmount: shareAmount,
        });
    if (!Number.isInteger(slippageBps) ||
        slippageBps < 0 ||
        slippageBps >= EarnShares.basisPointScale)
        throw new EarnShares.InvalidSlippageError({ slippageBps });
    const scale = BigInt(EarnShares.basisPointScale);
    const numerator = shareAmount * (scale + BigInt(slippageBps));
    // Adding the denominator minus one converts floor division to ceiling.
    return (numerator + scale - 1n) / scale;
}
/**
 * Converts an amount to base units, resolving missing decimals with live
 * reads of the vault's asset or share token. Earn share tokens are not
 * genesis-declared, so nothing is cached. @internal
 */
async function toBaseUnitsLive(client, options) {
    const { amount, token, vault } = options;
    if (typeof amount === 'bigint')
        return amount;
    if (amount.decimals !== undefined)
        return internal_Token.toBaseUnits(amount, amount.decimals);
    const address = await withExecutionError(readContract)(client, {
        abi: Abis.earnVault,
        address: vault,
        functionName: token === 'asset' ? 'asset' : 'earnShare',
    });
    const { decimals } = await resolveTokenWithDecimals(client, {
        token: address,
    });
    return internal_Token.toBaseUnits(amount, decimals);
}
/** Defaults a write's `recipient` to the sending account's address. @internal */
function resolveRecipient(client, parameters) {
    if (parameters.recipient)
        return parameters.recipient;
    const account = parameters.account ?? client.account;
    if (!account)
        throw new AccountNotFoundError();
    return parseAccount(account).address;
}
//# sourceMappingURL=earn.js.map