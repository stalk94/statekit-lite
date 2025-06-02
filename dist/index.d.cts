type ValueOrUpdater<T> = T | ((prev: T) => T);
type StorePlugin = (store: ProxyState<any>) => void;
type Unsubscribe = () => void;
type ProxyState<T> = {
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
    watch: (fn: (val: T, unsub: () => void) => void) => Unsubscribe;
    /**
     *  🗐 Returns a deep cloned plain value
     *  Functions and components are preserved by reference
     */
    export: () => T;
} & (T extends object ? {
    [K in keyof T]: ProxyState<T[K]>;
} : {});
type PersistConfig = boolean | {
    key: string;
};
interface StoreOptions {
    /** 🛢️ localStorage `{key: 'myState'}` */
    persist?: PersistConfig;
    /** ⚛️ enable redux dev tool log */
    devtools?: boolean | {
        name: string;
    };
    /** 🔧 default: false */
    immer?: boolean;
    plugins?: StorePlugin[];
}
declare function createStore<T extends object>(initialValue: T, options?: StoreOptions): ProxyState<T>;

type SSEPluginOptions<T> = {
    /**🌐 URL path endpoint SSE */
    url: string;
    /** Путь в store: ['messages'] или ['chat', 'list'] */
    path?: (string | number)[];
    /** Преобразование данных перед установкой */
    mapper?: (data: any) => T;
    /**
     * Поведение: 'set' (по умолчанию) — перезапись значения,
     * или 'push' — добавление в массив
     */
    mode?: 'set' | 'push';
};
declare function ssePlugin<T = any>(options: SSEPluginOptions<T>): (store: ProxyState<any>) => Unsubscribe;

export { createStore, ssePlugin };
