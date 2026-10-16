import { getAction } from '../../../utils/getAction.js';
import { observe } from '../../../utils/observe.js';
import { poll } from '../../../utils/poll.js';
import { stringify } from '../../../utils/stringify.js';
import { WaitForUserOperationReceiptTimeoutError, } from '../../errors/userOperation.js';
import { getUserOperationReceipt, } from './getUserOperationReceipt.js';
/**
 * Waits for the User Operation to be included on a [Block](https://viem.sh/docs/glossary/terms#block) (one confirmation), and then returns the User Operation receipt.
 *
 * - Docs: https://viem.sh/docs/actions/bundler/waitForUserOperationReceipt
 *
 * @param client - Client to use
 * @param parameters - {@link WaitForUserOperationReceiptParameters}
 * @returns The receipt. {@link WaitForUserOperationReceiptReturnType}
 *
 * @example
 * import { createBundlerClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { waitForUserOperationReceipt } from 'viem/actions'
 *
 * const client = createBundlerClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 *
 * const receipt = await waitForUserOperationReceipt(client, {
 *   hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
 * })
 */
export function waitForUserOperationReceipt(client, parameters) {
    const { hash, pollingInterval = client.pollingInterval, retryCount, timeout = 120_000, } = parameters;
    let count = 0;
    const observerId = stringify([
        'waitForUserOperationReceipt',
        client.uid,
        hash,
    ]);
    let unobserve;
    const promise = new Promise((resolve, reject) => {
        unobserve = observe(observerId, { resolve, reject }, (emit) => {
            const done = (fn) => {
                unpoll();
                fn();
                unobserve();
            };
            const timeoutId = timeout
                ? setTimeout(() => done(() => emit.reject(new WaitForUserOperationReceiptTimeoutError({ hash }))), timeout)
                : undefined;
            const unpoll = poll(async () => {
                if (retryCount && count >= retryCount) {
                    clearTimeout(timeoutId);
                    done(() => emit.reject(new WaitForUserOperationReceiptTimeoutError({ hash })));
                }
                try {
                    const receipt = await getAction(client, getUserOperationReceipt, 'getUserOperationReceipt')({ hash });
                    clearTimeout(timeoutId);
                    done(() => emit.resolve(receipt));
                }
                catch (err) {
                    const error = err;
                    if (error.name !== 'UserOperationReceiptNotFoundError') {
                        clearTimeout(timeoutId);
                        done(() => emit.reject(error));
                    }
                }
                count++;
            }, {
                emitOnBegin: true,
                interval: pollingInterval,
            });
            return unpoll;
        });
    });
    // Remove this caller's listener once its promise settles. `done` only
    // unobserves the caller that started the poll, so a listener from a
    // concurrent caller would otherwise stay cached and block every later
    // wait for the same hash from polling.
    return promise.finally(() => unobserve());
}
//# sourceMappingURL=waitForUserOperationReceipt.js.map