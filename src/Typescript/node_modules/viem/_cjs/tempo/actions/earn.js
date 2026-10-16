"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alwaysAllowPolicyId = void 0;
exports.configureExitSafePolicy = configureExitSafePolicy;
exports.validateExitSafePolicy = validateExitSafePolicy;
exports.deposit = deposit;
exports.depositSync = depositSync;
exports.depositShares = depositShares;
exports.depositSharesSync = depositSharesSync;
exports.privateDeposit = privateDeposit;
exports.privateDepositSync = privateDepositSync;
exports.waitForPrivateDeposit = waitForPrivateDeposit;
exports.getFeeState = getFeeState;
exports.getPosition = getPosition;
exports.getRedeemQuote = getRedeemQuote;
exports.getVault = getVault;
exports.getWithdrawQuote = getWithdrawQuote;
exports.redeem = redeem;
exports.redeemSync = redeemSync;
exports.privateRedeem = privateRedeem;
exports.privateRedeemSync = privateRedeemSync;
exports.waitForPrivateRedeem = waitForPrivateRedeem;
exports.withdrawExact = withdrawExact;
exports.withdrawExactSync = withdrawExactSync;
const ox_1 = require("ox");
const tempo_1 = require("ox/tempo");
const parseAccount_js_1 = require("../../accounts/utils/parseAccount.js");
const estimateContractGas_js_1 = require("../../actions/public/estimateContractGas.js");
const getBlockNumber_js_1 = require("../../actions/public/getBlockNumber.js");
const getLogs_js_1 = require("../../actions/public/getLogs.js");
const multicall_js_1 = require("../../actions/public/multicall.js");
const readContract_js_1 = require("../../actions/public/readContract.js");
const simulateContract_js_1 = require("../../actions/public/simulateContract.js");
const internal_Token = require("../../actions/token/internal.js");
const sendTransaction_js_1 = require("../../actions/wallet/sendTransaction.js");
const sendTransactionSync_js_1 = require("../../actions/wallet/sendTransactionSync.js");
const writeContractSync_js_1 = require("../../actions/wallet/writeContractSync.js");
const account_js_1 = require("../../errors/account.js");
const encodeAbiParameters_js_1 = require("../../utils/abi/encodeAbiParameters.js");
const getAbiItem_js_1 = require("../../utils/abi/getAbiItem.js");
const parseEventLogs_js_1 = require("../../utils/abi/parseEventLogs.js");
const getAddress_js_1 = require("../../utils/address/getAddress.js");
const isAddressEqual_js_1 = require("../../utils/address/isAddressEqual.js");
const observe_js_1 = require("../../utils/observe.js");
const poll_js_1 = require("../../utils/poll.js");
const withResolvers_js_1 = require("../../utils/promise/withResolvers.js");
const stringify_js_1 = require("../../utils/stringify.js");
const Abis = require("../Abis.js");
const Addresses = require("../Addresses.js");
const errors_js_1 = require("../errors.js");
const errors_js_2 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
const policyActions = require("./policy.js");
const tokenActions = require("./token.js");
const zoneActions = require("./zone.js");
__exportStar(require("./earn/deployment.js"), exports);
exports.alwaysAllowPolicyId = 1n;
async function configureExitSafePolicy(client, parameters) {
    const account_ = parameters.account ?? client.account;
    if (!account_)
        throw new account_js_1.AccountNotFoundError();
    const account = (0, parseAccount_js_1.parseAccount)(account_);
    const initialMembers = [
        ...new Set(parameters.initialMembers.map((member) => (0, getAddress_js_1.getAddress)(member))),
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
    const compoundPolicy = await (0, writeContractSync_js_1.writeContractSync)(client, {
        account,
        abi: Abis.tip403Registry,
        address: Addresses.tip403Registry,
        args: [exports.alwaysAllowPolicyId, eligibility.policyId, eligibility.policyId],
        chain: client.chain,
        functionName: 'createCompoundPolicy',
        throwOnReceiptRevert: true,
    });
    if (compoundPolicy.status === 'pending')
        return { receipt: compoundPolicy };
    const [compoundEvent] = (0, parseEventLogs_js_1.parseEventLogs)({
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
    const policyAdmin = (0, isAddressEqual_js_1.isAddressEqual)(parameters.accessAdministrator, account.address)
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
            senderPolicyId: exports.alwaysAllowPolicyId,
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
async function validateExitSafePolicy(client, parameters) {
    const { accessAdministrator, policy, requiredMembers, shareToken, ...rest } = parameters;
    const [tokenPolicyId, compound, simplePolicy, memberResults] = await Promise.all([
        (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            ...rest,
            abi: Abis.tip20,
            address: shareToken,
            functionName: 'transferPolicyId',
        }),
        (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            ...rest,
            abi: Abis.tip403Registry,
            address: Addresses.tip403Registry,
            args: [policy.transferPolicyId],
            functionName: 'compoundPolicyData',
        }),
        (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            ...rest,
            abi: Abis.tip403Registry,
            address: Addresses.tip403Registry,
            args: [policy.recipientPolicyId],
            functionName: 'policyData',
        }),
        Promise.all(requiredMembers.map(async (member) => {
            const [recipient, mintRecipient] = await Promise.all([
                (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
                    ...rest,
                    abi: Abis.tip403Registry,
                    address: Addresses.tip403Registry,
                    args: [policy.transferPolicyId, member],
                    functionName: 'isAuthorizedRecipient',
                }),
                (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
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
    if (policy.senderPolicyId !== exports.alwaysAllowPolicyId)
        throw new Error('TIP-403 sender policy is not always allow.');
    if (policy.recipientPolicyId !== policy.mintRecipientPolicyId)
        throw new Error('TIP-403 recipient and mint-recipient policies must match.');
    if (simplePolicy[0] !== 0)
        throw new Error('TIP-403 eligibility policy is not a whitelist.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(simplePolicy[1], accessAdministrator))
        throw new Error('TIP-403 access administrator mismatch.');
    const unauthorized = memberResults.find((result) => !result.recipient || !result.mintRecipient);
    if (unauthorized)
        throw new Error(`Required TIP-403 member is unauthorized: ${unauthorized.member}`);
}
async function deposit(client, parameters) {
    return deposit.inner(sendTransaction_js_1.sendTransaction, client, parameters);
}
(function (deposit) {
    async function inner(action, client, parameters) {
        const [args, assetToken] = await Promise.all([
            toDepositArgs(client, parameters),
            (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'asset',
            }),
        ]);
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...parameters,
            calls: deposit.calls({ ...args, assetToken }),
        }));
    }
    deposit.inner = inner;
    function call(...parameters) {
        const [, args] = (0, utils_js_1.resolveCallParameters)(parameters);
        const { recipient, vault } = args;
        const shareAmountMin = (() => {
            if (args.shareAmountMin !== undefined)
                return args.shareAmountMin;
            return tempo_1.EarnShares.minimumOutput(args.shareAmount, args.slippageBps);
        })();
        return (0, utils_js_1.defineCall)({
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
    function calls(args) {
        const { assetToken, vault } = args;
        const assetAmount = internal_Token.toBaseUnits(args.assetAmount, undefined);
        return [
            (0, utils_js_1.defineCall)({
                address: tempo_1.TokenId.toAddress(assetToken),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, assetAmount],
            }),
            deposit.call({ ...args, assetAmount }),
        ];
    }
    deposit.calls = calls;
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.earnVault,
            eventName: 'Deposited',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, vault)),
        });
        if (!log)
            throw new Error('`Deposited` event not found.');
        return log;
    }
    deposit.extractEvent = extractEvent;
    async function estimateGas(client, parameters) {
        return (0, estimateContractGas_js_1.estimateContractGas)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...deposit.call(await toDepositArgs(client, parameters)),
        });
    }
    deposit.estimateGas = estimateGas;
    async function simulate(client, parameters) {
        return (0, simulateContract_js_1.simulateContract)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...deposit.call(await toDepositArgs(client, parameters)),
        });
    }
    deposit.simulate = simulate;
})(deposit || (exports.deposit = deposit = {}));
async function depositSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await deposit.inner(sendTransactionSync_js_1.sendTransactionSync, client, {
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
async function depositShares(client, parameters) {
    return depositShares.inner(sendTransaction_js_1.sendTransaction, client, parameters);
}
(function (depositShares) {
    async function inner(action, client, parameters) {
        const engine = await (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            abi: Abis.earnVault,
            address: parameters.vault,
            functionName: 'engine',
        });
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...parameters,
            calls: depositShares.calls({
                ...toDepositSharesArgs(client, parameters),
                engine,
                venueShareToken: parameters.venueShareToken,
            }),
        }));
    }
    depositShares.inner = inner;
    function call(...parameters) {
        const [, args] = (0, utils_js_1.resolveCallParameters)(parameters);
        const { recipient, vault, venueShareAmount } = args;
        const earnShareAmountMin = (() => {
            if (args.earnShareAmountMin !== undefined)
                return args.earnShareAmountMin;
            return tempo_1.EarnShares.minimumOutput(args.earnShareAmount, args.slippageBps);
        })();
        return (0, utils_js_1.defineCall)({
            address: vault,
            abi: Abis.earnVault,
            functionName: 'depositVenueShares',
            args: [venueShareAmount, recipient, earnShareAmountMin],
        });
    }
    depositShares.call = call;
    function calls(args) {
        const { engine, venueShareAmount, venueShareToken } = args;
        return [
            (0, utils_js_1.defineCall)({
                address: venueShareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [engine, venueShareAmount],
            }),
            depositShares.call(args),
        ];
    }
    depositShares.calls = calls;
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.earnVault,
            eventName: 'VenueSharesDeposited',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, vault)),
        });
        if (!log)
            throw new Error('`VenueSharesDeposited` event not found.');
        return log;
    }
    depositShares.extractEvent = extractEvent;
    async function estimateGas(client, parameters) {
        return (0, estimateContractGas_js_1.estimateContractGas)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...depositShares.call(toDepositSharesArgs(client, parameters)),
        });
    }
    depositShares.estimateGas = estimateGas;
    async function simulate(client, parameters) {
        return (0, simulateContract_js_1.simulateContract)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...depositShares.call(toDepositSharesArgs(client, parameters)),
        });
    }
    depositShares.simulate = simulate;
})(depositShares || (exports.depositShares = depositShares = {}));
async function depositSharesSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await depositShares.inner(sendTransactionSync_js_1.sendTransactionSync, client, {
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
async function privateDeposit(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawal(client, parameters);
}
(function (privateDeposit) {
    async function prepare(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { actionId = ox_1.Hex.random(32), assetAmount, callbackGas = zoneGatewayCallbackGas, tempoRefundRecipient, fallbackRecipient = tempoRefundRecipient, gateway, portalAddress: portalAddress_, recipient, returnMemo, vault, withdrawalMemo, zoneId, } = parameters;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const readParameters = pickReadParameters(parameters);
        const [fromBlock, config] = await Promise.all([
            (0, getBlockNumber_js_1.getBlockNumber)(client, { cacheTime: 0 }),
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
        if (!(0, isAddressEqual_js_1.isAddressEqual)(assetToken, config.privateAsset))
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
        const data = (0, encodeAbiParameters_js_1.encodeAbiParameters)(Abis.earnRouterCallbackData, [
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
    function calls(args) {
        return zoneActions.requestWithdrawal.calls(args);
    }
    privateDeposit.calls = calls;
})(privateDeposit || (exports.privateDeposit = privateDeposit = {}));
async function privateDepositSync(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawalSync(client, parameters);
}
async function waitForPrivateDeposit(client, parameters) {
    const { actionId, fromBlock, gateway, pollingInterval = client.pollingInterval, timeout = 60_000, vault, } = parameters;
    const event = (0, getAbiItem_js_1.getAbiItem)({
        abi: Abis.earnRouter,
        name: 'EarnDeposit',
    });
    const observerId = (0, stringify_js_1.stringify)([
        'waitForPrivateDeposit',
        client.uid,
        gateway,
        vault,
        actionId,
        fromBlock,
    ]);
    const { promise, reject, resolve } = (0, withResolvers_js_1.withResolvers)();
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
    unobserve = (0, observe_js_1.observe)(observerId, { reject: reject_, resolve: resolve_ }, (emit) => {
        const unpoll = (0, poll_js_1.poll)(async () => {
            try {
                const [log] = await (0, getLogs_js_1.getLogs)(client, {
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
            reject_(new errors_js_1.WaitForPrivateDepositTimeoutError({ actionId, gateway }));
        }, timeout)
        : undefined;
    return await promise;
}
async function getFeeState(client, parameters) {
    const { recipient, vault, ...rest } = parameters;
    const fees = await (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        abi: Abis.earnVault,
        address: vault,
        functionName: 'earnFees',
    });
    const contracts = [
        (0, utils_js_1.defineCall)({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'currentFeeConfigId',
        }),
        (0, utils_js_1.defineCall)({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'feesActive',
        }),
        (0, utils_js_1.defineCall)({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'highWaterMark',
        }),
        (0, utils_js_1.defineCall)({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'previewAccruedFees',
        }),
        (0, utils_js_1.defineCall)({
            address: fees,
            abi: Abis.earnFees,
            functionName: 'targetBase',
        }),
    ];
    const feeConfig = async (configId) => toFeeConfig(await (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        abi: Abis.earnFees,
        address: fees,
        functionName: 'feeConfig',
        args: [configId],
    }));
    if (recipient !== undefined) {
        const [configId, feesActive, highWaterMark, preview, targetBase, shares] = await (0, multicall_js_1.multicall)(client, {
            ...rest,
            allowFailure: false,
            contracts: [
                ...contracts,
                (0, utils_js_1.defineCall)({
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
    const [configId, feesActive, highWaterMark, preview, targetBase] = await (0, multicall_js_1.multicall)(client, {
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
async function getPosition(client, parameters) {
    const { account: account_ = client.account, vault, ...rest } = parameters;
    if (!account_)
        throw new account_js_1.AccountNotFoundError();
    const account = (0, parseAccount_js_1.parseAccount)(account_).address;
    const [assetToken, shareToken] = await (0, multicall_js_1.multicall)(client, {
        ...rest,
        allowFailure: false,
        contracts: [
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asset',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'earnShare',
            }),
        ],
        deployless: true,
    });
    const [assetAllowance, assetBalance, shareAllowance, shareBalance] = await (0, multicall_js_1.multicall)(client, {
        ...rest,
        allowFailure: false,
        contracts: [
            (0, utils_js_1.defineCall)({
                address: assetToken,
                abi: Abis.tip20,
                functionName: 'allowance',
                args: [account, vault],
            }),
            (0, utils_js_1.defineCall)({
                address: assetToken,
                abi: Abis.tip20,
                functionName: 'balanceOf',
                args: [account],
            }),
            (0, utils_js_1.defineCall)({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'allowance',
                args: [account, vault],
            }),
            (0, utils_js_1.defineCall)({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'balanceOf',
                args: [account],
            }),
        ],
        deployless: true,
    });
    const value = await (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
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
async function getRedeemQuote(client, parameters) {
    const { shareAmount, vault, ...rest } = parameters;
    return (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...getRedeemQuote.call({ shareAmount, vault }),
    });
}
(function (getRedeemQuote) {
    function call(args) {
        const { shareAmount, vault } = args;
        return (0, utils_js_1.defineCall)({
            address: vault,
            abi: Abis.earnVault,
            args: [shareAmount],
            functionName: 'previewRedeem',
        });
    }
    getRedeemQuote.call = call;
})(getRedeemQuote || (exports.getRedeemQuote = getRedeemQuote = {}));
async function getVault(client, parameters) {
    const { vault, ...rest } = parameters;
    const [engine, fees] = await Promise.all([
        (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            ...rest,
            abi: Abis.earnVault,
            address: vault,
            functionName: 'engine',
        }),
        (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
            ...rest,
            abi: Abis.earnVault,
            address: vault,
            functionName: 'earnFees',
        }),
    ]);
    const [assetToken, engine_, shareToken, operator, emergencyGuardian, asyncJanitor, engineMigrationMode, depositsPaused, engineShares, shareSupply, isSynced, pendingRedeemCount, feesActive, totalAssets, name, symbol, asyncRedeem, exactWithdraw, inKindDeposit, syncRedeem,] = await (0, multicall_js_1.multicall)(client, {
        ...rest,
        allowFailure: false,
        contracts: getVault.calls({ engine, fees, vault }),
        deployless: true,
    });
    if (!(0, isAddressEqual_js_1.isAddressEqual)(engine, engine_))
        throw new errors_js_1.GetVaultEngineChangedError({ vault });
    return {
        assetToken,
        asyncJanitor,
        capabilities: { asyncRedeem, exactWithdraw, inKindDeposit, syncRedeem },
        depositsPaused,
        emergencyGuardian,
        engine: { address: engine_, name, symbol, totalAssets },
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
    function calls(args) {
        const { engine, fees, vault } = args;
        return [
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asset',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engine',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'earnShare',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'operator',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'emergencyGuardian',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'asyncJanitor',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engineMigrationMode',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'depositsPaused',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'engineShares',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'totalEarnShares',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'isAccountingAligned',
            }),
            (0, utils_js_1.defineCall)({
                address: vault,
                abi: Abis.earnVault,
                functionName: 'openRedeemRequestCount',
            }),
            (0, utils_js_1.defineCall)({
                address: fees,
                abi: Abis.earnFees,
                functionName: 'feesActive',
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'totalAssets',
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'name',
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'symbol',
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.asyncRedeem],
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.exactWithdraw],
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.inKindDeposit],
            }),
            (0, utils_js_1.defineCall)({
                address: engine,
                abi: Abis.earnEngine,
                functionName: 'supportsInterface',
                args: [interfaceIds.syncRedeem],
            }),
        ];
    }
    getVault.calls = calls;
})(getVault || (exports.getVault = getVault = {}));
async function getWithdrawQuote(client, parameters) {
    const { assetAmount, vault, ...rest } = parameters;
    return (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...getWithdrawQuote.call({ assetAmount, vault }),
    });
}
(function (getWithdrawQuote) {
    function call(args) {
        const { assetAmount, vault } = args;
        return (0, utils_js_1.defineCall)({
            address: vault,
            abi: Abis.earnVault,
            args: [assetAmount],
            functionName: 'previewWithdraw',
        });
    }
    getWithdrawQuote.call = call;
})(getWithdrawQuote || (exports.getWithdrawQuote = getWithdrawQuote = {}));
async function redeem(client, parameters) {
    return redeem.inner(sendTransaction_js_1.sendTransaction, client, parameters);
}
(function (redeem) {
    async function inner(action, client, parameters) {
        const [args, shareToken] = await Promise.all([
            toRedeemArgs(client, parameters),
            (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'earnShare',
            }),
        ]);
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...parameters,
            calls: redeem.calls({ ...args, shareToken }),
        }));
    }
    redeem.inner = inner;
    function call(...parameters) {
        const [, args] = (0, utils_js_1.resolveCallParameters)(parameters);
        const { recipient, vault } = args;
        const assetAmountMin = (() => {
            if (args.assetAmountMin !== undefined)
                return args.assetAmountMin;
            return tempo_1.EarnShares.minimumOutput(args.assetAmount, args.slippageBps);
        })();
        return (0, utils_js_1.defineCall)({
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
    function calls(args) {
        const { shareToken, vault } = args;
        const shareAmount = internal_Token.toBaseUnits(args.shareAmount, undefined);
        return [
            (0, utils_js_1.defineCall)({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, shareAmount],
            }),
            redeem.call({ ...args, shareAmount }),
        ];
    }
    redeem.calls = calls;
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.earnVault,
            eventName: 'Redeemed',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, vault)),
        });
        if (!log)
            throw new Error('`Redeemed` event not found.');
        return log;
    }
    redeem.extractEvent = extractEvent;
    async function estimateGas(client, parameters) {
        return (0, estimateContractGas_js_1.estimateContractGas)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...redeem.call(await toRedeemArgs(client, parameters)),
        });
    }
    redeem.estimateGas = estimateGas;
    async function simulate(client, parameters) {
        return (0, simulateContract_js_1.simulateContract)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...redeem.call(await toRedeemArgs(client, parameters)),
        });
    }
    redeem.simulate = simulate;
})(redeem || (exports.redeem = redeem = {}));
async function redeemSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await redeem.inner(sendTransactionSync_js_1.sendTransactionSync, client, {
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
async function privateRedeem(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawal(client, parameters);
}
(function (privateRedeem) {
    async function prepare(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { actionId = ox_1.Hex.random(32), callbackGas = zoneGatewayCallbackGas, tempoRefundRecipient, fallbackRecipient = tempoRefundRecipient, gateway, portalAddress: portalAddress_, recipient, returnMemo, shareAmount, vault, withdrawalMemo, zoneId, } = parameters;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const readParameters = pickReadParameters(parameters);
        const [fromBlock, config] = await Promise.all([
            (0, getBlockNumber_js_1.getBlockNumber)(client, { cacheTime: 0 }),
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
        if (!(0, isAddressEqual_js_1.isAddressEqual)(assetToken, config.privateAsset))
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
                    return tempo_1.EarnShares.minimumOutput(parameters.assetAmountMin, 0);
                if (parameters.assetAmount !== undefined)
                    return tempo_1.EarnShares.minimumOutput(parameters.assetAmount, parameters.slippageBps);
                const assetAmount = await getRedeemQuote(client, {
                    ...readParameters,
                    shareAmount,
                    vault: config.vault,
                });
                return tempo_1.EarnShares.minimumOutput(assetAmount, parameters.slippageBps);
            })(),
        ]);
        const data = (0, encodeAbiParameters_js_1.encodeAbiParameters)(Abis.earnRouterCallbackData, [
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
    function calls(args) {
        return zoneActions.requestWithdrawal.calls(args);
    }
    privateRedeem.calls = calls;
})(privateRedeem || (exports.privateRedeem = privateRedeem = {}));
async function privateRedeemSync(client, parameters) {
    await assertPreparedZoneRequestChain(client, parameters);
    return zoneActions.requestWithdrawalSync(client, parameters);
}
async function waitForPrivateRedeem(client, parameters) {
    const { actionId, fromBlock, gateway, pollingInterval = client.pollingInterval, timeout = 60_000, vault, } = parameters;
    const event = (0, getAbiItem_js_1.getAbiItem)({
        abi: Abis.earnRouter,
        name: 'EarnRedeem',
    });
    const observerId = (0, stringify_js_1.stringify)([
        'waitForPrivateRedeem',
        client.uid,
        gateway,
        vault,
        actionId,
        fromBlock,
    ]);
    const { promise, reject, resolve } = (0, withResolvers_js_1.withResolvers)();
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
    unobserve = (0, observe_js_1.observe)(observerId, { reject: reject_, resolve: resolve_ }, (emit) => {
        const unpoll = (0, poll_js_1.poll)(async () => {
            try {
                const [log] = await (0, getLogs_js_1.getLogs)(client, {
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
            reject_(new errors_js_1.WaitForPrivateRedeemTimeoutError({ actionId, gateway }));
        }, timeout)
        : undefined;
    return await promise;
}
async function withdrawExact(client, parameters) {
    return withdrawExact.inner(sendTransaction_js_1.sendTransaction, client, parameters);
}
(function (withdrawExact) {
    async function inner(action, client, parameters) {
        const [args, shareToken] = await Promise.all([
            toWithdrawExactArgs(client, parameters),
            (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
                abi: Abis.earnVault,
                address: parameters.vault,
                functionName: 'earnShare',
            }),
        ]);
        return (await (0, errors_js_2.withExecutionError)(action)(client, {
            ...parameters,
            calls: withdrawExact.calls({ ...args, shareToken }),
        }));
    }
    withdrawExact.inner = inner;
    function call(...parameters) {
        const [, args] = (0, utils_js_1.resolveCallParameters)(parameters);
        const { recipient, vault } = args;
        const shareAmountMax = (() => {
            if (args.shareAmountMax !== undefined)
                return args.shareAmountMax;
            return maximumInput(args.shareAmount, args.slippageBps);
        })();
        return (0, utils_js_1.defineCall)({
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
    function calls(args) {
        const { shareToken, vault } = args;
        const assetAmount = internal_Token.toBaseUnits(args.assetAmount, undefined);
        const call = withdrawExact.call({ ...args, assetAmount });
        const [, , shareAmountMax] = call.args;
        return [
            (0, utils_js_1.defineCall)({
                address: shareToken,
                abi: Abis.tip20,
                functionName: 'approve',
                args: [vault, shareAmountMax],
            }),
            call,
        ];
    }
    withdrawExact.calls = calls;
    function extractEvent(logs, parameters) {
        const { vault } = parameters;
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.earnVault,
            eventName: 'WithdrewExact',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, vault)),
        });
        if (!log)
            throw new Error('`WithdrewExact` event not found.');
        return log;
    }
    withdrawExact.extractEvent = extractEvent;
    async function estimateGas(client, parameters) {
        return (0, estimateContractGas_js_1.estimateContractGas)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...withdrawExact.call(await toWithdrawExactArgs(client, parameters)),
        });
    }
    withdrawExact.estimateGas = estimateGas;
    async function simulate(client, parameters) {
        return (0, simulateContract_js_1.simulateContract)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...withdrawExact.call(await toWithdrawExactArgs(client, parameters)),
        });
    }
    withdrawExact.simulate = simulate;
})(withdrawExact || (exports.withdrawExact = withdrawExact = {}));
async function withdrawExactSync(client, parameters) {
    const { throwOnReceiptRevert = true, vault } = parameters;
    const receipt = await withdrawExact.inner(sendTransactionSync_js_1.sendTransactionSync, client, {
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
        return tempo_1.EarnShares.minimumOutput(parameters.shareAmountMin, 0);
    return tempo_1.EarnShares.minimumOutput(parameters.shareAmount, parameters.slippageBps);
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
    const [vaultAsset, shareToken, allowedZoneId, routerVault, privateAsset, routerVaultAsset, routerShareToken, supportsFlow,] = await (0, multicall_js_1.multicall)(client, {
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
    if (!(0, isAddressEqual_js_1.isAddressEqual)(routerVault, vault))
        throw new Error('Zone gateway is configured for a different Earn vault.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(routerVaultAsset, vaultAsset))
        throw new Error('Zone gateway vault asset does not match the Earn vault.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(routerShareToken, shareToken))
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
const interfaceIds = {
    asyncRedeem: '0xa1a6a1d7',
    exactWithdraw: '0x0adfb0b9',
    inKindDeposit: '0xce4790a9',
    syncRedeem: '0x94a2d467',
};
function toFeeConfig(config) {
    return {
        excess: config.excess,
        fixedFees: config.fixedFees.slice(0, config.fixedFeeCount),
    };
}
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
function maximumInput(shareAmount, slippageBps) {
    if (shareAmount <= 0n)
        throw new tempo_1.EarnShares.InvalidExpectedOutputError({
            expectedAmount: shareAmount,
        });
    if (!Number.isInteger(slippageBps) ||
        slippageBps < 0 ||
        slippageBps >= tempo_1.EarnShares.basisPointScale)
        throw new tempo_1.EarnShares.InvalidSlippageError({ slippageBps });
    const scale = BigInt(tempo_1.EarnShares.basisPointScale);
    const numerator = shareAmount * (scale + BigInt(slippageBps));
    return (numerator + scale - 1n) / scale;
}
async function toBaseUnitsLive(client, options) {
    const { amount, token, vault } = options;
    if (typeof amount === 'bigint')
        return amount;
    if (amount.decimals !== undefined)
        return internal_Token.toBaseUnits(amount, amount.decimals);
    const address = await (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        abi: Abis.earnVault,
        address: vault,
        functionName: token === 'asset' ? 'asset' : 'earnShare',
    });
    const { decimals } = await (0, utils_js_1.resolveTokenWithDecimals)(client, {
        token: address,
    });
    return internal_Token.toBaseUnits(amount, decimals);
}
function resolveRecipient(client, parameters) {
    if (parameters.recipient)
        return parameters.recipient;
    const account = parameters.account ?? client.account;
    if (!account)
        throw new account_js_1.AccountNotFoundError();
    return (0, parseAccount_js_1.parseAccount)(account).address;
}
//# sourceMappingURL=earn.js.map