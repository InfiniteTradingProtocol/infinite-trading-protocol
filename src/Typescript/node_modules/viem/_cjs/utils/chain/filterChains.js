"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterChains = filterChains;
function filterChains(parameters) {
    const { chains, sort, testnet, token } = parameters;
    const values = Array.isArray(chains) ? chains : Object.values(chains);
    const filtered = [];
    for (const chain of values) {
        if (!isChain(chain))
            continue;
        if (token && !(chain.id in token.addresses))
            continue;
        if (testnet === true && chain.testnet !== true)
            continue;
        if (testnet === false && chain.testnet === true)
            continue;
        filtered.push(chain);
    }
    if (sort === 'id')
        filtered.sort((a, b) => a.id - b.id);
    if (sort === 'name')
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
}
function isChain(chain) {
    return (typeof chain === 'object' &&
        chain !== null &&
        'id' in chain &&
        typeof chain.id === 'number' &&
        'name' in chain &&
        typeof chain.name === 'string' &&
        'nativeCurrency' in chain &&
        'rpcUrls' in chain);
}
//# sourceMappingURL=filterChains.js.map