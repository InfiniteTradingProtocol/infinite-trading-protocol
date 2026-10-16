"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.remove = remove;
exports.write = write;
const RpcResponse = require("ox/RpcResponse");
const tempo_1 = require("ox/tempo");
const getBlockNumber_js_1 = require("../../../actions/public/getBlockNumber.js");
const base_js_1 = require("../../../errors/base.js");
const isAddressEqual_js_1 = require("../../../utils/address/isAddressEqual.js");
const Actions = require("../../actions/index.js");
const Store = require("../../Store.js");
const accounts_js_1 = require("./accounts.js");
const Plugin = require("./plugin.js");
function create(options = {}) {
    const { store = Store.memory() } = options;
    if (!store.compareAndSet)
        throw new RpcResponse.InvalidParamsError({
            message: 'Key authorization storage requires a store with atomic `compareAndSet`.',
        });
    return Plugin.keyAuthorization({
        async handleRequest(context, next) {
            const { request } = context;
            if (request.method === 'relay_saveKeyAuthorization') {
                const keyAuthorization = parse(request.params?.[0]);
                const chainId = Number(keyAuthorization.chainId);
                if (context.options.chainId !== undefined &&
                    context.options.chainId !== chainId)
                    throw new RpcResponse.InvalidParamsError({
                        message: 'Conflicting chain ids.',
                    });
                const client = context.getClient(chainId);
                const account = await check(client, keyAuthorization);
                if (!account)
                    return null;
                await read(client, store, {
                    account,
                    accessKey: keyAuthorization.address,
                    chainId,
                });
                if (!(await write(store, { account, keyAuthorization })))
                    throw new RpcResponse.InvalidParamsError({
                        message: 'A pending key authorization for this access key expires later.',
                    });
                return null;
            }
            if (request.method === 'account_approveKeyAuthorization') {
                await next();
                const operation = tempo_1.AccountOperation.fromRpc(context.result);
                if (operation.status !== 'success')
                    return;
                const keyAuthorization = tempo_1.KeyAuthorization.deserialize(operation.keyAuthorization);
                const chainId = Number(keyAuthorization.chainId);
                const client = context.getClient(chainId);
                const account = await check(client, keyAuthorization).catch((error) => {
                    if (error instanceof RpcResponse.InvalidParamsError)
                        return undefined;
                    throw error;
                });
                if (!account)
                    return;
                await read(client, store, {
                    account,
                    accessKey: keyAuthorization.address,
                    chainId,
                });
                await write(store, { account, keyAuthorization });
                return;
            }
            if (request.method !== 'eth_fillTransaction')
                return next();
            const parameters = request.params?.[0];
            const { from: account, keyId: accessKey } = parameters;
            if (parameters.keyAuthorization ||
                typeof account !== 'string' ||
                typeof accessKey !== 'string')
                return next();
            const pending = await read(context.client, store, {
                account: account,
                accessKey: accessKey,
                chainId: context.options.chainId,
            });
            if (!pending)
                return next();
            const metadata = await Actions.accessKey.getMetadata(context.client, {
                account: account,
                accessKey: accessKey,
            });
            if (isActive(metadata, accessKey)) {
                await remove(store, pending);
                return next();
            }
            const keyAuthorization = tempo_1.KeyAuthorization.toRpc(pending.keyAuthorization);
            context.request = {
                ...request,
                params: [{ ...parameters, keyAuthorization }],
            };
            return next();
        },
    });
}
function parse(value) {
    const keyAuthorization = (() => {
        try {
            if (typeof value === 'string')
                return tempo_1.KeyAuthorization.deserialize(value);
            return tempo_1.KeyAuthorization.fromRpc(value);
        }
        catch {
            return undefined;
        }
    })();
    if (!keyAuthorization?.signature)
        throw new RpcResponse.InvalidParamsError({
            message: 'Expected a signed key authorization.',
        });
    return keyAuthorization;
}
async function check(client, keyAuthorization) {
    if (isExpired(keyAuthorization))
        throw new RpcResponse.InvalidParamsError({
            message: 'Key authorization has expired.',
        });
    const account = await verify(client, keyAuthorization);
    if (await isBurned(client, { account, keyAuthorization }))
        throw new RpcResponse.InvalidParamsError({
            message: 'Key authorization witness has been burned.',
        });
    const metadata = await Actions.accessKey.getMetadata(client, {
        account,
        accessKey: keyAuthorization.address,
    });
    if (isActive(metadata, keyAuthorization.address))
        return undefined;
    return account;
}
async function verify(client, keyAuthorization) {
    const { signature, ...unsigned } = keyAuthorization;
    const payload = tempo_1.KeyAuthorization.getSignPayload(unsigned);
    if (signature.type === 'configurable') {
        if (!keyAuthorization.account ||
            !(0, isAddressEqual_js_1.isAddressEqual)(keyAuthorization.account, signature.account))
            throw new RpcResponse.InvalidParamsError({
                message: 'Configurable account key authorization account does not match its signature.',
            });
        const config = tempo_1.AccountConfig.from(signature.config);
        await (0, accounts_js_1.validateConfig)({
            account: signature.account,
            blockNumber: await (0, getBlockNumber_js_1.getBlockNumber)(client, { cacheTime: 0 }),
            client: client,
            config,
        });
        const approvals = await (0, accounts_js_1.selectApprovals)({
            account: signature.account,
            approvals: signature.signatures.map((signature) => tempo_1.SignatureEnvelope.serialize(signature)),
            config,
            hash: tempo_1.AccountConfig.getSignPayload({
                account: signature.account,
                config,
                payload,
            }),
        });
        if (approvals.weight < approvals.threshold)
            throw new RpcResponse.InvalidParamsError({
                message: 'Configurable account key authorization has not reached quorum.',
            });
        return signature.account;
    }
    const signer = (() => {
        try {
            const signer = tempo_1.SignatureEnvelope.extractAddress({ payload, signature });
            if (tempo_1.SignatureEnvelope.verify(signature, { address: signer, payload }))
                return signer;
        }
        catch { }
        throw new RpcResponse.InvalidParamsError({
            message: 'Invalid key authorization signature.',
        });
    })();
    if (keyAuthorization.account &&
        !(0, isAddressEqual_js_1.isAddressEqual)(keyAuthorization.account, signer))
        throw new RpcResponse.InvalidParamsError({
            message: 'Key authorization must be signed by its account.',
        });
    return signer;
}
async function read(client, store, options) {
    const { account } = options;
    const key = getKey(options);
    const value = await store.getItem(key);
    if (!value)
        return undefined;
    const keyAuthorization = (() => {
        try {
            return tempo_1.KeyAuthorization.deserialize(value);
        }
        catch {
            return undefined;
        }
    })();
    if (keyAuthorization &&
        !isExpired(keyAuthorization) &&
        (await isVerified(client, keyAuthorization)) &&
        !(await isBurned(client, { account, keyAuthorization })))
        return { key, keyAuthorization, value };
    await remove(store, { key, value });
    return undefined;
}
async function remove(store, options) {
    const { key, value } = options;
    await store.compareAndSet(key, value, '', { expiresAt: Date.now() });
}
async function isVerified(client, keyAuthorization) {
    try {
        await verify(client, keyAuthorization);
        return true;
    }
    catch (error) {
        if (error instanceof RpcResponse.InvalidParamsError)
            return false;
        throw error;
    }
}
async function isBurned(client, options) {
    const { account, keyAuthorization } = options;
    if (!keyAuthorization.witness)
        return false;
    return Actions.accessKey.isWitnessBurned(client, {
        account,
        witness: keyAuthorization.witness,
    });
}
async function write(store, options) {
    const { account, keyAuthorization } = options;
    const key = getKey({
        account,
        accessKey: keyAuthorization.address,
        chainId: Number(keyAuthorization.chainId),
    });
    const value = tempo_1.KeyAuthorization.serialize(keyAuthorization);
    const expiresAt = Math.min(Date.now() + maxTtl, getExpiry(keyAuthorization) * 1_000);
    for (let attempt = 0; attempt < maxWriteAttempts; attempt++) {
        const current = (await store.getItem(key)) ?? null;
        const existing = (() => {
            if (!current)
                return undefined;
            try {
                return tempo_1.KeyAuthorization.deserialize(current);
            }
            catch {
                return undefined;
            }
        })();
        if (existing && current.toLowerCase() === value.toLowerCase())
            return true;
        if (existing && getExpiry(existing) >= getExpiry(keyAuthorization))
            return false;
        if (await store.compareAndSet(key, current, value, { expiresAt }))
            return true;
    }
    throw new StoreConflictError();
}
const maxWriteAttempts = 32;
const maxTtl = 30 * 24 * 60 * 60 * 1_000;
function getExpiry(keyAuthorization) {
    const { expiry } = keyAuthorization;
    return expiry === undefined || expiry === null
        ? Number.POSITIVE_INFINITY
        : Number(expiry);
}
function isActive(metadata, accessKey) {
    return ((0, isAddressEqual_js_1.isAddressEqual)(metadata.address, accessKey) &&
        !metadata.isRevoked &&
        metadata.expiry > BigInt(Math.floor(Date.now() / 1000)));
}
function isExpired(keyAuthorization) {
    const { expiry } = keyAuthorization;
    return (expiry !== undefined &&
        expiry !== null &&
        BigInt(expiry) <= BigInt(Math.floor(Date.now() / 1000)));
}
function getKey(options) {
    const { account, accessKey, chainId } = options;
    return [
        'keyAuthorization',
        chainId,
        account.toLowerCase(),
        accessKey.toLowerCase(),
    ].join(':');
}
class StoreConflictError extends base_js_1.BaseError {
    constructor() {
        super('Pending key authorization could not be written after repeated conflicts.', { name: 'Relay.KeyAuthorization.StoreConflictError' });
    }
}
//# sourceMappingURL=keyAuthorization.js.map