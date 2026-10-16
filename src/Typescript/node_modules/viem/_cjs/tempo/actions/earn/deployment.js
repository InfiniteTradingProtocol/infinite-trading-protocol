"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployErc4626StackError = void 0;
exports.createErc4626Engine = createErc4626Engine;
exports.createErc4626EngineSync = createErc4626EngineSync;
exports.createStack = createStack;
exports.createStackSync = createStackSync;
exports.bindEngine = bindEngine;
exports.bindEngineSync = bindEngineSync;
exports.deployErc4626StackSync = deployErc4626StackSync;
const ox_1 = require("ox");
const parseAccount_js_1 = require("../../../accounts/utils/parseAccount.js");
const getCode_js_1 = require("../../../actions/public/getCode.js");
const getLogs_js_1 = require("../../../actions/public/getLogs.js");
const readContract_js_1 = require("../../../actions/public/readContract.js");
const simulateContract_js_1 = require("../../../actions/public/simulateContract.js");
const writeContract_js_1 = require("../../../actions/wallet/writeContract.js");
const writeContractSync_js_1 = require("../../../actions/wallet/writeContractSync.js");
const address_js_1 = require("../../../constants/address.js");
const number_js_1 = require("../../../constants/number.js");
const account_js_1 = require("../../../errors/account.js");
const base_js_1 = require("../../../errors/base.js");
const chain_js_1 = require("../../../errors/chain.js");
const transaction_js_1 = require("../../../errors/transaction.js");
const getAbiItem_js_1 = require("../../../utils/abi/getAbiItem.js");
const parseEventLogs_js_1 = require("../../../utils/abi/parseEventLogs.js");
const isAddressEqual_js_1 = require("../../../utils/address/isAddressEqual.js");
const getChainContractAddress_js_1 = require("../../../utils/chain/getChainContractAddress.js");
const Abis = require("../../Abis.js");
const Addresses = require("../../Addresses.js");
const errors_js_1 = require("../../internal/errors.js");
const utils_js_1 = require("../../internal/utils.js");
const engineBindingAbi = [
    {
        type: 'function',
        name: 'initializeEarnVault',
        inputs: [
            { name: 'earnVault_', type: 'address' },
            { name: 'finalOwner_', type: 'address' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'initializeEarnVault',
        inputs: [{ name: 'earnVault_', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'event',
        name: 'EarnVaultInitialized',
        inputs: [{ name: 'earnVault', type: 'address', indexed: true }],
        anonymous: false,
    },
];
async function createErc4626Engine(client, parameters) {
    return createErc4626Engine.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (createErc4626Engine) {
    async function inner(action, client, parameters) {
        const { account = client.account, chain = client.chain, deploymentId, factory, name, owner: owner_ = account, symbol, venue, ...rest } = parameters;
        if (!account)
            throw new account_js_1.AccountNotFoundError();
        if (!owner_)
            throw new Error('`owner` is required.');
        const owner = (0, parseAccount_js_1.parseAccount)(owner_).address;
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            account,
            chain,
            ...createErc4626Engine.call({
                deploymentId,
                factory,
                name,
                owner,
                symbol,
                venue,
            }),
        }));
    }
    createErc4626Engine.inner = inner;
    function call(args) {
        validateDeploymentId(args.deploymentId);
        return (0, utils_js_1.defineCall)({
            address: args.factory,
            abi: Abis.erc4626EngineFactory,
            functionName: 'deploy',
            args: [
                args.deploymentId,
                args.venue,
                args.owner,
                args.name ?? '',
                args.symbol ?? '',
            ],
        });
    }
    createErc4626Engine.call = call;
    async function predict(client, args) {
        validateDeploymentId(args.deploymentId);
        return (0, readContract_js_1.readContract)(client, {
            address: args.factory,
            abi: Abis.erc4626EngineFactory,
            functionName: 'predictEngine',
            args: [
                args.deploymentId,
                args.venue,
                args.owner,
                args.name ?? '',
                args.symbol ?? '',
            ],
        });
    }
    createErc4626Engine.predict = predict;
    function extractEvent(logs, parameters) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.erc4626EngineFactory,
            eventName: 'ERC4626EngineDeployed',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, parameters.factory)),
            strict: true,
        });
        if (!log)
            throw new Error('`ERC4626EngineDeployed` event not found.');
        return log;
    }
    createErc4626Engine.extractEvent = extractEvent;
})(createErc4626Engine || (exports.createErc4626Engine = createErc4626Engine = {}));
async function createErc4626EngineSync(client, parameters) {
    const { factory, throwOnReceiptRevert = true } = parameters;
    const receipt = await createErc4626Engine.inner(writeContractSync_js_1.writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = createErc4626Engine.extractEvent(receipt.logs, { factory });
    return { ...args, receipt };
}
async function createStack(client, parameters) {
    return createStack.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (createStack) {
    async function inner(action, client, parameters) {
        const { account = client.account, chain = client.chain, controls, deploymentId, distributor, engine, factory, fees, owner: owner_ = account, transferPolicyId, ...rest } = parameters;
        if (!account)
            throw new account_js_1.AccountNotFoundError();
        if (!owner_)
            throw new Error('`owner` is required.');
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            account,
            chain,
            ...createStack.call({
                controls,
                deploymentId,
                distributor,
                engine,
                factory,
                fees,
                owner: (0, parseAccount_js_1.parseAccount)(owner_).address,
                transferPolicyId,
            }),
        }));
    }
    createStack.inner = inner;
    function call(args) {
        validateDeploymentId(args.deploymentId);
        return (0, utils_js_1.defineCall)({
            address: args.factory,
            abi: Abis.earnFactory,
            functionName: 'deploy',
            args: [toDeployParameters(args)],
        });
    }
    createStack.call = call;
    async function predict(client, args) {
        validateDeploymentId(args.deploymentId);
        const parameters = toDeployParameters(args);
        const [earnShare, earnFees] = await Promise.all([
            (0, readContract_js_1.readContract)(client, {
                address: args.factory,
                abi: Abis.earnFactory,
                functionName: 'predictEarnShare',
                args: [parameters],
            }),
            (0, readContract_js_1.readContract)(client, {
                address: args.factory,
                abi: Abis.earnFactory,
                functionName: 'predictEarnFees',
                args: [parameters],
            }),
        ]);
        return { earnFees, earnShare };
    }
    createStack.predict = predict;
    function extractEvent(logs, parameters) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: Abis.earnFactory,
            eventName: 'EarnStackDeployed',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, parameters.factory)),
            strict: true,
        });
        if (!log)
            throw new Error('`EarnStackDeployed` event not found.');
        return log;
    }
    createStack.extractEvent = extractEvent;
})(createStack || (exports.createStack = createStack = {}));
async function createStackSync(client, parameters) {
    const { factory, throwOnReceiptRevert = true } = parameters;
    const receipt = await createStack.inner(writeContractSync_js_1.writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = createStack.extractEvent(receipt.logs, { factory });
    return { ...args, receipt };
}
async function bindEngine(client, parameters) {
    return bindEngine.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (bindEngine) {
    async function inner(action, client, parameters) {
        const { engine, finalOwner, vault, ...rest } = parameters;
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...bindEngine.call({ engine, finalOwner, vault }),
        }));
    }
    bindEngine.inner = inner;
    function call(args) {
        const { engine, finalOwner, vault } = args;
        if (finalOwner)
            return (0, utils_js_1.defineCall)({
                address: engine,
                abi: engineBindingAbi,
                functionName: 'initializeEarnVault',
                args: [vault, finalOwner],
            });
        return (0, utils_js_1.defineCall)({
            address: engine,
            abi: engineBindingAbi,
            functionName: 'initializeEarnVault',
            args: [vault],
        });
    }
    bindEngine.call = call;
    function extractEvent(logs, parameters) {
        const [log] = (0, parseEventLogs_js_1.parseEventLogs)({
            abi: engineBindingAbi,
            eventName: 'EarnVaultInitialized',
            logs: logs.filter((log) => (0, isAddressEqual_js_1.isAddressEqual)(log.address, parameters.engine)),
            strict: true,
        });
        if (!log)
            throw new Error('`EarnVaultInitialized` event not found.');
        return log;
    }
    bindEngine.extractEvent = extractEvent;
})(bindEngine || (exports.bindEngine = bindEngine = {}));
async function bindEngineSync(client, parameters) {
    const { engine, throwOnReceiptRevert = true } = parameters;
    const receipt = await bindEngine.inner(writeContractSync_js_1.writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = bindEngine.extractEvent(receipt.logs, { engine });
    return { engine, vault: args.earnVault, receipt };
}
class DeployErc4626StackError extends base_js_1.BaseError {
    constructor(cause, parameters) {
        super(`ERC-4626 Earn deployment failed during ${parameters.stage}.`, {
            cause,
            name: 'DeployErc4626StackError',
        });
        Object.defineProperty(this, "receipts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "stage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.receipts = parameters.receipts;
        this.stage = parameters.stage;
        this.state = parameters.state;
    }
}
exports.DeployErc4626StackError = DeployErc4626StackError;
async function deployErc4626StackSync(client, parameters) {
    const deployer = parameters.account ?? client.account;
    if (!deployer)
        throw new account_js_1.AccountNotFoundError();
    const owner_ = parameters.owner ?? deployer;
    const owner = (0, parseAccount_js_1.parseAccount)(owner_).address;
    const deployerAddress = (0, parseAccount_js_1.parseAccount)(deployer).address;
    const bindingAccount = (() => {
        if (parameters.bindingAccount)
            return parameters.bindingAccount;
        if (typeof owner_ !== 'string')
            return owner_;
        if ((0, isAddressEqual_js_1.isAddressEqual)(owner, deployerAddress))
            return deployer;
        return undefined;
    })();
    if (bindingAccount &&
        !(0, isAddressEqual_js_1.isAddressEqual)((0, parseAccount_js_1.parseAccount)(bindingAccount).address, owner))
        throw new Error('`bindingAccount` must match `owner`.');
    const factories = (() => {
        if (parameters.factories)
            return parameters.factories;
        if (!client.chain)
            throw new chain_js_1.ChainNotFoundError();
        return {
            earn: (0, getChainContractAddress_js_1.getChainContractAddress)({
                chain: client.chain,
                contract: 'earnFactory',
            }),
            erc4626Engine: (0, getChainContractAddress_js_1.getChainContractAddress)({
                chain: client.chain,
                contract: 'erc4626EngineFactory',
            }),
        };
    })();
    validateDeploymentId(parameters.deploymentId);
    if (parameters.resume &&
        parameters.resume.deploymentId.toLowerCase() !==
            parameters.deploymentId.toLowerCase())
        throw new Error('The resumed deployment ID does not match `deploymentId`.');
    await validateContracts(client, {
        factories,
        venue: parameters.venue,
    });
    const { gas: _, keyAuthorization: __, nonce: ___, owner: ____, ...sharedWriteParameters } = (0, utils_js_1.pickWriteParameters)(parameters);
    const writeParameters = {
        ...sharedWriteParameters,
        ...(0, utils_js_1.pickWriteSyncParameters)(parameters),
        account: deployer,
        throwOnReceiptRevert: true,
    };
    const engineArgs = {
        deploymentId: parameters.deploymentId,
        factory: factories.erc4626Engine,
        name: parameters.name,
        owner,
        symbol: parameters.symbol,
        venue: parameters.venue,
    };
    const predictedEngine = await createErc4626Engine.predict(client, engineArgs);
    const state = {
        deploymentId: parameters.deploymentId,
        earnShare: parameters.resume?.earnShare,
        engine: predictedEngine,
        fees: parameters.resume?.fees,
        vault: parameters.resume?.vault,
    };
    if (parameters.resume?.engine &&
        !(0, isAddressEqual_js_1.isAddressEqual)(parameters.resume.engine, predictedEngine))
        throw new Error('The resumed engine does not match the factory prediction.');
    const engineExists = await hasCode(client, predictedEngine);
    if (!bindingAccount) {
        const boundVault = engineExists
            ? await (0, readContract_js_1.readContract)(client, {
                address: predictedEngine,
                abi: Abis.erc4626Engine,
                functionName: 'earnVault',
            })
            : address_js_1.zeroAddress;
        if ((0, isAddressEqual_js_1.isAddressEqual)(boundVault, address_js_1.zeroAddress))
            throw new Error('`bindingAccount` is required when the final owner differs from the deployment account.');
    }
    const receipts = {};
    try {
        if (!engineExists) {
            await (0, simulateContract_js_1.simulateContract)(client, {
                ...sharedWriteParameters,
                account: deployer,
                ...createErc4626Engine.call(engineArgs),
            });
            const receipt = await createErc4626Engine.inner(writeContractSync_js_1.writeContractSync, client, {
                ...writeParameters,
                ...engineArgs,
            });
            receipts.engine = receipt;
            if (receipt.status === 'pending')
                return { receipt };
            createErc4626Engine.extractEvent(receipt.logs, {
                factory: factories.erc4626Engine,
            });
        }
        await verifyEngine(client, engineArgs, predictedEngine);
    }
    catch (error) {
        throw deploymentError(error, 'engine', state, receipts);
    }
    const stackArgs = {
        controls: parameters.controls,
        deploymentId: parameters.deploymentId,
        distributor: parameters.distributor,
        engine: predictedEngine,
        factory: factories.earn,
        fees: parameters.fees,
        owner,
        transferPolicyId: parameters.transferPolicyId,
    };
    try {
        const predicted = await createStack.predict(client, stackArgs);
        if (parameters.resume?.earnShare &&
            !(0, isAddressEqual_js_1.isAddressEqual)(parameters.resume.earnShare, predicted.earnShare))
            throw new Error('The resumed EarnShare does not match the factory prediction.');
        if (parameters.resume?.fees &&
            !(0, isAddressEqual_js_1.isAddressEqual)(parameters.resume.fees, predicted.earnFees))
            throw new Error('The resumed EarnFees does not match the factory prediction.');
        state.earnShare = predicted.earnShare;
        state.fees = predicted.earnFees;
        if (!(await hasCode(client, predicted.earnShare))) {
            if (await hasCode(client, predicted.earnFees))
                throw new Error('Predicted EarnFees exists without the predicted EarnShare.');
            await (0, simulateContract_js_1.simulateContract)(client, {
                ...sharedWriteParameters,
                account: deployer,
                ...createStack.call(stackArgs),
            });
            const receipt = await createStack.inner(writeContractSync_js_1.writeContractSync, client, {
                ...writeParameters,
                ...stackArgs,
            });
            receipts.stack = receipt;
            if (receipt.status === 'pending')
                return { receipt };
            const { args } = createStack.extractEvent(receipt.logs, {
                factory: factories.earn,
            });
            state.vault = args.earnVault;
            if (parameters.resume?.vault &&
                !(0, isAddressEqual_js_1.isAddressEqual)(parameters.resume.vault, args.earnVault))
                throw new Error('The resumed EarnVault does not match the factory deployment.');
        }
        else {
            if (!(await hasCode(client, predicted.earnFees)))
                throw new Error('Predicted EarnShare exists without the predicted EarnFees.');
            state.vault = parameters.resume?.vault;
            if (!state.vault) {
                const event = await findStackDeployment(client, {
                    earnShare: predicted.earnShare,
                    factory: factories.earn,
                    fromBlock: parameters.fromBlock,
                });
                state.vault = event.args.earnVault;
                if (!(0, isAddressEqual_js_1.isAddressEqual)(event.args.earnFees, predicted.earnFees))
                    throw new Error('Recovered EarnFees does not match the factory prediction.');
            }
        }
        if (!state.vault)
            throw new Error('EarnVault address was not recovered.');
        await verifyStack(client, {
            engine: predictedEngine,
            fees: predicted.earnFees,
            owner,
            share: predicted.earnShare,
            vault: state.vault,
        });
    }
    catch (error) {
        throw deploymentError(error, 'stack', state, receipts);
    }
    try {
        const vault = state.vault;
        const boundVault = await (0, readContract_js_1.readContract)(client, {
            address: predictedEngine,
            abi: Abis.erc4626Engine,
            functionName: 'earnVault',
        });
        if ((0, isAddressEqual_js_1.isAddressEqual)(boundVault, address_js_1.zeroAddress)) {
            if (!bindingAccount)
                throw new Error('`bindingAccount` is required when the final owner differs from the deployment account.');
            const bindingParameters = {
                ...writeParameters,
                account: bindingAccount,
                engine: predictedEngine,
                finalOwner: owner,
                vault,
            };
            await (0, simulateContract_js_1.simulateContract)(client, {
                ...sharedWriteParameters,
                account: bindingAccount,
                ...bindEngine.call({
                    engine: predictedEngine,
                    finalOwner: owner,
                    vault,
                }),
            });
            const receipt = await bindEngine.inner(writeContractSync_js_1.writeContractSync, client, bindingParameters);
            receipts.binding = receipt;
            if (receipt.status === 'pending')
                return { receipt };
            bindEngine.extractEvent(receipt.logs, { engine: predictedEngine });
        }
        else if (!(0, isAddressEqual_js_1.isAddressEqual)(boundVault, vault)) {
            throw new Error(`Engine is already bound to ${boundVault}.`);
        }
        const verified = await (0, readContract_js_1.readContract)(client, {
            address: predictedEngine,
            abi: Abis.erc4626Engine,
            functionName: 'earnVault',
        });
        if (!(0, isAddressEqual_js_1.isAddressEqual)(verified, vault))
            throw new Error('Engine binding verification failed.');
    }
    catch (error) {
        throw deploymentError(error, 'binding', state, receipts);
    }
    return {
        deploymentId: parameters.deploymentId,
        earnShare: state.earnShare,
        engine: predictedEngine,
        fees: state.fees,
        receipts,
        vault: state.vault,
    };
}
function validateDeploymentId(deploymentId) {
    if (ox_1.Hex.size(deploymentId) !== 32 || BigInt(deploymentId) === 0n)
        throw new Error('`deploymentId` must be a nonzero 32-byte hex value.');
}
function toDeployParameters(args) {
    const fixedFees = args.fees?.fixedFees ?? [];
    if (fixedFees.length > 4)
        throw new Error('Earn supports at most four fixed fee recipients.');
    const seen = new Set();
    let totalRateBps = 0;
    for (const fee of fixedFees) {
        validateFeeRate(fee.rateBps, '`fixedFees[].rateBps`', false);
        if ((0, isAddressEqual_js_1.isAddressEqual)(fee.account, address_js_1.zeroAddress))
            throw new Error('Fixed fee recipients cannot be the zero address.');
        const account = fee.account.toLowerCase();
        if (seen.has(account))
            throw new Error('Fixed fee recipients must be unique.');
        seen.add(account);
        totalRateBps += fee.rateBps;
    }
    if (totalRateBps > 10_000)
        throw new Error('The total fixed fee rate cannot exceed 10,000 bps.');
    const excess = args.fees?.excess;
    if (excess) {
        validateFeeRate(excess.annualTargetRateBps, '`annualTargetRateBps`', true);
        validateFeeRate(excess.rateBps, '`excess.rateBps`', false);
        if ((0, isAddressEqual_js_1.isAddressEqual)(excess.account, address_js_1.zeroAddress))
            throw new Error('The excess fee recipient cannot be the zero address.');
    }
    const zeroFee = { account: address_js_1.zeroAddress, rateBps: 0 };
    const distributor = args.distributor?.distributor ?? address_js_1.zeroAddress;
    const updateDelay = args.distributor?.updateDelay ?? 0;
    if (args.distributor) {
        if ((0, isAddressEqual_js_1.isAddressEqual)(distributor, address_js_1.zeroAddress))
            throw new Error('An enabled distributor cannot be the zero address.');
        if (updateDelay <= 0)
            throw new Error('An enabled distributor requires a positive update delay.');
        if (fixedFees.length === 0)
            throw new Error('An enabled distributor requires at least one fixed fee.');
    }
    if (!Number.isSafeInteger(updateDelay) || updateDelay > 0xffffffffff)
        throw new Error('`updateDelay` must fit into uint40 seconds.');
    const transferPolicyId = args.transferPolicyId ?? 0n;
    if (transferPolicyId < 0n || transferPolicyId > number_js_1.maxUint64)
        throw new Error('`transferPolicyId` must fit into uint64.');
    const maxManagedAssets = args.controls?.maxManagedAssets ?? 0n;
    if (maxManagedAssets < 0n || maxManagedAssets > number_js_1.maxUint256)
        throw new Error('`maxManagedAssets` must fit into uint256.');
    return {
        controls: {
            asyncJanitor: args.controls?.asyncJanitor ?? address_js_1.zeroAddress,
            emergencyGuardian: args.controls?.emergencyGuardian ?? address_js_1.zeroAddress,
            maxManagedAssets,
            migrationMode: (args.controls?.migrationMode ?? 'userOnly') === 'userOnly' ? 0 : 1,
        },
        deploymentId: args.deploymentId,
        distributorConfig: { distributor, updateDelay },
        engine: args.engine,
        fees: {
            excess: excess
                ? {
                    account: excess.account,
                    annualTargetRateBps: excess.annualTargetRateBps,
                    enabled: true,
                    excessFeeRateBps: excess.rateBps,
                }
                : {
                    account: address_js_1.zeroAddress,
                    annualTargetRateBps: 0,
                    enabled: false,
                    excessFeeRateBps: 0,
                },
            fixedFeeCount: fixedFees.length,
            fixedFees: [
                fixedFees[0] ?? zeroFee,
                fixedFees[1] ?? zeroFee,
                fixedFees[2] ?? zeroFee,
                fixedFees[3] ?? zeroFee,
            ],
        },
        owner: args.owner,
        transferPolicyId,
    };
}
function validateFeeRate(rate, name, allowZero) {
    if (!Number.isInteger(rate) || rate < (allowZero ? 0 : 1) || rate > 10_000)
        throw new Error(`${name} must be an integer between ${allowZero ? 0 : 1} and 10,000.`);
}
async function hasCode(client, address) {
    const code = await (0, getCode_js_1.getCode)(client, { address });
    return code !== undefined && code !== '0x';
}
async function validateContracts(client, parameters) {
    const [engineFactory, earnFactory, venue] = await Promise.all([
        hasCode(client, parameters.factories.erc4626Engine),
        hasCode(client, parameters.factories.earn),
        hasCode(client, parameters.venue),
    ]);
    if (!engineFactory)
        throw new Error('ERC4626EngineFactory has no code.');
    if (!earnFactory)
        throw new Error('EarnFactory has no code.');
    if (!venue)
        throw new Error('ERC-4626 venue has no code.');
    const tip20Factory = await (0, readContract_js_1.readContract)(client, {
        address: parameters.factories.earn,
        abi: Abis.earnFactory,
        functionName: 'tip20Factory',
    });
    if (!(0, isAddressEqual_js_1.isAddressEqual)(tip20Factory, Addresses.tip20Factory))
        throw new Error('EarnFactory uses an unexpected TIP-20 factory.');
}
async function verifyEngine(client, args, engine) {
    const [venue, owner] = await Promise.all([
        (0, readContract_js_1.readContract)(client, {
            address: engine,
            abi: Abis.erc4626Engine,
            functionName: 'vault',
        }),
        (0, readContract_js_1.readContract)(client, {
            address: engine,
            abi: Abis.erc4626Engine,
            functionName: 'owner',
        }),
    ]);
    if (!(0, isAddressEqual_js_1.isAddressEqual)(venue, args.venue))
        throw new Error('Engine venue verification failed.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(owner, args.owner))
        throw new Error('Engine owner verification failed.');
}
async function verifyStack(client, parameters) {
    const [engine, fees, operator, share] = await Promise.all([
        (0, readContract_js_1.readContract)(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'engine',
        }),
        (0, readContract_js_1.readContract)(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'earnFees',
        }),
        (0, readContract_js_1.readContract)(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'operator',
        }),
        (0, readContract_js_1.readContract)(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'earnShare',
        }),
    ]);
    if (!(0, isAddressEqual_js_1.isAddressEqual)(engine, parameters.engine))
        throw new Error('EarnVault engine verification failed.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(fees, parameters.fees))
        throw new Error('EarnVault fees verification failed.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(operator, parameters.owner))
        throw new Error('EarnVault operator verification failed.');
    if (!(0, isAddressEqual_js_1.isAddressEqual)(share, parameters.share))
        throw new Error('EarnVault share verification failed.');
}
async function findStackDeployment(client, parameters) {
    const event = (0, getAbiItem_js_1.getAbiItem)({
        abi: Abis.earnFactory,
        name: 'EarnStackDeployed',
    });
    const logs = await (0, getLogs_js_1.getLogs)(client, {
        address: parameters.factory,
        args: { earnShare: parameters.earnShare },
        event,
        fromBlock: parameters.fromBlock ?? 0n,
        strict: true,
        toBlock: 'latest',
    });
    const log = logs.at(-1);
    if (!log)
        throw new Error('Prior `EarnStackDeployed` event not found.');
    return log;
}
function deploymentError(error, stage, state, receipts) {
    if (error instanceof DeployErc4626StackError)
        return error;
    if (error instanceof transaction_js_1.TransactionReceiptRevertedError)
        receipts[stage] = error.receipt;
    return new DeployErc4626StackError(error instanceof Error ? error : new Error(String(error)), { receipts: { ...receipts }, stage, state: { ...state } });
}
//# sourceMappingURL=deployment.js.map