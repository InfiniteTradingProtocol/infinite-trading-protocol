"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVirtualAddresses = resolveVirtualAddresses;
exports.getVirtualAddressTargets = getVirtualAddressTargets;
exports.extractCalls = extractCalls;
const ox_1 = require("ox");
const VirtualAddress = require("ox/tempo/VirtualAddress");
const decodeFunctionData_js_1 = require("../../../utils/abi/decodeFunctionData.js");
const isAddress_js_1 = require("../../../utils/address/isAddress.js");
const Abis = require("../../Abis.js");
const Preflight = require("./preflight.js");
async function resolveVirtualAddresses(client, options) {
    const targets = getVirtualAddressTargets(options.calls);
    if (targets.length === 0)
        return undefined;
    const result = await Preflight.read(client, { targets });
    return result.virtualAddresses;
}
function getVirtualAddressTargets(calls) {
    const targets = new Set();
    for (const call of calls) {
        for (const address of [call.to, decodeTransferRecipient(call.data)]) {
            if (!address || !(0, isAddress_js_1.isAddress)(address) || !VirtualAddress.isVirtual(address))
                continue;
            targets.add(address.toLowerCase());
            if (targets.size > 100)
                throw new ox_1.RpcResponse.InvalidParamsError({
                    message: 'Virtual-address targets exceed the limit of 100 addresses.',
                });
        }
    }
    return [...targets];
}
function decodeTransferRecipient(data) {
    if (!data)
        return undefined;
    const selector = data.slice(0, 10).toLowerCase();
    if (!transferSelectors.has(selector))
        return undefined;
    try {
        const { args, functionName } = (0, decodeFunctionData_js_1.decodeFunctionData)({
            abi: Abis.tip20,
            data: data,
        });
        if ((functionName === 'transfer' || functionName === 'transferWithMemo') &&
            typeof args[0] === 'string')
            return args[0];
        if ((functionName === 'transferFrom' ||
            functionName === 'transferFromWithMemo') &&
            typeof args[1] === 'string')
            return args[1];
    }
    catch { }
    return undefined;
}
const transferSelectors = new Set([
    '0xa9059cbb',
    '0x95777d59',
    '0x23b872dd',
    '0x929c2539',
]);
function extractCalls(transaction) {
    const calls = transaction.calls;
    if (calls && calls.length > 0)
        return calls.map((c) => ({
            ...(c.to ? { to: c.to } : {}),
            ...(c.data ? { data: c.data } : {}),
            ...(c.value ? { value: c.value } : {}),
        }));
    return [
        {
            ...(transaction.to ? { to: transaction.to } : {}),
            ...(transaction.data ? { data: transaction.data } : {}),
            ...(transaction.value ? { value: transaction.value } : {}),
        },
    ];
}
//# sourceMappingURL=virtualAddress.js.map