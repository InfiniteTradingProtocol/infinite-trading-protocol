import * as Bytes from '../Bytes.js';
import * as Hash from '../Hash.js';
/** @internal */
export function derive(seed, domain, options = {}) {
    const { validate } = options;
    for (let counter = 0;; counter++) {
        const key = Hash.hmac256(seed, Bytes.concat(domain, Bytes.fromNumber(counter, { size: 4 })), { as: 'Bytes' });
        if (!validate || validate(key))
            return key;
        key.fill(0);
    }
}
//# sourceMappingURL=keyDerivation.js.map