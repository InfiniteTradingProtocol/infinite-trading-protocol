import { Hex } from 'ox';
import { parseAccount } from '../../../accounts/utils/parseAccount.js';
import { getCode } from '../../../actions/public/getCode.js';
import { getLogs } from '../../../actions/public/getLogs.js';
import { readContract } from '../../../actions/public/readContract.js';
import { simulateContract } from '../../../actions/public/simulateContract.js';
import { writeContract, } from '../../../actions/wallet/writeContract.js';
import { writeContractSync } from '../../../actions/wallet/writeContractSync.js';
import { zeroAddress } from '../../../constants/address.js';
import { maxUint64, maxUint256 } from '../../../constants/number.js';
import { AccountNotFoundError } from '../../../errors/account.js';
import { BaseError } from '../../../errors/base.js';
import { ChainNotFoundError } from '../../../errors/chain.js';
import { TransactionReceiptRevertedError } from '../../../errors/transaction.js';
import { getAbiItem } from '../../../utils/abi/getAbiItem.js';
import { parseEventLogs } from '../../../utils/abi/parseEventLogs.js';
import { isAddressEqual } from '../../../utils/address/isAddressEqual.js';
import { getChainContractAddress } from '../../../utils/chain/getChainContractAddress.js';
import * as Abis from '../../Abis.js';
import * as Addresses from '../../Addresses.js';
import { withExecutionError } from '../../internal/errors.js';
import { defineCall, pickWriteParameters, pickWriteSyncParameters, } from '../../internal/utils.js';
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
/**
 * Deploys a deterministic ERC-4626 Earn engine.
 *
 * @experimental
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
 * const hash = await Actions.earn.createErc4626Engine(client, {
 *   deploymentId: '0x...',
 *   factory: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function createErc4626Engine(client, parameters) {
    return createErc4626Engine.inner(writeContract, client, parameters);
}
(function (createErc4626Engine) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { account = client.account, chain = client.chain, deploymentId, factory, name, owner: owner_ = account, symbol, venue, ...rest } = parameters;
        if (!account)
            throw new AccountNotFoundError();
        if (!owner_)
            throw new Error('`owner` is required.');
        const owner = parseAccount(owner_).address;
        return (await withExecutionError(action)(client, {
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
    /**
     * Defines a call to `ERC4626EngineFactory.deploy`.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.createErc4626Engine.call({
     *     deploymentId: '0x...',
     *     factory: '0x...',
     *     owner: '0x...',
     *     venue: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        validateDeploymentId(args.deploymentId);
        return defineCall({
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
    /**
     * Predicts the deterministic engine address.
     *
     * @param client - Client.
     * @param args - Engine deployment arguments.
     * @returns The predicted engine address.
     */
    async function predict(client, args) {
        validateDeploymentId(args.deploymentId);
        return readContract(client, {
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
    /**
     * Extracts the `ERC4626EngineDeployed` event from factory logs.
     *
     * @param logs - The logs.
     * @param parameters - Factory address used to filter the logs.
     * @returns The deployment event.
     */
    function extractEvent(logs, parameters) {
        const [log] = parseEventLogs({
            abi: Abis.erc4626EngineFactory,
            eventName: 'ERC4626EngineDeployed',
            logs: logs.filter((log) => isAddressEqual(log.address, parameters.factory)),
            strict: true,
        });
        if (!log)
            throw new Error('`ERC4626EngineDeployed` event not found.');
        return log;
    }
    createErc4626Engine.extractEvent = extractEvent;
})(createErc4626Engine || (createErc4626Engine = {}));
/**
 * Deploys an ERC-4626 engine and waits for confirmation.
 *
 * @experimental
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
 * const result = await Actions.earn.createErc4626EngineSync(client, {
 *   deploymentId: '0x...',
 *   factory: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The receipt and deployed engine metadata.
 */
export async function createErc4626EngineSync(client, parameters) {
    const { factory, throwOnReceiptRevert = true } = parameters;
    const receipt = await createErc4626Engine.inner(writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = createErc4626Engine.extractEvent(receipt.logs, { factory });
    return { ...args, receipt };
}
/**
 * Creates an EarnShare, EarnVault, and EarnFees stack around an unbound engine.
 *
 * @experimental
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
 * const hash = await Actions.earn.createStack(client, {
 *   deploymentId: '0x...',
 *   engine: '0x...',
 *   factory: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function createStack(client, parameters) {
    return createStack.inner(writeContract, client, parameters);
}
(function (createStack) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { account = client.account, chain = client.chain, controls, deploymentId, distributor, engine, factory, fees, owner: owner_ = account, transferPolicyId, ...rest } = parameters;
        if (!account)
            throw new AccountNotFoundError();
        if (!owner_)
            throw new Error('`owner` is required.');
        return (await withExecutionError(action)(client, {
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
                owner: parseAccount(owner_).address,
                transferPolicyId,
            }),
        }));
    }
    createStack.inner = inner;
    /**
     * Defines a call to `EarnFactory.deploy`.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.createStack.call({
     *     deploymentId: '0x...',
     *     engine: '0x...',
     *     factory: '0x...',
     *     owner: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        validateDeploymentId(args.deploymentId);
        return defineCall({
            address: args.factory,
            abi: Abis.earnFactory,
            functionName: 'deploy',
            args: [toDeployParameters(args)],
        });
    }
    createStack.call = call;
    /**
     * Predicts the deterministic EarnShare and EarnFees addresses.
     *
     * @param client - Client.
     * @param args - Stack deployment arguments.
     * @returns The predicted EarnShare and EarnFees addresses.
     */
    async function predict(client, args) {
        validateDeploymentId(args.deploymentId);
        const parameters = toDeployParameters(args);
        const [earnShare, earnFees] = await Promise.all([
            readContract(client, {
                address: args.factory,
                abi: Abis.earnFactory,
                functionName: 'predictEarnShare',
                args: [parameters],
            }),
            readContract(client, {
                address: args.factory,
                abi: Abis.earnFactory,
                functionName: 'predictEarnFees',
                args: [parameters],
            }),
        ]);
        return { earnFees, earnShare };
    }
    createStack.predict = predict;
    /**
     * Extracts the `EarnStackDeployed` event from factory logs.
     *
     * @param logs - The logs.
     * @param parameters - Factory address used to filter the logs.
     * @returns The deployment event.
     */
    function extractEvent(logs, parameters) {
        const [log] = parseEventLogs({
            abi: Abis.earnFactory,
            eventName: 'EarnStackDeployed',
            logs: logs.filter((log) => isAddressEqual(log.address, parameters.factory)),
            strict: true,
        });
        if (!log)
            throw new Error('`EarnStackDeployed` event not found.');
        return log;
    }
    createStack.extractEvent = extractEvent;
})(createStack || (createStack = {}));
/**
 * Creates an Earn core stack and waits for confirmation.
 *
 * @experimental
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
 * const result = await Actions.earn.createStackSync(client, {
 *   deploymentId: '0x...',
 *   engine: '0x...',
 *   factory: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The receipt and deployed stack addresses.
 */
export async function createStackSync(client, parameters) {
    const { factory, throwOnReceiptRevert = true } = parameters;
    const receipt = await createStack.inner(writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = createStack.extractEvent(receipt.logs, { factory });
    return { ...args, receipt };
}
/**
 * Permanently binds an engine to its EarnVault.
 *
 * @experimental
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
 * const hash = await Actions.earn.bindEngine(client, {
 *   engine: '0x...',
 *   finalOwner: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client controlled by the final engine owner.
 * @param parameters - Parameters.
 * @returns The transaction hash.
 */
export async function bindEngine(client, parameters) {
    return bindEngine.inner(writeContract, client, parameters);
}
(function (bindEngine) {
    /** @internal */
    async function inner(action, client, parameters) {
        const { engine, finalOwner, vault, ...rest } = parameters;
        return (await withExecutionError(action)(client, {
            ...rest,
            ...bindEngine.call({ engine, finalOwner, vault }),
        }));
    }
    bindEngine.inner = inner;
    /**
     * Defines a call to `initializeEarnVault` on an Earn engine.
     *
     * Can be passed as a parameter to:
     * - [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas): estimate the gas cost of the call
     * - [`simulateContract`](https://viem.sh/docs/contract/simulateContract): simulate the call
     * - [`sendCalls`](https://viem.sh/docs/actions/wallet/sendCalls): send multiple calls
     *
     * @example
     * ```ts
     * import { createClient, http, walletActions } from 'viem'
     * import { tempoModerato } from 'viem/chains'
     * import { Actions } from 'viem/tempo'
     *
     * const client = createClient({ chain: tempoModerato, transport: http() })
     *   .extend(walletActions)
     * await client.sendTransaction({
     *   calls: [Actions.earn.bindEngine.call({
     *     engine: '0x...',
     *     finalOwner: '0x...',
     *     vault: '0x...',
     *   })],
     * })
     * ```
     *
     * @param args - Arguments.
     * @returns The call.
     */
    function call(args) {
        const { engine, finalOwner, vault } = args;
        if (finalOwner)
            return defineCall({
                address: engine,
                abi: engineBindingAbi,
                functionName: 'initializeEarnVault',
                args: [vault, finalOwner],
            });
        return defineCall({
            address: engine,
            abi: engineBindingAbi,
            functionName: 'initializeEarnVault',
            args: [vault],
        });
    }
    bindEngine.call = call;
    /**
     * Extracts the `EarnVaultInitialized` event from engine logs.
     *
     * @param logs - The logs.
     * @param parameters - Engine address used to filter the logs.
     * @returns The initialization event.
     */
    function extractEvent(logs, parameters) {
        const [log] = parseEventLogs({
            abi: engineBindingAbi,
            eventName: 'EarnVaultInitialized',
            logs: logs.filter((log) => isAddressEqual(log.address, parameters.engine)),
            strict: true,
        });
        if (!log)
            throw new Error('`EarnVaultInitialized` event not found.');
        return log;
    }
    bindEngine.extractEvent = extractEvent;
})(bindEngine || (bindEngine = {}));
/**
 * Binds an engine and waits for confirmation.
 *
 * @experimental
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
 * const result = await Actions.earn.bindEngineSync(client, {
 *   engine: '0x...',
 *   finalOwner: '0x...',
 *   vault: '0x...',
 * })
 * ```
 *
 * @param client - Client controlled by the final engine owner.
 * @param parameters - Parameters.
 * @returns The receipt and bound addresses.
 */
export async function bindEngineSync(client, parameters) {
    const { engine, throwOnReceiptRevert = true } = parameters;
    const receipt = await bindEngine.inner(writeContractSync, client, {
        ...parameters,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const { args } = bindEngine.extractEvent(receipt.logs, { engine });
    return { engine, vault: args.earnVault, receipt };
}
/**
 * Error thrown after a partially completed Earn stack deployment.
 *
 * @experimental
 */
export class DeployErc4626StackError extends BaseError {
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
/**
 * Deploys and binds a complete ERC-4626 Earn stack through sequential,
 * resumable transactions.
 *
 * @experimental
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
 * const result = await Actions.earn.deployErc4626StackSync(client, {
 *   deploymentId: '0x...',
 *   venue: '0x...',
 * })
 * ```
 *
 * @param client - Client.
 * @param parameters - Parameters.
 * @returns The deployed addresses and receipts created by this run.
 */
export async function deployErc4626StackSync(client, parameters) {
    const deployer = parameters.account ?? client.account;
    if (!deployer)
        throw new AccountNotFoundError();
    const owner_ = parameters.owner ?? deployer;
    const owner = parseAccount(owner_).address;
    const deployerAddress = parseAccount(deployer).address;
    const bindingAccount = (() => {
        if (parameters.bindingAccount)
            return parameters.bindingAccount;
        if (typeof owner_ !== 'string')
            return owner_;
        if (isAddressEqual(owner, deployerAddress))
            return deployer;
        return undefined;
    })();
    if (bindingAccount &&
        !isAddressEqual(parseAccount(bindingAccount).address, owner))
        throw new Error('`bindingAccount` must match `owner`.');
    const factories = (() => {
        if (parameters.factories)
            return parameters.factories;
        if (!client.chain)
            throw new ChainNotFoundError();
        return {
            earn: getChainContractAddress({
                chain: client.chain,
                contract: 'earnFactory',
            }),
            erc4626Engine: getChainContractAddress({
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
    const { gas: _, keyAuthorization: __, nonce: ___, owner: ____, ...sharedWriteParameters } = pickWriteParameters(parameters);
    const writeParameters = {
        ...sharedWriteParameters,
        ...pickWriteSyncParameters(parameters),
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
        !isAddressEqual(parameters.resume.engine, predictedEngine))
        throw new Error('The resumed engine does not match the factory prediction.');
    const engineExists = await hasCode(client, predictedEngine);
    if (!bindingAccount) {
        const boundVault = engineExists
            ? await readContract(client, {
                address: predictedEngine,
                abi: Abis.erc4626Engine,
                functionName: 'earnVault',
            })
            : zeroAddress;
        if (isAddressEqual(boundVault, zeroAddress))
            throw new Error('`bindingAccount` is required when the final owner differs from the deployment account.');
    }
    const receipts = {};
    try {
        if (!engineExists) {
            await simulateContract(client, {
                ...sharedWriteParameters,
                account: deployer,
                ...createErc4626Engine.call(engineArgs),
            });
            const receipt = await createErc4626Engine.inner(writeContractSync, client, {
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
            !isAddressEqual(parameters.resume.earnShare, predicted.earnShare))
            throw new Error('The resumed EarnShare does not match the factory prediction.');
        if (parameters.resume?.fees &&
            !isAddressEqual(parameters.resume.fees, predicted.earnFees))
            throw new Error('The resumed EarnFees does not match the factory prediction.');
        state.earnShare = predicted.earnShare;
        state.fees = predicted.earnFees;
        if (!(await hasCode(client, predicted.earnShare))) {
            if (await hasCode(client, predicted.earnFees))
                throw new Error('Predicted EarnFees exists without the predicted EarnShare.');
            await simulateContract(client, {
                ...sharedWriteParameters,
                account: deployer,
                ...createStack.call(stackArgs),
            });
            const receipt = await createStack.inner(writeContractSync, client, {
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
                !isAddressEqual(parameters.resume.vault, args.earnVault))
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
                if (!isAddressEqual(event.args.earnFees, predicted.earnFees))
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
        const boundVault = await readContract(client, {
            address: predictedEngine,
            abi: Abis.erc4626Engine,
            functionName: 'earnVault',
        });
        if (isAddressEqual(boundVault, zeroAddress)) {
            if (!bindingAccount)
                throw new Error('`bindingAccount` is required when the final owner differs from the deployment account.');
            const bindingParameters = {
                ...writeParameters,
                account: bindingAccount,
                engine: predictedEngine,
                finalOwner: owner,
                vault,
            };
            await simulateContract(client, {
                ...sharedWriteParameters,
                account: bindingAccount,
                ...bindEngine.call({
                    engine: predictedEngine,
                    finalOwner: owner,
                    vault,
                }),
            });
            const receipt = await bindEngine.inner(writeContractSync, client, bindingParameters);
            receipts.binding = receipt;
            if (receipt.status === 'pending')
                return { receipt };
            bindEngine.extractEvent(receipt.logs, { engine: predictedEngine });
        }
        else if (!isAddressEqual(boundVault, vault)) {
            throw new Error(`Engine is already bound to ${boundVault}.`);
        }
        const verified = await readContract(client, {
            address: predictedEngine,
            abi: Abis.erc4626Engine,
            functionName: 'earnVault',
        });
        if (!isAddressEqual(verified, vault))
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
    if (Hex.size(deploymentId) !== 32 || BigInt(deploymentId) === 0n)
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
        if (isAddressEqual(fee.account, zeroAddress))
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
        if (isAddressEqual(excess.account, zeroAddress))
            throw new Error('The excess fee recipient cannot be the zero address.');
    }
    const zeroFee = { account: zeroAddress, rateBps: 0 };
    const distributor = args.distributor?.distributor ?? zeroAddress;
    const updateDelay = args.distributor?.updateDelay ?? 0;
    if (args.distributor) {
        if (isAddressEqual(distributor, zeroAddress))
            throw new Error('An enabled distributor cannot be the zero address.');
        if (updateDelay <= 0)
            throw new Error('An enabled distributor requires a positive update delay.');
        if (fixedFees.length === 0)
            throw new Error('An enabled distributor requires at least one fixed fee.');
    }
    if (!Number.isSafeInteger(updateDelay) || updateDelay > 0xffffffffff)
        throw new Error('`updateDelay` must fit into uint40 seconds.');
    const transferPolicyId = args.transferPolicyId ?? 0n;
    if (transferPolicyId < 0n || transferPolicyId > maxUint64)
        throw new Error('`transferPolicyId` must fit into uint64.');
    const maxManagedAssets = args.controls?.maxManagedAssets ?? 0n;
    if (maxManagedAssets < 0n || maxManagedAssets > maxUint256)
        throw new Error('`maxManagedAssets` must fit into uint256.');
    return {
        controls: {
            asyncJanitor: args.controls?.asyncJanitor ?? zeroAddress,
            emergencyGuardian: args.controls?.emergencyGuardian ?? zeroAddress,
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
                    account: zeroAddress,
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
    const code = await getCode(client, { address });
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
    const tip20Factory = await readContract(client, {
        address: parameters.factories.earn,
        abi: Abis.earnFactory,
        functionName: 'tip20Factory',
    });
    if (!isAddressEqual(tip20Factory, Addresses.tip20Factory))
        throw new Error('EarnFactory uses an unexpected TIP-20 factory.');
}
async function verifyEngine(client, args, engine) {
    const [venue, owner] = await Promise.all([
        readContract(client, {
            address: engine,
            abi: Abis.erc4626Engine,
            functionName: 'vault',
        }),
        readContract(client, {
            address: engine,
            abi: Abis.erc4626Engine,
            functionName: 'owner',
        }),
    ]);
    if (!isAddressEqual(venue, args.venue))
        throw new Error('Engine venue verification failed.');
    if (!isAddressEqual(owner, args.owner))
        throw new Error('Engine owner verification failed.');
}
async function verifyStack(client, parameters) {
    const [engine, fees, operator, share] = await Promise.all([
        readContract(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'engine',
        }),
        readContract(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'earnFees',
        }),
        readContract(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'operator',
        }),
        readContract(client, {
            address: parameters.vault,
            abi: Abis.earnVault,
            functionName: 'earnShare',
        }),
    ]);
    if (!isAddressEqual(engine, parameters.engine))
        throw new Error('EarnVault engine verification failed.');
    if (!isAddressEqual(fees, parameters.fees))
        throw new Error('EarnVault fees verification failed.');
    if (!isAddressEqual(operator, parameters.owner))
        throw new Error('EarnVault operator verification failed.');
    if (!isAddressEqual(share, parameters.share))
        throw new Error('EarnVault share verification failed.');
}
async function findStackDeployment(client, parameters) {
    const event = getAbiItem({
        abi: Abis.earnFactory,
        name: 'EarnStackDeployed',
    });
    const logs = await getLogs(client, {
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
    if (error instanceof TransactionReceiptRevertedError)
        receipts[stage] = error.receipt;
    return new DeployErc4626StackError(error instanceof Error ? error : new Error(String(error)), { receipts: { ...receipts }, stage, state: { ...state } });
}
//# sourceMappingURL=deployment.js.map