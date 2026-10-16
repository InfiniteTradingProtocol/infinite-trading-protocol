"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eCannaTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.eCannaTestnet = (0, defineChain_js_1.defineChain)({
    id: 4112,
    name: 'E Canna Testnet',
    nativeCurrency: {
        name: 'E Canna Testnet',
        symbol: 'tECNA',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://testnetrpc.ecnascan.com'] },
    },
    blockExplorers: {
        default: {
            name: 'ECNA Scan Testnet',
            url: 'https://testnetexplorer.ecnascan.com',
        },
    },
    testnet: true,
});
//# sourceMappingURL=eCannaTestnet.js.map