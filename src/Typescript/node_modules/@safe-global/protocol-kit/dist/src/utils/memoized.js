"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoizedFunction = void 0;
const SafeProvider_1 = __importDefault(require("../SafeProvider"));
function createMemoizedFunction(callback, cache = {}) {
    const replacer = createSafeContractSerializerReplacer();
    return (...args) => {
        const key = JSON.stringify(args, replacer);
        cache[key] = cache[key] || callback(...args);
        return cache[key];
    };
}
exports.createMemoizedFunction = createMemoizedFunction;
// EIP1193 providers from web3.currentProvider and hre.network.provider fail to serialize BigInts
function createSafeContractSerializerReplacer() {
    const seen = new Set();
    return (_, value) => {
        // Serialize Bigints as strings
        if (typeof value === 'bigint') {
            return value.toString();
        }
        // Avoid circular references
        if (value instanceof SafeProvider_1.default && value !== null) {
            if (seen.has(value)) {
                return undefined;
            }
            seen.add(value);
            return {
                $safeProvider: {
                    provider: typeof value.provider === 'object' ? 'EIP1193Provider' : value.provider,
                    signer: value.signer
                }
            };
        }
        return value;
    };
}
//# sourceMappingURL=memoized.js.map