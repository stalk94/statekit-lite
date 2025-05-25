import { useSyncExternalStore } from "react";

type ValueOrUpdater<T> = T | ((prev: T) => T);

export type ProxyState<T> = {
    get: () => T;
    set: (value: ValueOrUpdater<T>) => void;
    update: (fn: (prev: T) => T) => void;
    use: () => T;
    watch: (fn: (newValue: T) => void) => () => void;
} & (T extends object
    ? {
        [K in keyof T]: ProxyState<T[K]>;
    }
    : {});

type PersistConfig = boolean | { key: string };
interface StoreOptions {
    persist?: PersistConfig
    devtools?: boolean | { name: string }
}


function getByPath(obj: any, path: (string | number)[]): any {
    return path.reduce((acc, key) => acc?.[key], obj);
}
function setByPath(obj: any, path: (string | number)[], val: any): any {
    if (!path.length) return val;
    const [key, ...rest] = path;
    const isIndex = typeof key === "number" || /^\d+$/.test(String(key));
    const prev = obj ?? (isIndex ? [] : {});
    const clone = Array.isArray(prev) ? [...prev] : { ...prev };
    clone[key] = setByPath(prev[key], rest, val);
    return clone;
}
function pathToString(path: (string | number)[]) {
    return path.join(".");
}



export function createStore<T extends object>(
    initialValue: T,
    options: StoreOptions = {}
): ProxyState<T> {
    const key =
        typeof options.persist === "object"
            ? options.persist.key
            : options.persist === true
                ? "statekit-store-" + Math.random().toString(36).slice(2)
                : null;

    let value: T = initialValue;
    let devtools: any = null;
    let lastUpdatedPath: string | null = null;

    if (typeof window !== "undefined" && options.devtools) {
        const ext = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (ext) {
            devtools = ext.connect({ name: typeof options.devtools === 'object' ? options.devtools.name ?? "statekit" : "statekit" });
            devtools.init(value); // начальное значение
        }
    }
    if (typeof window !== "undefined" && key) {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                value = JSON.parse(stored);
            } catch {
                value = initialValue;
            }
        }
    }

    const listeners = new Set<() => void>();
    const watchers = new Map<string, Set<(val: any) => void>>();
    const notify = () => listeners.forEach((l) => l());

    const store = {
        get: () => value,
        set: (v: T) => {
            value = v;

            if (typeof window !== "undefined" && key) {
                localStorage.setItem(key, JSON.stringify(value));
            }
            if (devtools) {
                devtools.send({ type: `[set] ${lastUpdatedPath ?? "unknown"}` }, value);
            }


            notify();
            watchers.forEach((fns, pathStr) => {
                const path = pathStr.split(".");
                const val = getByPath(value, path);
                fns.forEach(fn => fn(val));
            });
        },
        subscribe: (cb: () => void) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
    }

    function createProxy(path: (string | number)[]): any {
        const pathStr = pathToString(path);

        const api = {
            get: () => getByPath(store.get(), path),
            set: (val: any) => {
                const prev = getByPath(store.get(), path);
                const next = typeof val === "function" ? val(prev) : val;
                lastUpdatedPath = pathToString(path);
                store.set(setByPath(store.get(), path, next));
            },
            update: (fn: (prev: any) => any) => {
                const current = getByPath(store.get(), path);
                const next = fn(current);
                store.set(setByPath(store.get(), path, next));
            },
            use: () => useSyncExternalStore(store.subscribe, () =>
                getByPath(store.get(), path)
            ),
            watch: (fn: (val: any) => void) => {
                if (!watchers.has(pathStr)) {
                    watchers.set(pathStr, new Set());
                }
                const set = watchers.get(pathStr)!;
                set.add(fn);
                return () => set.delete(fn);
            },
        };

        return new Proxy(api, {
            get(target, prop) {
                if (prop in target) return (target as any)[prop];
                return createProxy([...path, prop as string]);
            }
        });
    }

    return createProxy([]) as ProxyState<T>;
}
