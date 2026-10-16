export function defineFormatter(type, format) {
    return ({ exclude, format: overrides, }) => {
        return {
            exclude,
            format: (args, action) => {
                const formatted = format(args, action);
                if (exclude) {
                    for (const key of exclude) {
                        delete formatted[key];
                    }
                }
                // Preserve named return types so exported chains can emit portable declarations.
                return {
                    ...formatted,
                    ...overrides(args, action),
                };
            },
            type,
        };
    };
}
//# sourceMappingURL=formatter.js.map