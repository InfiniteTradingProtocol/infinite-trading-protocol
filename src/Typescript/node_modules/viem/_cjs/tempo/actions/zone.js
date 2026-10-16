"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deposit = deposit;
exports.depositSync = depositSync;
exports.getEncryptionKey = getEncryptionKey;
exports.getPortalInfo = getPortalInfo;
exports.encryptedDeposit = encryptedDeposit;
exports.encryptedDepositSync = encryptedDepositSync;
exports.getAuthorizationTokenInfo = getAuthorizationTokenInfo;
exports.getWithdrawalFee = getWithdrawalFee;
exports.getZoneInfo = getZoneInfo;
exports.waitForTempoBlock = waitForTempoBlock;
exports.requestWithdrawal = requestWithdrawal;
exports.requestWithdrawalSync = requestWithdrawalSync;
exports.requestVerifiableWithdrawal = requestVerifiableWithdrawal;
exports.requestVerifiableWithdrawalSync = requestVerifiableWithdrawalSync;
exports.signAuthorizationToken = signAuthorizationToken;
const Bytes = require("ox/Bytes");
const Hex = require("ox/Hex");
const PublicKey = require("ox/PublicKey");
const Secp256k1 = require("ox/Secp256k1");
const tempo_1 = require("ox/tempo");
const parseAccount_js_1 = require("../../accounts/utils/parseAccount.js");
const getContract_js_1 = require("../../actions/getContract.js");
const multicall_js_1 = require("../../actions/public/multicall.js");
const readContract_js_1 = require("../../actions/public/readContract.js");
const prepareTransactionRequest_js_1 = require("../../actions/wallet/prepareTransactionRequest.js");
const sendTransaction_js_1 = require("../../actions/wallet/sendTransaction.js");
const sendTransactionSync_js_1 = require("../../actions/wallet/sendTransactionSync.js");
const bytes_js_1 = require("../../constants/bytes.js");
const parseEventLogs_js_1 = require("../../utils/abi/parseEventLogs.js");
const observe_js_1 = require("../../utils/observe.js");
const poll_js_1 = require("../../utils/poll.js");
const withResolvers_js_1 = require("../../utils/promise/withResolvers.js");
const stringify_js_1 = require("../../utils/stringify.js");
const Abis = require("../Abis.js");
const Addresses = require("../Addresses.js");
const errors_js_1 = require("../errors.js");
const errors_js_2 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
const WithdrawalSenderTag = require("../internal/WithdrawalSenderTag.js");
const Store = require("../Store.js");
const defaultWithdrawalGas = 10000000n;
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
async function deposit(client, parameters) {
    const { account = client.account, ...rest } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const recipient = parameters.recipient ?? account_.address;
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    const args = {
        ...parameters,
        recipient,
        tempoRefundRecipient,
    };
    return (0, errors_js_2.withExecutionError)(sendTransaction_js_1.sendTransaction)(client, {
        ...rest,
        account,
        calls: deposit.calls(args),
    });
}
(function (deposit) {
    function calls(args) {
        const { amount, memo = bytes_js_1.zeroHash, recipient, tempoRefundRecipient, token, zoneId, } = args;
        const portalAddress = args.portalAddress ?? Addresses.zonePortal(zoneId);
        const tokenAddress = tempo_1.TokenId.toAddress(token);
        const approveCall = (0, utils_js_1.defineCall)({
            address: tokenAddress,
            abi: Abis.tip20,
            functionName: 'approve',
            args: [portalAddress, amount],
        });
        const depositCall = (0, utils_js_1.defineCall)({
            address: portalAddress,
            abi: Abis.zonePortal,
            functionName: 'deposit',
            args: [tokenAddress, recipient, amount, memo, tempoRefundRecipient],
        });
        return [approveCall, depositCall];
    }
    deposit.calls = calls;
})(deposit || (exports.deposit = deposit = {}));
async function depositSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true, ...rest } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const recipient = parameters.recipient ?? account_.address;
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    const args = {
        ...parameters,
        recipient,
        tempoRefundRecipient,
    };
    const receipt = await (0, errors_js_2.withExecutionError)(sendTransactionSync_js_1.sendTransactionSync)(client, {
        ...rest,
        account,
        throwOnReceiptRevert,
        calls: deposit.calls(args),
    });
    return { receipt };
}
async function getEncryptionKey(client, parameters) {
    const { account, portalAddress: portalAddress_, zoneId, ...rest } = parameters;
    const portalAddress = portalAddress_ ?? Addresses.zonePortal(zoneId);
    const [keyCountResult, publicKeyResult] = await (0, multicall_js_1.multicall)(client, {
        ...rest,
        account: account ? (0, parseAccount_js_1.parseAccount)(account).address : undefined,
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
    function calls(args) {
        return [
            (0, utils_js_1.defineCall)({
                address: args.portalAddress,
                abi: Abis.zonePortal,
                functionName: 'encryptionKeyCount',
            }),
            (0, utils_js_1.defineCall)({
                address: args.portalAddress,
                abi: sequencerEncryptionKeyAbi,
                functionName: 'sequencerEncryptionKey',
            }),
        ];
    }
    getEncryptionKey.calls = calls;
})(getEncryptionKey || (exports.getEncryptionKey = getEncryptionKey = {}));
async function getPortalInfo(client, parameters) {
    const { portalAddress: portalAddress_, zoneId, ...rest } = parameters;
    const portal = (0, getContract_js_1.getContract)({
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
async function encryptedDeposit(client, parameters) {
    const chainId = client.chain?.id;
    if (!chainId)
        throw new Error('`chain` is required.');
    const { account = client.account, ...rest } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    if ('encrypted' in parameters) {
        if (parameters.chainId !== chainId) {
            throw new Error('Prepared encrypted deposit chain ID does not match client chain.');
        }
        return (0, errors_js_2.withExecutionError)(sendTransaction_js_1.sendTransaction)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
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
    return (0, errors_js_2.withExecutionError)(sendTransaction_js_1.sendTransaction)(client, {
        ...rest,
        account,
        calls: encryptedDeposit.calls(prepared),
    });
}
(function (encryptedDeposit) {
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
    function calls(args) {
        const { amount, encrypted, keyIndex, tempoRefundRecipient, token, zoneId } = args;
        const portalAddress = args.portalAddress ?? Addresses.zonePortal(zoneId);
        const tokenAddress = tempo_1.TokenId.toAddress(token);
        const encryptedPayload = {
            ephemeralPubkeyX: encrypted.ephemeralPubkeyX,
            ephemeralPubkeyYParity: encrypted.ephemeralPubkeyYParity,
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            tag: encrypted.tag,
        };
        const approveCall = (0, utils_js_1.defineCall)({
            address: tokenAddress,
            abi: Abis.tip20,
            functionName: 'approve',
            args: [portalAddress, amount],
        });
        const depositCall = (0, utils_js_1.defineCall)({
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
})(encryptedDeposit || (exports.encryptedDeposit = encryptedDeposit = {}));
async function encryptedDepositSync(client, parameters) {
    const chainId = client.chain?.id;
    if (!chainId)
        throw new Error('`chain` is required.');
    const { account = client.account, throwOnReceiptRevert = true, ...rest } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account_)
        throw new Error('`account` is required.');
    const tempoRefundRecipient = parameters.tempoRefundRecipient ?? account_.address;
    if ('encrypted' in parameters) {
        if (parameters.chainId !== chainId) {
            throw new Error('Prepared encrypted deposit chain ID does not match client chain.');
        }
        const receipt = await (0, errors_js_2.withExecutionError)(sendTransactionSync_js_1.sendTransactionSync)(client, {
            ...(0, utils_js_1.pickWriteParameters)(parameters),
            ...(0, utils_js_1.pickWriteSyncParameters)(parameters),
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
    const receipt = await (0, errors_js_2.withExecutionError)(sendTransactionSync_js_1.sendTransactionSync)(client, {
        ...rest,
        account,
        throwOnReceiptRevert,
        calls: encryptedDeposit.calls(prepared),
    });
    return { receipt };
}
async function getAuthorizationTokenInfo(client) {
    const info = await client.request({
        method: 'zone_getAuthorizationTokenInfo',
        params: [],
    });
    return {
        account: info.account,
        expiresAt: Hex.toBigInt(info.expiresAt),
    };
}
async function getWithdrawalFee(client, parameters = {}) {
    const { callbackGas = 0n, ...rest } = parameters;
    return (0, errors_js_2.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        address: Addresses.zoneOutbox,
        abi: Abis.zoneOutbox,
        functionName: 'calculateWithdrawalFee',
        args: [callbackGas],
    });
}
async function getZoneInfo(client) {
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
async function waitForTempoBlock(client, parameters) {
    const { pollingInterval = client.pollingInterval, tempoBlockNumber, timeout = 60_000, } = parameters;
    const observerId = (0, stringify_js_1.stringify)([
        'waitForTempoBlock',
        client.uid,
        tempoBlockNumber,
    ]);
    const { promise, reject, resolve } = (0, withResolvers_js_1.withResolvers)();
    let timer;
    let unobserve;
    const cleanup = () => {
        clearTimeout(timer);
        unobserve();
    };
    unobserve = (0, observe_js_1.observe)(observerId, { reject, resolve }, (emit) => {
        const unpoll = (0, poll_js_1.poll)(async () => {
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
            reject(new errors_js_1.WaitForTempoBlockTimeoutError({ tempoBlockNumber }));
        }, timeout)
        : undefined;
    return await promise.finally(cleanup);
}
async function requestWithdrawal(client, parameters) {
    const { account = client.account } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    return (0, errors_js_2.withExecutionError)(sendTransaction_js_1.sendTransaction)(client, {
        ...(0, utils_js_1.pickWriteParameters)(parameters),
        calls: requestWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
    });
}
(function (requestWithdrawal) {
    function calls(args) {
        const { amount, callbackGas = 0n, data = '0x', fallbackRecipient = args.to, memo = bytes_js_1.zeroHash, to, token, } = args;
        return [
            (0, utils_js_1.defineCall)({
                address: tempo_1.TokenId.toAddress(token),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [Addresses.zoneOutbox, amount],
            }),
            (0, utils_js_1.defineCall)({
                address: Addresses.zoneOutbox,
                abi: Abis.zoneOutbox,
                functionName: 'requestWithdrawal',
                args: [
                    tempo_1.TokenId.toAddress(token),
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
    async function prepare(client, parameters) {
        const { account = client.account, amount, callbackGas = 0n, data = '0x', fallbackRecipient, memo = bytes_js_1.zeroHash, to: to_, token, ...transactionRequest } = parameters;
        const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
        const to = to_ ?? account_?.address;
        if (!to)
            throw new Error('`to` is required.');
        const request = await (0, prepareTransactionRequest_js_1.prepareTransactionRequest)(client, {
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
})(requestWithdrawal || (exports.requestWithdrawal = requestWithdrawal = {}));
async function requestWithdrawalSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true } = parameters;
    if (!account)
        throw new Error('`account` is required.');
    const account_ = (0, parseAccount_js_1.parseAccount)(account);
    const to = parameters.to ?? account_.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    const receipt = await (0, errors_js_2.withExecutionError)(sendTransactionSync_js_1.sendTransactionSync)(client, {
        ...(0, utils_js_1.pickWriteParameters)(parameters),
        ...(0, utils_js_1.pickWriteSyncParameters)(parameters),
        calls: requestWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
        throwOnReceiptRevert,
    });
    if (receipt.status === 'pending')
        return { receipt };
    const [event] = (0, parseEventLogs_js_1.parseEventLogs)({
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
async function requestVerifiableWithdrawal(client, parameters) {
    const { account = client.account } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    return (0, errors_js_2.withExecutionError)(sendTransaction_js_1.sendTransaction)(client, {
        ...(0, utils_js_1.pickWriteParameters)(parameters),
        calls: requestVerifiableWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
    });
}
(function (requestVerifiableWithdrawal) {
    function calls(args) {
        const { amount, callbackGas = 0n, data = '0x', fallbackRecipient = args.to, memo = bytes_js_1.zeroHash, revealTo, to, token, } = args;
        return [
            (0, utils_js_1.defineCall)({
                address: tempo_1.TokenId.toAddress(token),
                abi: Abis.tip20,
                functionName: 'approve',
                args: [Addresses.zoneOutbox, amount],
            }),
            (0, utils_js_1.defineCall)({
                address: Addresses.zoneOutbox,
                abi: Abis.zoneOutbox,
                functionName: 'requestWithdrawal',
                args: [
                    tempo_1.TokenId.toAddress(token),
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
})(requestVerifiableWithdrawal || (exports.requestVerifiableWithdrawal = requestVerifiableWithdrawal = {}));
async function requestVerifiableWithdrawalSync(client, parameters) {
    const { account = client.account, throwOnReceiptRevert = true } = parameters;
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account)
        throw new Error('`account` is required.');
    const to = parameters.to ?? account_?.address;
    if (!to)
        throw new Error('`to` is required.');
    const args = { ...parameters, to };
    const receipt = await (0, errors_js_2.withExecutionError)(sendTransactionSync_js_1.sendTransactionSync)(client, {
        ...(0, utils_js_1.pickWriteParameters)(parameters),
        ...(0, utils_js_1.pickWriteSyncParameters)(parameters),
        calls: requestVerifiableWithdrawal.calls(args),
        gas: parameters.gas ?? defaultWithdrawalGas,
        throwOnReceiptRevert,
    });
    return { receipt };
}
async function signAuthorizationToken(client, parameters = {}) {
    const { account = client.account, issuedAt = Math.floor(Date.now() / 1000), expiresAt = issuedAt + 86_400, store = Store.defaultStore(), } = parameters;
    const chain = parameters.chain ?? client.chain;
    if (!chain)
        throw new Error('`signAuthorizationToken` requires a chain.');
    const zoneId = parameters.zoneId ?? tempo_1.ZoneId.fromChainId(chain.id);
    const account_ = account ? (0, parseAccount_js_1.parseAccount)(account) : undefined;
    if (!account_ || !account_.sign)
        throw new Error('`account` with `sign` is required.');
    const storeKey = `auth:${account_.address.toLowerCase()}:${chain.id}`;
    const authentication = tempo_1.ZoneRpcAuthentication.from({
        chainId: chain.id,
        expiresAt,
        issuedAt,
        zoneId,
    });
    const payload = tempo_1.ZoneRpcAuthentication.getSignPayload(authentication);
    const signature = await account_.sign({ hash: payload });
    const token = tempo_1.ZoneRpcAuthentication.serialize(authentication, {
        signature,
    });
    await store.setItem(storeKey, token);
    await store.setItem(`auth:token:${chain.id}`, token);
    return { authentication, token };
}
async function encryptDepositPayload(publicKey, recipient, sender, portalAddress, keyIndex, memo = bytes_js_1.zeroHash) {
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