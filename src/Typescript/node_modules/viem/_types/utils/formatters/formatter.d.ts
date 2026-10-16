import type { ErrorType } from '../../errors/utils.js';
export type DefineFormatterErrorType = ErrorType;
export declare function defineFormatter<type extends string, parameters, returnType>(type: type, format: (args: parameters, action?: string | undefined) => returnType): <parametersOverride, returnTypeOverride, exclude extends (keyof parameters | keyof parametersOverride)[] = []>({ exclude, format: overrides, }: {
    exclude?: exclude | undefined;
    format: (args: parametersOverride, action?: string | undefined) => returnTypeOverride;
}) => {
    exclude: exclude | undefined;
    format: (args: parametersOverride, action?: string | undefined) => exclude[number] extends never ? returnTypeOverride : returnTypeOverride & { [_key in exclude[number]]: never; };
    type: type;
};
//# sourceMappingURL=formatter.d.ts.map