"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateOperatorFee = estimateOperatorFee;
const estimateGas_js_1 = require("../../actions/public/estimateGas.js");
const readContract_js_1 = require("../../actions/public/readContract.js");
const getChainContractAddress_js_1 = require("../../utils/chain/getChainContractAddress.js");
const abis_js_1 = require("../abis.js");
const contracts_js_1 = require("../contracts.js");
async function estimateOperatorFee(client, args) {
    const { chain = client.chain, gasPriceOracleAddress: gasPriceOracleAddress_, l1BlockAddress, } = args;
    const gasPriceOracleAddress = (() => {
        if (gasPriceOracleAddress_)
            return gasPriceOracleAddress_;
        if (chain)
            return (0, getChainContractAddress_js_1.getChainContractAddress)({
                chain,
                contract: 'gasPriceOracle',
            });
        return contracts_js_1.contracts.gasPriceOracle.address;
    })();
    const gasUsed = await (0, estimateGas_js_1.estimateGas)(client, args);
    if (l1BlockAddress) {
        const [operatorFeeScalar, operatorFeeConstant, isJovian] = await Promise.all([
            (0, readContract_js_1.readContract)(client, {
                abi: abis_js_1.l1BlockAbi,
                address: l1BlockAddress,
                functionName: 'operatorFeeScalar',
            }),
            (0, readContract_js_1.readContract)(client, {
                abi: abis_js_1.l1BlockAbi,
                address: l1BlockAddress,
                functionName: 'operatorFeeConstant',
            }),
            (0, readContract_js_1.readContract)(client, {
                abi: abis_js_1.gasPriceOracleAbi,
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
    return (0, readContract_js_1.readContract)(client, {
        abi: abis_js_1.gasPriceOracleAbi,
        address: gasPriceOracleAddress,
        functionName: 'getOperatorFee',
        args: [gasUsed],
    });
}
//# sourceMappingURL=estimateOperatorFee.js.map