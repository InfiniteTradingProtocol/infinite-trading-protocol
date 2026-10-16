import * as Bytes from '../Bytes.js';
import type * as Errors from '../Errors.js';
import * as Hash from '../Hash.js';
/** @internal */
export declare function derive(seed: Bytes.Bytes, domain: Bytes.Bytes, options?: derive.Options): Bytes.Bytes;
export declare namespace derive {
    type Options = {
        validate?: ((key: Bytes.Bytes) => boolean) | undefined;
    };
    type ErrorType = Bytes.concat.ErrorType | Bytes.fromNumber.ErrorType | Hash.hmac256.ErrorType | Errors.GlobalErrorType;
}
//# sourceMappingURL=keyDerivation.d.ts.map