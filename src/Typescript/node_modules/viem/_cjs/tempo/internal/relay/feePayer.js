"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalFeePayerUrl = void 0;
exports.create = create;
exports.sign = sign;
const ox_1 = require("ox");
const tempo_1 = require("ox/tempo");
const createClient_js_1 = require("../../../clients/createClient.js");
const http_js_1 = require("../../../clients/transports/http.js");
const Transaction = require("../../Transaction.js");
const Request = require("./request.js");
const Utils = require("./utils.js");
function create(options) {
    const authorized = new WeakMap();
    const allowedFeePayers = new Set(options.allowedFeePayers?.map((url) => ExternalFeePayerUrl.normalize(url, {
        allowUnsafe: options.internal_allowUnsafeUrls,
    })));
    return {
        async handleRequest(context, next) {
            const { request } = context;
            if (![
                'eth_fillTransaction',
                'eth_signRawTransaction',
                'eth_sendRawTransaction',
                'eth_sendRawTransactionSync',
            ].includes(request.method))
                return next();
            const { client, getClient, options: requestOptions } = context;
            const chainId = requestOptions.chainId;
            const getTokens = (id) => context.resolveTokens(id);
            const record = (details) => {
                if (details && requestOptions.response)
                    requestOptions.response.sponsorship_details = details;
            };
            if (request.method !== 'eth_fillTransaction') {
                if (!options.account) {
                    if (request.method === 'eth_signRawTransaction')
                        throw new ox_1.RpcResponse.MethodNotFoundError({
                            message: 'eth_signRawTransaction requires a fee payer to be configured on the relay. Add `Relay.feePayer({ account })` to enable transaction sponsorship.',
                        });
                    return next();
                }
                const serialized = request.params?.[0];
                if (typeof serialized !== 'string' ||
                    !requestsRawSponsorship(serialized))
                    return next();
                const result = await handleRawTransaction({
                    ...options,
                    account: options.account,
                    getClient,
                    getFeeToken: async (id) => (await getTokens(id))[0],
                    method: request.method,
                    request,
                });
                record(result.sponsorshipDetails);
                return result.result;
            }
            const parameters = request.params[0];
            const { feePayer: _, ...normalized } = Utils.normalizeFillTransactionRequest(parameters);
            const external = typeof parameters.feePayer === 'string'
                ? ExternalFeePayerUrl.normalize(parameters.feePayer, {
                    allowUnsafe: options.internal_allowUnsafeUrls ?? false,
                })
                : undefined;
            if (external && !allowedFeePayers.has(external))
                throw new ox_1.RpcResponse.InvalidParamsError({
                    message: 'External fee payer URL is not allowed.',
                });
            const wantsSponsorship = (!!options.account || !!external) && parameters.feePayer !== false;
            if (options.account && !external)
                delete normalized.feePayerSignature;
            const base = { ...normalized, chainId };
            if (!wantsSponsorship)
                return Request.fill(client, base);
            const token = options.feeToken ??
                parameters.feeToken ??
                (!options.validate || external
                    ? (await getTokens(chainId))[0]
                    : undefined);
            const transaction = {
                ...base,
                feePayer: true,
                ...(token ? { feeToken: token } : {}),
            };
            const prepared = isPreparedTransaction(transaction);
            const fillClient = external
                ? (0, createClient_js_1.createClient)({
                    chain: client.chain,
                    transport: (0, http_js_1.http)(external, {
                        fetchOptions: { redirect: 'error' },
                        retryCount: 0,
                    }),
                })
                : client;
            const result = prepared && !external
                ? { tx: transaction }
                : await Request.fill(fillClient, transaction, external ? { ...requestOptions, retryCount: 0 } : requestOptions);
            const filled = Utils.normalizeTempoTransaction(result.tx);
            if ((!prepared || parameters.feePayer !== true) &&
                filled.gas &&
                !filled.feePayerSignature)
                filled.gas += 20000n;
            if (token && (!external || filled.feeToken == null))
                Object.assign(filled, { feeToken: token });
            const sponsored = external ||
                !options.validate ||
                (await shouldSponsor({
                    sender: parameters.from,
                    transaction: filled,
                    validate: options.validate,
                }));
            if (!sponsored)
                return Request.fill(client, { ...base, feePayer: false });
            const defer = typeof normalized.multisigSimulation === 'object' &&
                normalized.multisigSimulation !== null;
            const sponsor = sponsored
                ? external
                    ? (result.capabilities?.sponsor ?? result.sponsor)
                    : options.account
                        ? getSponsor({ ...options, account: options.account })
                        : undefined
                : undefined;
            if (options.account && !external && !defer) {
                delete filled.signature;
                if (!filled.from)
                    filled.from = parameters.from;
                authorized.set(context, tempo_1.TxEnvelopeTempo.getFeePayerSignPayload(tempo_1.TxEnvelopeTempo.from(filled), { sender: filled.from }));
            }
            return {
                ...result,
                ...(sponsor ? { sponsor } : {}),
                tx: Utils.formatTempoTransaction(filled),
                capabilities: {
                    ...result.capabilities,
                    sponsored: external
                        ? (result.capabilities?.sponsored ?? !!sponsor)
                        : !!sponsor,
                    ...(sponsor ? { sponsor } : {}),
                },
            };
        },
        async signTransaction(result, context) {
            const approved = authorized.get(context);
            authorized.delete(context);
            const parameters = context.request.params[0];
            if (!approved ||
                !options.account ||
                typeof parameters.feePayer === 'string' ||
                parameters.feePayer === false ||
                !result.capabilities?.sponsored ||
                (typeof parameters.multisigSimulation === 'object' &&
                    parameters.multisigSimulation !== null))
                return undefined;
            const transaction = Utils.normalizeTempoTransaction(result.tx);
            const payload = tempo_1.TxEnvelopeTempo.getFeePayerSignPayload(tempo_1.TxEnvelopeTempo.from(transaction), { sender: (transaction.from ?? parameters.from) });
            if (payload !== approved)
                throw new ox_1.RpcResponse.InvalidParamsError({
                    message: 'Sponsored transaction changed after validation.',
                });
            const signed = await sign({
                account: options.account,
                onSponsored: options.onSponsored,
                sender: parameters.from,
                transaction,
                signal: context.options.signal,
            });
            if (signed.sponsorshipDetails && context.options.response)
                context.options.response.sponsorship_details = signed.sponsorshipDetails;
            const tx = Utils.formatTempoTransaction(signed.transaction);
            return tx.feePayerSignature;
        },
    };
}
const refusalMessages = {
    billing_past_due: 'Billing past due.',
    billing_required: 'Billing required.',
    fee_token_unsupported: 'Fee token unsupported.',
    spend_limit_exceeded: 'Spend limit exceeded.',
    tx_fee_limit_exceeded: 'Transaction fee limit exceeded.',
};
function getSponsor(options) {
    const { account, name, url } = options;
    return {
        address: account.address,
        ...(name ? { name } : {}),
        ...(url ? { url } : {}),
    };
}
async function shouldSponsor(options) {
    const { sender, transaction, validate } = options;
    if (!validate)
        return true;
    const verdict = await validate({
        ...transaction,
        from: sender,
    });
    return verdict === true;
}
function requestsRawSponsorship(serialized) {
    if (!Utils.isSerializedTempoTransaction(serialized))
        return false;
    const transaction = Transaction.deserialize(serialized);
    return ('feePayerSignature' in transaction && transaction.feePayerSignature === null);
}
function isPreparedTransaction(value) {
    return (typeof value.from === 'string' &&
        typeof Utils.resolveChainId(value.chainId) === 'number' &&
        typeof value.gas !== 'undefined' &&
        typeof value.nonce !== 'undefined' &&
        (typeof value.maxFeePerGas !== 'undefined' ||
            typeof value.gasPrice !== 'undefined'));
}
async function sign(options) {
    const { account, transaction, sender } = options;
    const from = transaction.from ?? sender;
    const { signature: _, ...withoutSenderSig } = transaction;
    const prepared = { ...withoutSenderSig, from };
    if (!prepared.from)
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Transaction sender must be provided before fee payer signing.',
        });
    if (!account.sign)
        throw new Error('Fee payer account cannot sign transactions.');
    const chainId = Utils.resolveChainId(transaction.chainId);
    if (chainId === undefined)
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Transaction chainId must be provided before fee payer signing.',
        });
    const envelope = tempo_1.TxEnvelopeTempo.from(prepared);
    const signPayload = tempo_1.TxEnvelopeTempo.getFeePayerSignPayload(envelope, {
        sender: prepared.from,
    });
    options.signal?.throwIfAborted();
    const feePayerSignature = ox_1.Signature.from(await account.sign({ hash: signPayload }));
    options.signal?.throwIfAborted();
    const feeToken = transaction.feeToken;
    const sponsorshipDetails = await options.onSponsored?.({
        chainId,
        ...(feeToken ? { feeToken } : {}),
        method: 'eth_fillTransaction',
        sender: prepared.from,
        signPayload,
        transaction: tempo_1.TxEnvelopeTempo.serialize(envelope, { feePayerSignature }),
    });
    return {
        ...(sponsorshipDetails ? { sponsorshipDetails } : {}),
        transaction: { ...prepared, feePayerSignature },
    };
}
async function handleRawTransaction(options) {
    const { account, feeToken: sponsorFeeToken, getClient, method, request, validate, } = options;
    const serialized = request.params?.[0];
    if (!Utils.isSerializedTempoTransaction(serialized))
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Only Tempo (0x76/0x78) transactions are supported.',
        });
    const transaction = Transaction.deserialize(serialized);
    const sender = transaction.from ?? options.sender;
    if (!transaction.signature || !sender)
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Transaction must be signed by the sender before fee payer signing.',
        });
    if (!account.sign)
        throw new Error('Fee payer account cannot sign transactions.');
    const client = getClient(transaction.chainId);
    const feeToken_chain = client.chain?.feeToken;
    const feeToken = transaction.feeToken ??
        sponsorFeeToken ??
        (await options.getFeeToken?.(transaction.chainId)) ??
        feeToken_chain;
    const transaction_sponsored = feeToken
        ? { ...transaction, feeToken }
        : transaction;
    if (validate) {
        const verdict = await validate(transaction_sponsored);
        if (verdict !== true)
            throw new ox_1.RpcResponse.InvalidParamsError(verdict === false
                ? { message: 'Sponsorship rejected.' }
                : { data: { code: verdict }, message: refusalMessages[verdict] });
    }
    const envelope = tempo_1.TxEnvelopeTempo.from(transaction_sponsored);
    const signPayload = tempo_1.TxEnvelopeTempo.getFeePayerSignPayload(envelope, {
        sender,
    });
    const feePayerSignature = ox_1.Signature.from(await account.sign({ hash: signPayload }));
    const serializedTransaction = tempo_1.TxEnvelopeTempo.serialize(envelope, {
        feePayerSignature,
        signature: transaction.signature,
    });
    const sponsorshipDetails = await options.onSponsored?.({
        chainId: transaction.chainId,
        ...(feeToken ? { feeToken } : {}),
        method,
        sender,
        signPayload,
        transaction: serializedTransaction,
        transactionHash: ox_1.Hash.keccak256(serializedTransaction),
    });
    const result = method === 'eth_signRawTransaction'
        ? serializedTransaction
        : await client.request({
            method: method,
            params: [
                serializedTransaction,
                ...(request.params?.slice(1) ?? []),
            ],
        });
    return { result, ...(sponsorshipDetails ? { sponsorshipDetails } : {}) };
}
var ExternalFeePayerUrl;
(function (ExternalFeePayerUrl) {
    function normalize(value, options = {}) {
        let url;
        try {
            url = new URL(value);
        }
        catch {
            throw new ox_1.RpcResponse.InvalidParamsError({
                message: 'Invalid fee payer URL.',
            });
        }
        const allowUnsafe = options.allowUnsafe === true;
        if (url.protocol !== 'http:' && url.protocol !== 'https:')
            throw new ox_1.RpcResponse.InvalidParamsError({
                message: 'Invalid fee payer URL protocol.',
            });
        if (!allowUnsafe && url.protocol !== 'https:')
            throw new ox_1.RpcResponse.InvalidParamsError({
                message: 'Invalid fee payer URL protocol.',
            });
        if (!allowUnsafe && isUnsafeHostname(url.hostname))
            throw new ox_1.RpcResponse.InvalidParamsError({
                message: 'Invalid fee payer URL host.',
            });
        url.username = '';
        url.password = '';
        url.hash = '';
        return url.href;
    }
    ExternalFeePayerUrl.normalize = normalize;
    function isUnsafeHostname(hostname) {
        const host = normalizeHostname(hostname);
        if (host === 'localhost' || host.endsWith('.localhost'))
            return true;
        const ipv4 = parseIpv4(host);
        if (ipv4)
            return isUnsafeIpv4(ipv4);
        if (!host.includes(':'))
            return false;
        const ipv6 = parseIpv6(host);
        if (!ipv6)
            return true;
        return isUnsafeIpv6(ipv6);
    }
    function normalizeHostname(hostname) {
        return hostname
            .toLowerCase()
            .replace(/^\[|\]$/g, '')
            .split('%')[0];
    }
    function parseIpv4(value) {
        const parts = value.split('.');
        if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part)))
            return undefined;
        const numbers = parts.map((part) => Number(part));
        if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
            return undefined;
        return numbers;
    }
    function isUnsafeIpv4(parts) {
        const [a, b] = parts;
        if (a === 0 || a === 10 || a === 127)
            return true;
        if (a === 100 && b >= 64 && b <= 127)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        if (a === 192 && b === 168)
            return true;
        return a >= 224;
    }
    function parseIpv6(value) {
        const halves = value.split('::');
        if (halves.length > 2)
            return undefined;
        const left = halves[0] ? halves[0].split(':') : [];
        const right = halves[1] ? halves[1].split(':') : [];
        const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
        if (missing < 0)
            return undefined;
        const parts = [...left, ...Array(missing).fill('0'), ...right];
        if (parts.length !== 8)
            return undefined;
        const numbers = parts.map((part) => /^[\da-f]{1,4}$/i.test(part) ? Number.parseInt(part, 16) : NaN);
        if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff))
            return undefined;
        return numbers;
    }
    function isUnsafeIpv6(parts) {
        const [a] = parts;
        if (parts.every((part) => part === 0))
            return true;
        if (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1)
            return true;
        if ((a & 0xfe00) === 0xfc00)
            return true;
        if ((a & 0xffc0) === 0xfe80)
            return true;
        if ((a & 0xffc0) === 0xfec0)
            return true;
        if ((a & 0xff00) === 0xff00)
            return true;
        const ipv4 = ipv4FromIpv6(parts);
        return ipv4 ? isUnsafeIpv4(ipv4) : false;
    }
    function ipv4FromIpv6(parts) {
        const mapped = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
        const compatible = parts.slice(0, 6).every((part) => part === 0);
        if (!mapped && !compatible)
            return undefined;
        return [parts[6] >> 8, parts[6] & 0xff, parts[7] >> 8, parts[7] & 0xff];
    }
})(ExternalFeePayerUrl || (exports.ExternalFeePayerUrl = ExternalFeePayerUrl = {}));
//# sourceMappingURL=feePayer.js.map