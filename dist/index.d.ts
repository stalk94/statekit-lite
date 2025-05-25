type ValueOrUpdater<T> = T | ((prev: T) => T);
type ProxyState<T> = {
    get: () => T;
    set: (value: ValueOrUpdater<T>) => void;
    update: (fn: (prev: T) => T) => void;
    use: () => T;
    watch: (fn: (newValue: T) => void) => () => void;
} & (T extends object ? {
    [K in keyof T]: ProxyState<T[K]>;
} : {});
type PersistConfig = boolean | {
    key: string;
};
interface StoreOptions {
    persist?: PersistConfig;
    devtools?: boolean | {
        name: string;
    };
}
declare function createStore<T extends object>(initialValue: T, options?: StoreOptions): ProxyState<T>;

export { type ProxyState, createStore };
