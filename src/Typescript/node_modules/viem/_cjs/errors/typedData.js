"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTypedDataTypeError = exports.InvalidStructTypeError = exports.InvalidPrimaryTypeError = exports.InvalidDomainError = void 0;
const stringify_js_1 = require("../utils/stringify.js");
const base_js_1 = require("./base.js");
class InvalidDomainError extends base_js_1.BaseError {
    constructor({ domain }) {
        super(`Invalid domain "${(0, stringify_js_1.stringify)(domain)}".`, {
            metaMessages: ['Must be a valid EIP-712 domain.'],
        });
    }
}
exports.InvalidDomainError = InvalidDomainError;
class InvalidPrimaryTypeError extends base_js_1.BaseError {
    constructor({ primaryType, types, }) {
        super(`Invalid primary type \`${primaryType}\` must be one of \`${JSON.stringify(Object.keys(types))}\`.`, {
            docsPath: '/api/glossary/Errors#typeddatainvalidprimarytypeerror',
            metaMessages: ['Check that the primary type is a key in `types`.'],
        });
    }
}
exports.InvalidPrimaryTypeError = InvalidPrimaryTypeError;
class InvalidStructTypeError extends base_js_1.BaseError {
    constructor({ type }) {
        super(`Struct type "${type}" is invalid.`, {
            metaMessages: ['Struct type must not be a Solidity type.'],
            name: 'InvalidStructTypeError',
        });
    }
}
exports.InvalidStructTypeError = InvalidStructTypeError;
class InvalidTypedDataTypeError extends base_js_1.BaseError {
    constructor({ type }) {
        const canonicalType = type.replace(/^(u?int)/, '$&256');
        super(`Type "${type}" is not a valid EIP-712 type.`, {
            metaMessages: [`Use "${canonicalType}" instead.`],
            name: 'InvalidTypedDataTypeError',
        });
    }
}
exports.InvalidTypedDataTypeError = InvalidTypedDataTypeError;
//# sourceMappingURL=typedData.js.map