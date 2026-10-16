import * as Bytes from 'ox/Bytes';
import * as Hex from 'ox/Hex';
import * as PublicKey from 'ox/PublicKey';
import * as Secp256k1 from 'ox/Secp256k1';
import { TokenId, ZoneId, ZoneRpcAuthentication } from 'ox/tempo';
import { parseAccount } from '../../accounts/utils/parseAccount.js';
import { getContract, } from '../../actions/getContract.js';
import { multicall, } from '../../actions/public/multicall.js';
import { readContract, } from '../../actions/public/readContract.js';
import { prepareTransactionRequest, } from '../../actions/wallet/prepareTransactionRequest.js';
import { sendTransaction, } from '../../actions/wallet/sendTransaction.js';
import { sendTransactionSync } from '../../actions/wallet/sendTransactionSync.js';
import { zeroHash } from '../../constants/bytes.js';
import { parseEventLogs } from '../../utils/abi/parseEventLogs.js';
import { observe } from '../../utils/observe.js';
import { poll } from '../../utils/poll.js';
import { withResolvers } from '../../utils/promise/withResolvers.js';
import { stringify } from '../../utils/stringify.js';
import * as Abis from '../Abis.js';
import * as Addresses from '../Addresses.js';
import { WaitForTempoBlockTimeoutError, } from '../errors.js';
import { withExecutionError } from '../internal/errors.js';
import { defineCall, pickWriteParameters, pickWriteSyncParameters, } from '../internal/utils.js';
import * as WithdrawalSenderTag from '../internal/WithdrawalSenderTag.js';
import * as Store from '../Store.js';
const defaultWithdrawalGas = 10000000n;
// TODO: Remove this compatibility ABI when T10 support is retired.
// Later Zone deployments append the derived address to these two values.
const sequencerEncryptionKeyAbi = [
    {
        name: 'sequencerEncryptionKey',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { type: 'bytes32', name: 'x' },
            { type: 'uint8', name: 'yParity' },
        ],
    },
];
/**
 * Deposits tokens into a zone on the parent Tempo chain.
 * Batches approve and deposit into a single transaction.
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
 * const hash = await Actions.zone.deposit(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Deposit parameters.
 * @returns The transaction hash.
 */
export async function deposit(client, parameters) {
    const { account = client.account, ...rest } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const recipient = parameters.recipient ?? account_.address;
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    const args = {
        ...parameters,
        recipient,
        tempoRefundRecipient,
    };
    return withExecutionError(sendTransaction)(client, {
        ...rest,
        account,
        calls: deposit.calls(args),
    });
}
(function (deposit) {
    /**
     * Defines the calls to approve and deposit tokens into a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { amount, memo = zeroHash, recipient, tempoRefundRecipient, token, zoneId, } = args;
        const portalAddress = args.portalAddress ?? Addresses.zonePortal(zoneId);
        const tokenAddress = TokenId.toAddress(token);
        const approveCall = defineCall({
            address: tokenAddress,
            abi: Abis.tip20,
            functionName: 'approve',
            args: [portalAddress, amount],
        });
        const depositCall = defineCall({
            address: portalAddress,
            abi: Abis.zonePortal,
            functionName: 'deposit',
            args: [tokenAddress, recipient, amount, memo, tempoRefundRecipient],
        });
        return [approveCall, depositCall];
    }
    deposit.calls = calls;
})(deposit || (deposit = {}));
/**
 * Deposits tokens into a zone on the parent Tempo chain and waits for the
 * transaction receipt.
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
 * const result = await Actions.zone.depositSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Deposit parameters.
 * @returns The transaction receipt.
 */
export async function depositSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true, ...rest } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const recipient = parameters.recipient ?? account_.address;
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    const args = {
        ...parameters,
        recipient,
        tempoRefundRecipient,
    };
    const receipt = await withExecutionError(sendTransactionSync)(client, {
        ...rest,
        account,
        throwOnReceiptRevert,
        calls: deposit.calls(args),
    });
    return { receipt };
}
/**
 * Gets the active sequencer encryption key for a zone.
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
 * const { keyIndex, publicKey } = await Actions.zone.getEncryptionKey(client, {
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Public client connected to the parent Tempo chain.
 * @param parameters - Zone encryption key parameters.
 * @returns The active encryption key and its zero-based index.
 */
export async function getEncryptionKey(client, parameters) {
    const { account, portalAddress: portalAddress_, zoneId, ...rest } = parameters;
    const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
    const [keyCountResult, publicKeyResult] = await multicall(client, {
        ...rest,
        account: account ? parseAccount(account).address : undefined,
        allowFailure: true,
        batchSize: 0,
        contracts: getEncryptionKey.calls({ portalAddress }),
        deployless: true,
    });
    if (keyCountResult.status === 'failure')
        throw keyCountResult.error;
    const keyCount = keyCountResult.result;
    if (keyCount === 0n || publicKeyResult.status === 'failure')
        throw keyCount === 0n
            ? new Error('No sequencer encryption key configured.')
            : publicKeyResult.error;
    const [x, prefix] = publicKeyResult.result;
    PublicKey.assert({ prefix, x: Hex.toBigInt(x) }, { compressed: true });
    return {
        keyIndex: keyCount - 1n,
        publicKey: { prefix: prefix, x },
    };
}
(function (getEncryptionKey) {
    /**
     * Defines calls to the encryption key count and active sequencer key.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        return [
            defineCall({
                address: args.portalAddress,
                abi: Abis.zonePortal,
                functionName: 'encryptionKeyCount',
            }),
            defineCall({
                address: args.portalAddress,
                abi: sequencerEncryptionKeyAbi,
                functionName: 'sequencerEncryptionKey',
            }),
        ];
    }
    getEncryptionKey.calls = calls;
})(getEncryptionKey || (getEncryptionKey = {}));
/**
 * Gets metadata and configuration for a zone portal.
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
 * const info = await Actions.zone.getPortalInfo(client, {
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Public client connected to the parent Tempo chain.
 * @param parameters - Zone portal parameters.
 * @returns The portal metadata and configuration.
 */
export async function getPortalInfo(client, parameters) {
    const { portalAddress: portalAddress_, zoneId, ...rest } = parameters;
    const portal = getContract({
        abi: Abis.zonePortal,
        address: portalAddress_ ?? Addresses.zonePortal(zoneId),
        client,
    });
    const [admin, enabledTokenCount, messenger, pauseExpiry, paused, pendingAdmin, sequencerCount, sequencerSetVersion, sequencerThreshold, verifier,] = await Promise.all([
        portal.read.admin(rest),
        portal.read.enabledTokenCount(rest),
        portal.read.messenger(rest),
        portal.read.pauseExpiry(rest),
        portal.read.paused(rest),
        portal.read.pendingAdmin(rest),
        portal.read.sequencerCount(rest),
        portal.read.sequencerSetVersion(rest),
        portal.read.sequencerThreshold(rest),
        portal.read.verifier(rest),
    ]);
    const [sequencers, enabledTokens] = await Promise.all([
        Promise.all(Array.from({ length: Number(sequencerCount) }, (_, index) => portal.read.sequencerAt([BigInt(index)], rest))),
        Promise.all(Array.from({ length: Number(enabledTokenCount) }, (_, index) => portal.read.enabledTokenAt([BigInt(index)], rest))),
    ]);
    return {
        admin,
        enabledTokens,
        messenger,
        pauseExpiry,
        paused,
        pendingAdmin,
        sequencers,
        sequencerSetVersion,
        sequencerThreshold,
        verifier,
    };
}
/**
 * Deposits tokens into a zone on the parent Tempo chain with encrypted
 * recipient and memo. Batches approve and depositEncrypted into a single
 * transaction.
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
 * const hash = await Actions.zone.encryptedDeposit(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Encrypted deposit parameters.
 * @returns The transaction hash.
 */
export async function encryptedDeposit(client, parameters) {
    const chainId = client.chain?.id;
    if (!chainId)
        throw new Error('`chain` is required.');
    const { account = client.account, ...rest } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    if ('encrypted' in parameters) {
        if (parameters.chainId !== chainId) {
            throw new Error('Prepared encrypted deposit chain ID does not match client chain.');
        }
        return withExecutionError(sendTransaction)(client, {
            ...pickWriteParameters(parameters),
            calls: encryptedDeposit.calls({
                ...parameters,
                tempoRefundRecipient,
            }),
        });
    }
    const recipient = parameters.recipient ?? account_.address;
    const prepared = await encryptedDeposit.prepare(client, {
        amount: parameters.amount,
        memo: parameters.memo,
        portalAddress: parameters.portalAddress,
        recipient,
        sender: account_.address,
        tempoRefundRecipient,
        token: parameters.token,
        zoneId: parameters.zoneId,
    });
    return withExecutionError(sendTransaction)(client, {
        ...rest,
        account,
        calls: encryptedDeposit.calls(prepared),
    });
}
(function (encryptedDeposit) {
    /**
     * Prepares an encrypted deposit instruction without broadcasting it.
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
     * const prepared = await Actions.zone.encryptedDeposit.prepare(client, {
     *   token: '0x20c0...0001',
     *   amount: 1_000_000n,
     *   recipient: '0x...',
     *   sender: '0x...',
     *   tempoRefundRecipient: '0x...',
     *   zoneId: 7,
     * })
     * ```
     *
     * @param client - Public client connected to the parent Tempo chain.
     * @param parameters - Encrypted deposit preparation parameters.
     * @returns A prepared encrypted deposit instruction.
     */
    async function prepare(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { amount, memo, portalAddress: portalAddress_, recipient, sender: sender_ = client.account?.address, tempoRefundRecipient, token, zoneId, ...rest } = parameters;
        if (!sender_)
            throw new Error('`sender` is required.');
        const sender = sender_;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const { keyIndex, publicKey } = await getEncryptionKey(client, {
            ...rest,
            portalAddress,
            zoneId,
        });
        const encrypted = await encryptDepositPayload(publicKey, recipient, sender, portalAddress, keyIndex, memo);
        return {
            amount,
            chainId,
            encrypted,
            keyIndex,
            portalAddress,
            sender,
            tempoRefundRecipient,
            token,
            zoneId,
        };
    }
    encryptedDeposit.prepare = prepare;
    /**
     * Prepares encrypted Zone recipient instructions without constructing a token
     * deposit.
     *
     * Use this when another contract or service controls the token movement and
     * only needs the ZonePortal `keyIndex` and encrypted recipient payload.
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
     * const recipient = await Actions.zone.encryptedDeposit.prepareRecipient(client, {
     *   recipient: '0x...',
     *   sender: '0x...',
     *   zoneId: 7,
     * })
     * ```
     *
     * @param client - Public client connected to the parent Tempo chain.
     * @param parameters - Encrypted recipient preparation parameters.
     * @returns Prepared encrypted recipient instructions.
     */
    async function prepareRecipient(client, parameters) {
        const chainId = client.chain?.id;
        if (!chainId)
            throw new Error('`chain` is required.');
        const { memo, portalAddress: portalAddress_, recipient, sender: sender_ = client.account?.address, zoneId, ...rest } = parameters;
        if (!sender_)
            throw new Error('`sender` is required.');
        const sender = sender_;
        const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
        const { keyIndex, publicKey } = await getEncryptionKey(client, {
            ...rest,
            portalAddress,
            zoneId,
        });
        const encrypted = await encryptDepositPayload(publicKey, recipient, sender, portalAddress, keyIndex, memo);
        return {
            chainId,
            encrypted,
            keyIndex,
            portalAddress,
            sender,
            zoneId,
        };
    }
    encryptedDeposit.prepareRecipient = prepareRecipient;
    /**
     * Defines the calls to approve and deposit tokens into a zone (encrypted).
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { amount, encrypted, keyIndex, tempoRefundRecipient, token, zoneId } = args;
        const portalAddress = args.portalAddress ?? Addresses.zonePortal(zoneId);
        const tokenAddress = TokenId.toAddress(token);
        const encryptedPayload = {
            ephemeralPubkeyX: encrypted.ephemeralPubkeyX,
            ephemeralPubkeyYParity: encrypted.ephemeralPubkeyYParity,
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            tag: encrypted.tag,
        };
        const approveCall = defineCall({
            address: tokenAddress,
            abi: Abis.tip20,
            functionName: 'approve',
            args: [portalAddress, amount],
        });
        const depositCall = defineCall({
            address: portalAddress,
            abi: Abis.zonePortal,
            functionName: 'depositEncrypted',
            args: [
                tokenAddress,
                amount,
                keyIndex,
                encryptedPayload,
                tempoRefundRecipient,
            ],
        });
        return [approveCall, depositCall];
    }
    encryptedDeposit.calls = calls;
})(encryptedDeposit || (encryptedDeposit = {}));
/**
 * Deposits tokens into a zone on the parent Tempo chain with encrypted
 * recipient and memo, and waits for the transaction receipt.
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
 * const result = await Actions.zone.encryptedDepositSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   zoneId: 7,
 * })
 * ```
 *
 * @param client - Wallet client connected to the parent Tempo chain.
 * @param parameters - Encrypted deposit parameters.
 * @returns The transaction receipt.
 */
export async function encryptedDepositSync(client, parameters) {
    const chainId = client.chain?.id;
    if (!chainId)
        throw new Error('`chain` is required.');
    const { account = client.account, throwOnReceiptRevert = true, ...rest } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    if ('encrypted' in parameters) {
        if (parameters.chainId !== chainId) {
            throw new Error('Prepared encrypted deposit chain ID does not match client chain.');
        }
        const receipt = await withExecutionError(sendTransactionSync)(client, {
            ...pickWriteParameters(parameters),
            ...pickWriteSyncParameters(parameters),
            throwOnReceiptRevert,
            calls: encryptedDeposit.calls({
                ...parameters,
                tempoRefundRecipient,
            }),
        });
        return { receipt };
    }
    const recipient = parameters.recipient ?? account_.address;
    const prepared = await encryptedDeposit.prepare(client, {
        amount: parameters.amount,
        memo: parameters.memo,
        portalAddress: parameters.portalAddress,
        recipient,
        sender: account_.address,
        tempoRefundRecipient,
        token: parameters.token,
        zoneId: parameters.zoneId,
    });
    const receipt = await withExecutionError(sendTransactionSync)(client, {
        ...rest,
        account,
        throwOnReceiptRevert,
        calls: encryptedDeposit.calls(prepared),
    });
    return { receipt };
}
/**
 * Returns the authenticated account address and authorization token expiry.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.getAuthorizationTokenInfo(client)
 * ```
 *
 * @param client - Zone client.
 * @returns Authorization token info.
 */
export async function getAuthorizationTokenInfo(client) {
    const info = await client.request({
        method: 'zone_getAuthorizationTokenInfo',
        params: [],
    });
    return {
        account: info.account,
        expiresAt: Hex.toBigInt(info.expiresAt),
    };
}
/**
 * Returns the fee required for a withdrawal from a zone, given a callback gas
 * limit.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const fee = await Actions.zone.getWithdrawalFee(client)
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Optional callback gas limit parameter.
 * @returns The withdrawal fee as a bigint.
 */
export async function getWithdrawalFee(client, parameters = {}) {
    const { callbackGas = 0n, ...rest } = parameters;
    return withExecutionError(readContract)(client, {
        ...rest,
        address: Addresses.zoneOutbox,
        abi: Abis.zoneOutbox,
        functionName: 'calculateWithdrawalFee',
        args: [callbackGas],
    });
}
/**
 * Returns the current zone metadata.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.getZoneInfo(client)
 * ```
 *
 * @param client - Zone client.
 * @returns Zone metadata.
 */
export async function getZoneInfo(client) {
    const info = await client.request({
        method: 'zone_getZoneInfo',
        params: [],
    });
    const tempoBlockNumber = info.tempoBlockNumber ??
        (await client.request({
            method: 'zone_getDepositStatus',
            params: ['0x0'],
        })).zoneProcessedThrough;
    return {
        chainId: Hex.toNumber(info.chainId),
        sequencers: 'sequencers' in info ? info.sequencers : [info.sequencer],
        tempoBlockNumber: Hex.toBigInt(tempoBlockNumber),
        zoneId: Hex.toNumber(info.zoneId),
        zoneTokens: info.zoneTokens,
    };
}
/**
 * Waits for a zone to import a Tempo block.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const info = await Actions.zone.waitForTempoBlock(client, {
 *   tempoBlockNumber: 42n,
 * })
 * ```
 *
 * @param client - Zone client.
 * @param parameters - Tempo block number and polling options.
 * @returns Zone metadata after the block has been imported.
 */
export async function waitForTempoBlock(client, parameters) {
    const { pollingInterval = client.pollingInterval, tempoBlockNumber, timeout = 60_000, } = parameters;
    const observerId = stringify([
        'waitForTempoBlock',
        client.uid,
        tempoBlockNumber,
    ]);
    const { promise, reject, resolve } = withResolvers();
    let timer;
    let unobserve;
    const cleanup = () => {
        clearTimeout(timer);
        unobserve();
    };
    unobserve = observe(observerId, { reject, resolve }, (emit) => {
        const unpoll = poll(async () => {
            try {
                const info = await getZoneInfo(client);
                if (info.tempoBlockNumber < tempoBlockNumber)
                    return;
                unpoll();
                emit.resolve(info);
            }
            catch (error) {
                unpoll();
                emit.reject(error);
            }
        }, {
            emitOnBegin: true,
            interval: pollingInterval,
        });
        return unpoll;
    });
    timer = timeout
        ? setTimeout(() => {
            reject(new WaitForTempoBlockTimeoutError({ tempoBlockNumber }));
        }, timeout)
        : undefined;
    return await promise.finally(cleanup);
}
/**
 * Requests a withdrawal from a zone to the parent Tempo chain via the
 * ZoneOutbox contract.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.zone.requestWithdrawal(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Withdrawal parameters.
 * @returns The transaction hash.
 */
export async function requestWithdrawal(client, parameters) {
    const { account = client.account } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    return withExecutionError(sendTransaction)(client, {
        ...pickWriteParameters(parameters),
        calls: requestWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
    });
}
(function (requestWithdrawal) {
    /**
     * Defines the calls to approve and request a withdrawal from a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { amount, callbackGas = 0n, data = '0x', fallbackRecipient = args.to, memo = zeroHash, to, token, } = args;
        return [
            defineCall({
                address: TokenId.toAddress(token),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [Addresses.zoneOutbox, amount],
            }),
            defineCall({
                address: Addresses.zoneOutbox,
                abi: Abis.zoneOutbox,
                functionName: 'requestWithdrawal',
                args: [
                    TokenId.toAddress(token),
                    to,
                    amount,
                    memo,
                    callbackGas,
                    fallbackRecipient,
                    data,
                    '0x',
                ],
            }),
        ];
    }
    requestWithdrawal.calls = calls;
    /**
     * Prepares a zone withdrawal transaction request without broadcasting it.
     *
     * Use this to inspect or modify the populated ZoneOutbox transaction request
     * and its maximum transaction fee before submitting a withdrawal.
     *
     * @example
     * ```ts
     * import { createClient } from 'viem'
     * import { Actions, http, Zone } from 'viem/tempo'
     *
     * const client = createClient({
     *   chain: Zone.a,
     *   transport: http(),
     * })
     *
     * const prepared = await Actions.zone.requestWithdrawal.prepare(client, {
     *   token: '0x20c0...0001',
     *   amount: 1_000_000n,
     *   to: '0x...',
     * })
     *
     * console.log(prepared.maxFee)
     * console.log(prepared.request.gas)
     * ```
     *
     * @param client - Zone client.
     * @param parameters - Withdrawal preparation parameters.
     * @returns The prepared transaction request, maximum fee, and withdrawal details.
     */
    async function prepare(client, parameters) {
        const { account = client.account, amount, callbackGas = 0n, data = '0x', fallbackRecipient, memo = zeroHash, to: to_, token, ...transactionRequest } = parameters;
        const account_ = account ? parseAccount(account) : undefined;
        const to = to_ ?? account_?.address;
        if (!to)
            throw new Error('`to` is required.');
        const request = await prepareTransactionRequest(client, {
            ...transactionRequest,
            account,
            calls: requestWithdrawal.calls({
                amount,
                callbackGas,
                data,
                fallbackRecipient,
                memo,
                to,
                token,
            }),
            gas: transactionRequest.gas ?? defaultWithdrawalGas,
        });
        const feePerGas = request.maxFeePerGas ?? request.gasPrice;
        if (typeof request.gas !== 'bigint' || typeof feePerGas !== 'bigint')
            throw new Error('Prepared transaction fee parameters are unavailable.');
        const maxFee = ceilDiv(request.gas * feePerGas, 1000000000000n);
        return {
            amount,
            callbackGas,
            data,
            fallbackRecipient: fallbackRecipient ?? to,
            maxFee,
            memo,
            request,
            to,
            token,
        };
    }
    requestWithdrawal.prepare = prepare;
})(requestWithdrawal || (requestWithdrawal = {}));
/**
 * Requests a withdrawal from a zone to the parent Tempo chain and waits for
 * the transaction receipt.
 *
 * @example
 * ```ts
 * import { createClient, createPublicClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { tempoModerato } from 'viem/chains'
 * import { Abis, Actions, Addresses, http as zoneHttp, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: zoneHttp(),
 * })
 *
 * const { receipt, senderTag } =
 *   await Actions.zone.requestWithdrawalSync(client, {
 *     amount: 1_000_000n,
 *     token: '0x20c0...0001',
 *   })
 *
 * // `senderTag` identifies the indexed WithdrawalProcessed event emitted on
 * // the parent Tempo chain after the withdrawal is processed.
 * const tempoClient = createPublicClient({
 *   chain: tempoModerato,
 *   transport: http(),
 * })
 * const [withdrawal] = await tempoClient.getContractEvents({
 *   address: Addresses.zonePortal(Zone.a.id),
 *   abi: Abis.zonePortal,
 *   eventName: 'WithdrawalProcessed',
 *   args: { senderTag },
 *   fromBlock: 0n,
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Withdrawal parameters.
 * @returns The transaction receipt and sender tag for the parent-chain withdrawal event.
 */
export async function requestWithdrawalSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true } = parameters;
    if (!account)
        throw new Error('`account` is required.');
    const account_ = parseAccount(account);
    const to = parameters.to ?? account_.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    const receipt = await withExecutionError(sendTransactionSync)(client, {
        ...pickWriteParameters(parameters),
        ...pickWriteSyncParameters(parameters),
        calls: requestWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const [event] = parseEventLogs({
        abi: Abis.zoneOutbox,
        logs: receipt.logs,
        eventName: 'WithdrawalRequested',
        strict: true,
    });
    if (!event)
        throw new Error('`WithdrawalRequested` event not found.');
    const senderTag = WithdrawalSenderTag.from({
        fallbackNonce: event.args.fallbackNonce,
        sender: event.args.sender,
        transactionHash: receipt.transactionHash,
    });
    return { receipt, senderTag };
}
/**
 * Requests a verifiable withdrawal from a zone to the parent Tempo chain via
 * the ZoneOutbox contract. Includes a `revealTo` public key so the sequencer
 * can encrypt the withdrawal details.
 *
 * The client must be connected to the **zone chain**.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const hash = await Actions.zone.requestVerifiableWithdrawal(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   revealTo: '0x02abc...def',
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Verifiable withdrawal parameters.
 * @returns The transaction hash.
 */
export async function requestVerifiableWithdrawal(client, parameters) {
    const { account = client.account } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    return withExecutionError(sendTransaction)(client, {
        ...pickWriteParameters(parameters),
        calls: requestVerifiableWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
    });
}
(function (requestVerifiableWithdrawal) {
    /**
     * Defines the calls to approve and request a verifiable withdrawal from a zone.
     *
     * @param args - Arguments.
     * @returns The calls.
     */
    function calls(args) {
        const { amount, callbackGas = 0n, data = '0x', fallbackRecipient = args.to, memo = zeroHash, revealTo, to, token, } = args;
        return [
            defineCall({
                address: TokenId.toAddress(token),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [Addresses.zoneOutbox, amount],
            }),
            defineCall({
                address: Addresses.zoneOutbox,
                abi: Abis.zoneOutbox,
                functionName: 'requestWithdrawal',
                args: [
                    TokenId.toAddress(token),
                    to,
                    amount,
                    memo,
                    callbackGas,
                    fallbackRecipient,
                    data,
                    revealTo,
                ],
            }),
        ];
    }
    requestVerifiableWithdrawal.calls = calls;
})(requestVerifiableWithdrawal || (requestVerifiableWithdrawal = {}));
/**
 * Requests a verifiable withdrawal from a zone to the parent Tempo chain and
 * waits for the transaction receipt.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const result = await Actions.zone.requestVerifiableWithdrawalSync(client, {
 *   token: '0x20c0...0001',
 *   amount: 1_000_000n,
 *   revealTo: '0x02abc...def',
 * })
 * ```
 *
 * @param client - Wallet client connected to the zone chain.
 * @param parameters - Verifiable withdrawal parameters.
 * @returns The transaction receipt.
 */
export async function requestVerifiableWithdrawalSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true } = parameters;
    const account_ = account ? parseAccount(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    const receipt = await withExecutionError(sendTransactionSync)(client, {
        ...pickWriteParameters(parameters),
        ...pickWriteSyncParameters(parameters),
        calls: requestVerifiableWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
        throwOnReceiptRevert,
    });
    return { receipt };
}
/**
 * Signs a zone authorization token and stores it for the zone HTTP transport.
 *
 * The `zoneId` is derived from `ZoneId.fromChainId(chain.id)` and can be overridden.
 *
 * @example
 * ```ts
 * import { createClient } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { Actions, http, Zone } from 'viem/tempo'
 *
 * const client = createClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: Zone.a,
 *   transport: http(),
 * })
 *
 * const result = await Actions.zone.signAuthorizationToken(client)
 * ```
 *
 * @param client - Zone wallet client.
 * @param parameters - Options including optional store override.
 * @returns The authentication object and serialized token.
 */
export async function signAuthorizationToken(client, parameters = {}) {
    const { account = client.account, issuedAt = Math.floor(Date.now() / 1000), expiresAt = issuedAt + 86_400, store = Store.defaultStore(), } = parameters;
    const chain = parameters.chain ?? client.chain;
    if (!chain)
        throw new Error('`signAuthorizationToken` requires a chain.');
    const zoneId = parameters.zoneId ?? ZoneId.fromChainId(chain.id);
    const account_ = account ? parseAccount(account) : undefined;
    if (!account_ || !account_.sign)
        throw new Error('`account` with `sign` is required.');
    const storeKey = `auth:${account_.address.toLowerCase()}:${chain.id}`;
    const authentication = ZoneRpcAuthentication.from({
        chainId: chain.id,
        expiresAt,
        issuedAt,
        zoneId,
    });
    const payload = ZoneRpcAuthentication.getSignPayload(authentication);
    const signature = await account_.sign({ hash: payload });
    const token = ZoneRpcAuthentication.serialize(authentication, {
        signature,
    });
    await store.setItem(storeKey, token);
    await store.setItem(`auth:token:${chain.id}`, token);
    return { authentication, token };
}
/**
 * Encrypts a deposit payload (recipient + memo) using ECIES with AES-256-GCM.
 *
 * @internal
 */
async function encryptDepositPayload(publicKey, recipient, sender, portalAddress, keyIndex, memo = zeroHash) {
    const sequencerPublicKey = PublicKey.from({
        prefix: publicKey.prefix,
        x: Hex.toBigInt(publicKey.x),
    });
    const { privateKey: ephemeralPrivateKey, publicKey: ephemeralPublicKey } = Secp256k1.createKeyPair();
    const compressedEphemeral = PublicKey.compress(ephemeralPublicKey);
    const sharedSecret = Secp256k1.getSharedSecret({
        privateKey: ephemeralPrivateKey,
        publicKey: sequencerPublicKey,
        as: 'Bytes',
    });
    const hkdfKey = await globalThis.crypto.subtle.importKey('raw', sharedSecret.slice(1), 'HKDF', false, ['deriveKey']);
    const aesKey = await globalThis.crypto.subtle.deriveKey({
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ecies-aes-key'),
        info: buildDepositHkdfInfo(portalAddress, keyIndex, Hex.fromNumber(compressedEphemeral.x, { size: 32 }), sender),
    }, hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const nonce = Bytes.random(12);
    const plaintext = buildDepositPlaintext(recipient, memo);
    const ciphertextWithTag = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, Bytes.from(plaintext)));
    const ciphertext = ciphertextWithTag.slice(0, -16);
    const tag = ciphertextWithTag.slice(-16);
    return {
        ciphertext: Hex.fromBytes(ciphertext),
        ephemeralPubkeyX: Hex.fromNumber(compressedEphemeral.x, { size: 32 }),
        ephemeralPubkeyYParity: compressedEphemeral.prefix,
        nonce: Hex.fromBytes(nonce),
        tag: Hex.fromBytes(tag),
    };
}
function buildDepositPlaintext(recipient, memo) {
    return Bytes.concat(Bytes.from(recipient), Bytes.from(memo), new Uint8Array(12));
}
function buildDepositHkdfInfo(portalAddress, keyIndex, ephemeralPubkeyX, sender) {
    return Bytes.concat(Bytes.from(portalAddress), Bytes.fromNumber(keyIndex, { size: 32 }), Bytes.from(ephemeralPubkeyX), Bytes.from(sender));
}
function ceilDiv(numerator, denominator) {
    return (numerator + denominator - 1n) / denominator;
}
//# sourceMappingURL=zone.js.map