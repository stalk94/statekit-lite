import { useSyncExternalStore } from "react";
import { produce } from "immer";

type ValueOrUpdater<T> = T | ((prev: T) => T);

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
     *  ⚛️ React hook that subscribes to this value  
     *  Automatically triggers re-render when value changes  
     *
     *  📌 Must be called inside a React component or hook  
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
    watch: (fn: (newValue: T) => void) => () => void;

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

type PersistConfig = boolean | { key: string };
interface StoreOptions {
    /** 🛢️ localStorage `{key: 'myState'}` */
    persist?: PersistConfig;
    /** ⚛️ enable redux dev tool log */
    devtools?: boolean | { name: string };
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
            devtools.init(value);
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
    };

    function createProxy(path: (string | number)[]): any {
        const pathStr = pathToString(path);

        const api = {
            /** 
             *  🔗 `.get()` - object references,     
             *  🗐  `.get(true)`- structured clone 
             */
            get: (clone = false) => {
                const val = getByPath(store.get(), path);
                return clone ? structuredClone(val) : val;
            },
            /**
             *  📌 `.set(value)` — direct replace   
             *  🔁 `.set(prev => next)` — functional update  
             *  🧠 `.set(draft => { draft.x = 1 })` — safe mutation via Immer   
             */
            set: (val: any) => {
                const prev = getByPath(store.get(), path);
                const next = typeof val === "function" ? produce(prev, val) : val;
                lastUpdatedPath = pathStr;
                store.set(setByPath(store.get(), path, next));
            },
            update: (fn: (prev: any) => any) => {
                const current = getByPath(store.get(), path);
                const next = fn(current);
                store.set(setByPath(store.get(), path, next));
            },
            /**
             *  ⚛️ React hook that subscribes to this value. Automatically triggers re-render when value changes  
             *
             *  📌 Must be called inside a React component or hook  
             *  Equivalent to `.get()` but reactive  
             *
             *  @returns Current value of the state at this path
             */
            use: () => useSyncExternalStore(store.subscribe, () =>
                getByPath(store.get(), path)
            ),
            /**
             *  👁 Subscribes to external (non-React) changes  
             *  Useful for triggering side effects when a value changes  
             *
             *  Unlike `.use()`, works outside of React lifecycle  
             *  You must manually unsubscribe to avoid memory leaks
             * 
             * @example
             *  const unsubscribe = state.user.name.watch((val) => {
             *      console.log("Changed:", val);
             *  });
             * // later
             *  unsubscribe();
             * 
             * // or ract useEffect
             * useEffect(() => {
             *      const unsub = state.user.name.watch(console.log);
             *      return unsub; // cleanup on unmount
             *   }, []);
             * 
             * 
             *  @param callback Function to call when value changes  
             *  @returns Unsubscribe function
             */
            watch: (fn: (val: any) => void) => {
                if (!watchers.has(pathStr)) {
                    watchers.set(pathStr, new Set());
                }
                const set = watchers.get(pathStr)!;
                set.add(fn);
                return () => set.delete(fn);
            },
            /**
             *  🗐 Returns a deep copy of the current value  
             *  Safe to mutate or serialize (e.g. for export, snapshot, send to server)  
             *
             *  Functions and components are preserved by reference  
             *  Proxy and reactivity are stripped
             *
             *  @returns Deep cloned plain value
             */
            export: () => safeClone(getByPath(store.get(), path)),
            toJSON: () => getByPath(store.get(), path),
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
