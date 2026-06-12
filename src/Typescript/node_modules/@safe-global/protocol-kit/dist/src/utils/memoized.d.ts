export declare function createMemoizedFunction<T extends (...args: Parameters<T>) => ReturnType<T>>(callback: T, cache?: Record<string, ReturnType<T>>): (...args: Parameters<T>) => ReturnType<T>;
