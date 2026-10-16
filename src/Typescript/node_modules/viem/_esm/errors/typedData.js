import { stringify } from '../utils/stringify.js';
import { BaseError } from './base.js';
export class InvalidDomainError extends BaseError {
    constructor({ domain }) {
        super(`Invalid domain "${stringify(domain)}".`, {
            metaMessages: ['Must be a valid EIP-712 domain.'],
        });
    }
}
export class InvalidPrimaryTypeError extends BaseError {
    constructor({ primaryType, types, }) {
        super(`Invalid primary type \`${primaryType}\` must be one of \`${JSON.stringify(Object.keys(types))}\`.`, {
            docsPath: '/api/glossary/Errors#typeddatainvalidprimarytypeerror',
            metaMessages: ['Check that the primary type is a key in `types`.'],
        });
    }
}
export class InvalidStructTypeError extends BaseError {
    constructor({ type }) {
        super(`Struct type "${type}" is invalid.`, {
            metaMessages: ['Struct type must not be a Solidity type.'],
            name: 'InvalidStructTypeError',
        });
    }
}
export class InvalidTypedDataTypeError extends BaseError {
    constructor({ type }) {
        const canonicalType = type.replace(/^(u?int)/, '$&256');
        super(`Type "${type}" is not a valid EIP-712 type.`, {
            metaMessages: [`Use "${canonicalType}" instead.`],
            name: 'InvalidTypedDataTypeError',
        });
    }
}
//# sourceMappingURL=typedData.js.map