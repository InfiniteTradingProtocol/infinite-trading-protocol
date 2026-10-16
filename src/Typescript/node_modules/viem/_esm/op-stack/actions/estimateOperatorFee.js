import { estimateGas, } from '../../actions/public/estimateGas.js';
import { readContract, } from '../../actions/public/readContract.js';
import { getChainContractAddress } from '../../utils/chain/getChainContractAddress.js';
import { gasPriceOracleAbi, l1BlockAbi } from '../abis.js';
import { contracts } from '../contracts.js';
/**
 * Estimates the operator fee required to execute an L2 transaction.
 *
 * Operator fees are part of the Isthmus upgrade and allow OP Stack operators
 * to recover costs related to Alt-DA, ZK proving, or custom gas tokens.
 *
 * @param client - Client to use
 * @param parameters - {@link EstimateOperatorFeeParameters}
 * @returns The operator fee (in wei). {@link EstimateOperatorFeeReturnType}
 *
 * @example
 * import { createPublicClient, http, parseEther } from 'viem'
 * import { optimism } from 'viem/chains'
 * import { estimateOperatorFee } from 'viem/chains/optimism'
 *
 * const client = createPublicClient({
 *   chain: optimism,
 *   transport: http(),
 * })
 * const operatorFee = await estimateOperatorFee(client, {
 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
 *   value: parseEther('1'),
 * })
 */
export async function estimateOperatorFee(client, args) {
    const { chain = client.chain, gasPriceOracleAddress: gasPriceOracleAddress_, l1BlockAddress, } = args;
    const gasPriceOracleAddress = (() => {
        if (gasPriceOracleAddress_)
            return gasPriceOracleAddress_;
        if (chain)
            return getChainContractAddress({
                chain,
                contract: 'gasPriceOracle',
            });
        return contracts.gasPriceOracle.address;
    })();
    const gasUsed = await estimateGas(client, args);
    if (l1BlockAddress) {
        // `isJovian` is unavailable on Isthmus Gas Price Oracle implementations.
        const [operatorFeeScalar, operatorFeeConstant, isJovian] = await Promise.all([
            readContract(client, {
                abi: l1BlockAbi,
                address: l1BlockAddress,
                functionName: 'operatorFeeScalar',
            }),
            readContract(client, {
                abi: l1BlockAbi,
                address: l1BlockAddress,
                functionName: 'operatorFeeConstant',
            }),
            readContract(client, {
                abi: gasPriceOracleAbi,
                address: gasPriceOracleAddress,
                functionName: 'isJovian',
            }).catch(() => false),
        ]);
        const scalar = BigInt(operatorFeeScalar);
        const constant = BigInt(operatorFeeConstant);
        if (isJovian)
            return gasUsed * scalar * 100n + constant;
        return (gasUsed * scalar) / 1000000n + constant;
    }
    return readContract(client, {
        abi: gasPriceOracleAbi,
        address: gasPriceOracleAddress,
        functionName: 'getOperatorFee',
        args: [gasUsed],
    });
}
//# sourceMappingURL=estimateOperatorFee.js.map