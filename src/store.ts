import { useSyncExternalStore } from "react";
import { produce } from "immer";


type ValueOrUpdater<T> = T | ((prev: T) => T);
export type StorePlugin = (store: ProxyState<any>) => void;
type PersistConfig = boolean | { key: string };


export type Unsubscribe = () => void;
export type ProxyState<T> = {
    /** 
     *  🔗 `.get()` — object references  
     *  🗐 `.get(true)` — structured clone 
     */
    get: (clone?: boolean) => T;

    /**
     *  📌 `.set(value)` — direct replace  
     *  🔁 `.set(prev => next)` — functional update  
     *  🧠 `.set(draft => { draft.x = 1 })` — safe mutation via Immer  
     */
    set: (value: ValueOrUpdater<T>) => void;

    /**
     *  ✏️ Direct updater, same as `.set(prev => fn(prev))`  
     */
    update: (fn: (prev: T) => T) => void;

    /**
    *  ⚛️ React hook that subscribes to this value. Automatically triggers re-render when value changes  
    *
    *  📌 Must be called inside a React component or hook  
    *  Equivalent to `.get()` but reactive  
    *
    *  @returns Current value of the state at this path
    */
    use: () => T;

    /**
     *  👁 Subscribes to external (non-React) changes  
     *  Useful for triggering side effects when value changes  
     *
     *  @returns Unsubscribe function
     *  @example
     *  const unsub = state.user.name.watch((val) => console.log(val));
     *  unsub();
     */
    watch: (fn: (val: T, unsub: () => void) => void) => Unsubscribe;

    /**
     *  🗐 Returns a deep cloned plain value  
     *  Functions and components are preserved by reference  
     */
    export: () => T;
} & (T extends object
    ? {
        [K in keyof T]: ProxyState<T[K]>;
    }
    : {});


interface StoreOptions {
    /** 🛢️ localStorage `{key: 'myState'}` */
    persist?: PersistConfig
    /** ⚛️ enable redux dev tool log */
    devtools?: boolean | { name: string }
    /** 🔧 default: false */
    immer?: boolean
    /**
     * 🧩 array plugins function
     */
    plugins?: StorePlugin[]
}

//////////////////////////////////////////////////////////////////////////
function safeClone(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(safeClone);

    const result: any = {};
    for (const key in obj) {
        const val = obj[key];
        result[key] = typeof val === 'function' ? val : safeClone(val);
    }
    return result;
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

//////////////////////////////////////////////////////////////////////////


export function createStore<T extends object>(initialValue: T, options: StoreOptions = {}): ProxyState<T> {
    const key =
        typeof options.persist === "object"
            ? options.persist.key
            : options.persist === true
                ? "statekit-store-" + Math.random().toString(36).slice(2)
                : null;

    let value: T = initialValue;
    let devtools: any = null;
    let lastUpdatedPath: string | null = null;

    if (typeof window !== 'undefined' && options.devtools) {
        const ext = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (ext?.connect) {
            devtools = ext.connect({
                name: typeof options.devtools === 'object' ? options.devtools.name ?? 'statekit' : 'statekit'
            });
            devtools.init(safeClone(value));
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
                devtools.send({ type: `[set] ${lastUpdatedPath ?? "unknown"}` }, safeClone(value));
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
            get: (clone = false) => {
                const val = getByPath(store.get(), path);
                return clone ? structuredClone(val) : val;
            },
            set: (val: any) => {
                const prev = getByPath(store.get(), path);

                const next = typeof val === "function"
                    ? options.immer ? produce(prev, val) : val(prev)
                    : val;

                lastUpdatedPath = pathStr;
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
            watch: (fn: (val: any, unsub: Unsubscribe) => void) => {
                if (!watchers.has(pathStr)) {
                    watchers.set(pathStr, new Set());
                }

                const set = watchers.get(pathStr)!;

                const wrapped = (val: any) => fn(val, unsub);
                set.add(wrapped);

                const unsub = () => set.delete(wrapped);
                return unsub;
            },
            export: () => safeClone(getByPath(store.get(), path)),
            toJSON: () => getByPath(store.get(), path),
        }

        return new Proxy(api, {
            get(target, prop) {
                if (prop in target) return (target as any)[prop];
                return createProxy([...path, prop as string]);
            }
        });
    }

    const proxyStore = createProxy([]) as ProxyState<T>;
    const cleanups: (() => void)[] = [];

    if (Array.isArray(options.plugins)) {
        for (const plugin of options.plugins) {
            try {
                const result = plugin(proxyStore);
                if (typeof result === 'function') {
                    cleanups.push(result);
                }
            } 
            catch (e) {
                console.error(`[statekit-lite] Plugin error "${plugin.name}":`, e);
            }
        }
    }

    (proxyStore as any).dispose = () => {
        cleanups.forEach(fn => fn());
    }


    return proxyStore;
}
