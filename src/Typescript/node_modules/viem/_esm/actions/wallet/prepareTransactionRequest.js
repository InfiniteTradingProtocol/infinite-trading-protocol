import { parseAccount, } from '../../accounts/utils/parseAccount.js';
import { internal_estimateFeesPerGas, } from '../../actions/public/estimateFeesPerGas.js';
import { estimateGas, } from '../../actions/public/estimateGas.js';
import { getBlock as getBlock_, } from '../../actions/public/getBlock.js';
import { getTransactionCount, } from '../../actions/public/getTransactionCount.js';
import { Eip1559FeesNotSupportedError, MaxFeePerGasTooLowError, } from '../../errors/fee.js';
import { FeePayerNonceMismatchError } from '../../errors/transaction.js';
import { blobsToCommitments } from '../../utils/blob/blobsToCommitments.js';
import { blobsToProofs } from '../../utils/blob/blobsToProofs.js';
import { commitmentsToVersionedHashes } from '../../utils/blob/commitmentsToVersionedHashes.js';
import { toBlobSidecars } from '../../utils/blob/toBlobSidecars.js';
import { getAction } from '../../utils/getAction.js';
import { LruMap } from '../../utils/lru.js';
import { assertRequest, } from '../../utils/transaction/assertRequest.js';
import { getTransactionType, } from '../../utils/transaction/getTransactionType.js';
import { fillTransaction, } from '../public/fillTransaction.js';
import { getChainId as getChainId_ } from '../public/getChainId.js';
export const defaultParameters = [
    'blobVersionedHashes',
    'chainId',
    'fees',
    'gas',
    'nonce',
    'type',
];
/** @internal */
export const eip1559NetworkCache = /*#__PURE__*/ new Map();
/** @internal */
export const supportsFillTransaction = /*#__PURE__*/ new LruMap(128);
/**
 * Prepares a transaction request for signing.
 *
 * - Docs: https://viem.sh/docs/actions/wallet/prepareTransactionRequest
 *
 * @param args - {@link PrepareTransactionRequestParameters}
 * @returns The transaction request. {@link PrepareTransactionRequestReturnType}
 *
 * @example
 * import { createWalletClient, custom } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { prepareTransactionRequest } from 'viem/actions'
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 * })
 * const request = await prepareTransactionRequest(client, {
 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: 1n,
 * })
 *
 * @example
 * // Account Hoisting
 * import { createWalletClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { mainnet } from 'viem/chains'
 * import { prepareTransactionRequest } from 'viem/actions'
 *
 * const client = createWalletClient({
 *   account: privateKeyToAccount('0x…'),
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 * })
 * const request = await prepareTransactionRequest(client, {
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: 1n,
 * })
 */
export async function prepareTransactionRequest(client, args) {
    let request = args;
    request.account ??= client.account;
    request.parameters ??= defaultParameters;
    const { account: account_, chain = client.chain, nonceManager, parameters, } = request;
    const prepareTransactionRequest = (() => {
        if (typeof chain?.prepareTransactionRequest === 'function')
            return {
                fn: chain.prepareTransactionRequest,
                runAt: ['beforeFillTransaction'],
            };
        if (Array.isArray(chain?.prepareTransactionRequest))
            return {
                fn: chain.prepareTransactionRequest[0],
                runAt: chain.prepareTransactionRequest[1].runAt,
            };
        return undefined;
    })();
    let chainId;
    async function getChainId() {
        if (chainId)
            return chainId;
        if (typeof request.chainId !== 'undefined')
            return request.chainId;
        if (chain)
            return chain.id;
        const chainId_ = await getAction(client, getChainId_, 'getChainId')({});
        chainId = chainId_;
        return chainId;
    }
    let account = account_ ? parseAccount(account_) : account_;
    let nonce = request.nonce;
    if (prepareTransactionRequest?.fn &&
        prepareTransactionRequest.runAt?.includes('beforeFillTransaction')) {
        request = await prepareTransactionRequest.fn({ ...request, chain }, {
            client,
            phase: 'beforeFillTransaction',
        });
        nonce ??= request.nonce;
        const sender = request.account ?? request.from;
        account = sender ? parseAccount(sender) : undefined;
    }
    if (parameters.includes('nonce') &&
        typeof nonce === 'undefined' &&
        account &&
        nonceManager) {
        const chainId = await getChainId();
        nonce = await nonceManager.consume({
            address: account.address,
            chainId,
            client,
        });
    }
    const attemptFill = (() => {
        // Do not attempt if blobs are provided.
        if ((parameters.includes('blobVersionedHashes') ||
            parameters.includes('sidecars')) &&
            request.kzg &&
            request.blobs)
            return false;
        // Always attempt if the caller explicitly requested a non-empty set of
        // `parameters` and a fee payer signature is being requested (e.g. Tempo
        // sponsorship via `feePayer: true`/`Account`) and has not already been
        // filled. The fee payer signature can only be obtained as a side effect
        // of `eth_fillTransaction` (the relay co-signs the returned transaction),
        // so it must be called even when nonce/gas/fees are already fully
        // populated, or when the caller's `parameters` option omits `'fees'`/
        // `'gas'` entirely — otherwise the transaction silently ends up without
        // a fee payer signature. This check intentionally runs before the
        // `shouldAttempt` gate below, since fee-payer sponsorship is independent
        // of which parameters the caller opted into filling.
        //
        // The `parameters.length > 0` guard excludes internal micro-prepare calls
        // that explicitly pass an empty `parameters` array (e.g. `estimateGas`'s
        // internal `prepareTransactionRequest` call for local accounts) — those
        // are deliberately scoped to fill nothing, and should not independently
        // re-attempt `eth_fillTransaction` for fee-payer sponsorship.
        if (parameters.length > 0 &&
            'feePayer' in request &&
            request.feePayer &&
            !('feePayerSignature' in request && request.feePayerSignature))
            return true;
        // Sponsorship can route fill requests to a different endpoint, so it must
        // bypass support state cached from a non-sponsored request.
        if (supportsFillTransaction.get(client.uid) === false)
            return false;
        // Should attempt `eth_fillTransaction` if "fees" or "gas" are required to be populated,
        // otherwise, can just use the other individual calls.
        const shouldAttempt = ['fees', 'gas'].some((parameter) => parameters.includes(parameter));
        if (!shouldAttempt)
            return false;
        // Check if `eth_fillTransaction` needs to be called.
        if (parameters.includes('chainId') && typeof request.chainId !== 'number')
            return true;
        if (parameters.includes('nonce') && typeof nonce !== 'number')
            return true;
        if (parameters.includes('fees') &&
            typeof request.gasPrice !== 'bigint' &&
            (typeof request.maxFeePerGas !== 'bigint' ||
                typeof request.maxPriorityFeePerGas !== 'bigint'))
            return true;
        if (parameters.includes('gas') && typeof request.gas !== 'bigint')
            return true;
        return false;
    })();
    const fillResult = attemptFill
        ? await getAction(client, fillTransaction, 'fillTransaction')({ ...request, nonce })
            .then((result) => {
            const { chainId, from, gas, gasPrice, nonce, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, type, ...rest } = result.transaction;
            const feeToken = 'feeToken' in rest ? rest.feeToken : undefined;
            const hasFilledFeePayerSignature = 'feePayerSignature' in rest &&
                rest.feePayerSignature !== null &&
                typeof rest.feePayerSignature !== 'undefined';
            const shouldUseFilledFeeToken = typeof feeToken !== 'undefined' &&
                feeToken !== null &&
                (!('feeToken' in request) || hasFilledFeePayerSignature);
            supportsFillTransaction.set(client.uid, true);
            return {
                ...request,
                ...(from ? { from } : {}),
                ...(type && !request.type ? { type } : {}),
                ...(typeof chainId !== 'undefined' ? { chainId } : {}),
                ...(typeof gas !== 'undefined' ? { gas } : {}),
                ...(typeof gasPrice !== 'undefined' ? { gasPrice } : {}),
                ...(typeof nonce !== 'undefined' ? { nonce } : {}),
                ...(typeof maxFeePerBlobGas !== 'undefined' &&
                    request.type !== 'legacy' &&
                    request.type !== 'eip2930'
                    ? { maxFeePerBlobGas }
                    : {}),
                ...(typeof maxFeePerGas !== 'undefined' &&
                    request.type !== 'legacy' &&
                    request.type !== 'eip2930'
                    ? { maxFeePerGas }
                    : {}),
                ...(typeof maxPriorityFeePerGas !== 'undefined' &&
                    request.type !== 'legacy' &&
                    request.type !== 'eip2930'
                    ? { maxPriorityFeePerGas }
                    : {}),
                ...('nonceKey' in rest && typeof rest.nonceKey !== 'undefined'
                    ? { nonceKey: rest.nonceKey }
                    : {}),
                // Validity bounds are part of the fee-payer signing payload.
                ...('validBefore' in rest &&
                    rest.validBefore !== null &&
                    typeof rest.validBefore !== 'undefined'
                    ? { validBefore: rest.validBefore }
                    : {}),
                ...('validAfter' in rest &&
                    rest.validAfter !== null &&
                    typeof rest.validAfter !== 'undefined'
                    ? { validAfter: rest.validAfter }
                    : {}),
                ...('keyAuthorization' in rest &&
                    typeof rest.keyAuthorization !== 'undefined' &&
                    rest.keyAuthorization !== null &&
                    !('keyAuthorization' in request)
                    ? { keyAuthorization: rest.keyAuthorization }
                    : {}),
                ...('feePayerSignature' in rest &&
                    typeof rest.feePayerSignature !== 'undefined' &&
                    rest.feePayerSignature !== null
                    ? { feePayerSignature: rest.feePayerSignature }
                    : {}),
                ...(shouldUseFilledFeeToken ? { feeToken } : {}),
                ...(result.capabilities
                    ? { _capabilities: result.capabilities }
                    : {}),
            };
        })
            .catch((e) => {
            const error = e;
            if (error.name !== 'TransactionExecutionError')
                return request;
            const nonceMismatch = error.walk?.((error) => error instanceof FeePayerNonceMismatchError);
            if (nonceMismatch)
                throw e;
            const executionReverted = error.walk?.((e) => {
                const error = e;
                return error.name === 'ExecutionRevertedError';
            });
            if (executionReverted)
                throw e;
            const unsupported = error.walk?.((e) => {
                const error = e;
                return (error.name === 'MethodNotFoundRpcError' ||
                    error.name === 'MethodNotSupportedRpcError' ||
                    error.message?.includes('eth_fillTransaction is not available'));
            });
            if (unsupported)
                supportsFillTransaction.set(client.uid, false);
            return request;
        })
        : request;
    nonce ??= fillResult.nonce;
    request = {
        ...fillResult,
        ...(account ? { from: account?.address } : {}),
        ...(typeof nonce !== 'undefined' ? { nonce } : {}),
    };
    const { blobs, gas, kzg, type } = request;
    if (prepareTransactionRequest?.fn &&
        prepareTransactionRequest.runAt?.includes('beforeFillParameters')) {
        request = await prepareTransactionRequest.fn({ ...request, chain }, {
            client,
            phase: 'beforeFillParameters',
        });
    }
    let block;
    async function getBlock() {
        if (block)
            return block;
        block = await getAction(client, getBlock_, 'getBlock')({ blockTag: 'latest' });
        return block;
    }
    if (parameters.includes('nonce') &&
        typeof nonce === 'undefined' &&
        account &&
        !nonceManager)
        request.nonce = await getAction(client, getTransactionCount, 'getTransactionCount')({
            address: account.address,
            blockTag: 'pending',
        });
    if ((parameters.includes('blobVersionedHashes') ||
        parameters.includes('sidecars')) &&
        blobs &&
        kzg) {
        const commitments = blobsToCommitments({ blobs, kzg });
        if (parameters.includes('blobVersionedHashes')) {
            const versionedHashes = commitmentsToVersionedHashes({
                commitments,
                to: 'hex',
            });
            request.blobVersionedHashes = versionedHashes;
        }
        if (parameters.includes('sidecars')) {
            const proofs = blobsToProofs({ blobs, commitments, kzg });
            const sidecars = toBlobSidecars({
                blobs,
                commitments,
                proofs,
                to: 'hex',
            });
            request.sidecars = sidecars;
        }
    }
    if (parameters.includes('chainId'))
        request.chainId = await getChainId();
    if ((parameters.includes('fees') || parameters.includes('type')) &&
        typeof type === 'undefined') {
        try {
            request.type = getTransactionType(request);
        }
        catch {
            let isEip1559Network = eip1559NetworkCache.get(client.uid);
            if (typeof isEip1559Network === 'undefined') {
                const block = await getBlock();
                isEip1559Network = typeof block?.baseFeePerGas === 'bigint';
                eip1559NetworkCache.set(client.uid, isEip1559Network);
            }
            request.type = isEip1559Network ? 'eip1559' : 'legacy';
        }
    }
    if (parameters.includes('fees')) {
        // TODO(4844): derive blob base fees once https://github.com/ethereum/execution-apis/pull/486 is merged.
        if (request.type !== 'legacy' && request.type !== 'eip2930') {
            // EIP-1559 fees
            if (typeof request.maxFeePerGas === 'undefined' ||
                typeof request.maxPriorityFeePerGas === 'undefined') {
                const block = await getBlock();
                const { maxFeePerGas, maxPriorityFeePerGas } = await internal_estimateFeesPerGas(client, {
                    block: block,
                    chain,
                    request: request,
                });
                if (typeof request.maxPriorityFeePerGas === 'undefined' &&
                    request.maxFeePerGas &&
                    request.maxFeePerGas < maxPriorityFeePerGas)
                    throw new MaxFeePerGasTooLowError({
                        maxPriorityFeePerGas,
                    });
                request.maxPriorityFeePerGas = maxPriorityFeePerGas;
                request.maxFeePerGas = maxFeePerGas;
            }
        }
        else {
            // Legacy fees
            if (typeof request.maxFeePerGas !== 'undefined' ||
                typeof request.maxPriorityFeePerGas !== 'undefined')
                throw new Eip1559FeesNotSupportedError();
            if (typeof request.gasPrice === 'undefined') {
                const block = await getBlock();
                const { gasPrice: gasPrice_ } = await internal_estimateFeesPerGas(client, {
                    block: block,
                    chain,
                    request: request,
                    type: 'legacy',
                });
                request.gasPrice = gasPrice_;
            }
        }
    }
    if (parameters.includes('gas') && typeof gas === 'undefined')
        request.gas = await getAction(client, estimateGas, 'estimateGas')({
            ...request,
            account,
            prepare: account?.type === 'local' ? [] : ['blobVersionedHashes'],
        });
    if (prepareTransactionRequest?.fn &&
        prepareTransactionRequest.runAt?.includes('afterFillParameters'))
        request = await prepareTransactionRequest.fn({ ...request, chain }, {
            client,
            phase: 'afterFillParameters',
        });
    assertRequest(request);
    delete request.parameters;
    return request;
}
//# sourceMappingURL=prepareTransactionRequest.js.map