type ValueOrUpdater<T> = T | ((prev: T) => T);
type StorePlugin = (store: ProxyState<any>) => void;
type PersistConfig = boolean | {
    key: string;
};
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
} & (T extends object ? {
    [K in keyof T]: ProxyState<T[K]>;
} : {});
interface StoreOptions {
    /** 🛢️ localStorage `{key: 'myState'}` */
    persist?: PersistConfig;
    /** ⚛️ enable redux dev tool log */
    devtools?: boolean | {
        name: string;
    };
    /** 🔧 default: false */
    immer?: boolean;
    /**
     * 🧩 array plugins function
     */
    plugins?: StorePlugin[];
}
declare function createStore<T extends object>(initialValue: T, options?: StoreOptions): ProxyState<T>;

type SSEPluginOptions<T> = {
    /** 🌐 URL path endpoint SSE */
    url: string;
    /** Path inside the store, e.g., ['messages'] or ['chat', 'list'] */
    path?: (string | number)[];
    /** Transforms incoming data before applying to the store */
    mapper?: (data: any) => T;
    /**
     * Mode:
     * - 'set' (default): replaces the store value
     * - 'push': appends to an array
     */
    mode?: 'set' | 'push';
    /** Enables debug logging */
    debug?: boolean;
};
declare function ssePlugin<T = any>(options: SSEPluginOptions<T>): StorePlugin;

interface SyncPluginOptions<T = any> {
    /**
     * Subscribes to remote data source (e.g. SSE, WebSocket, polling).
     * You must call `emit(data)` whenever new data arrives.
     * Returns an unsubscribe function.
     */
    subscribe: (emit: (data: T | ((prev: T) => T)) => void) => () => void;
    /**
     * Optional: pushes local store changes to a remote destination.
     * Called every time the specified store path is updated.
     */
    pushUpdate?: (data: T) => void;
    /**
     * Optional: transforms incoming data before setting it to the store.
     */
    mapper?: (incoming: any) => T;
    /**
     * Optional: path to the specific store key you want to sync.
     * Example: ['chat', 'messages'] to target store.chat.messages.
     * If omitted, the root store will be used.
     */
    path?: (string | number)[];
    /**
     * Optional: enables debug logging for all incoming/outgoing events.
     */
    debug?: boolean;
}
/**
 * Creates a synchronization plugin for statekit-lite.
 *
 * This plugin allows you to connect a piece of store state to a remote source,
 * such as Server-Sent Events, WebSocket, or polling, and optionally push updates
 * back to the server whenever the state changes.
 *
 * You can specify a nested path within the store to target a specific key,
 * and customize the synchronization behavior via optional mapper and debug options.
 *
 * @param options - Configuration for data subscription and update behavior
 * @returns A store plugin function compatible with statekit-lite
 */
declare function syncPlugin<T>(options: SyncPluginOptions<T>): StorePlugin;

type SupabaseGlobalPluginOptions = {
    /**
     * Supabase project URL (e.g., https://your-project.supabase.co)
     */
    url: string;
    /**
     * Supabase public anon key for client-side access
     */
    anon_key: string;
    /**
     * The table name where the data will be synced
     * (e.g., 'kv_store')
     */
    table: string;
    /**
     * The name of the primary key column used to identify rows
     * Default is 'key'
     */
    primary_key?: string;
    /**
     * The value of the primary key to target
     * This uniquely identifies the row for this store instance
     */
    key: string;
    /**
     * in milliseconds (0 = disabled by default)
     */
    polling?: number;
    /**
     * The column name where the store state will be stored
     * Default is 'value'
     */
    field?: string;
    /**
     * Enables debug logging to console
     */
    debug?: boolean;
};
declare function supabaseGlobalPlugin(options: SupabaseGlobalPluginOptions): StorePlugin;

export { createStore, ssePlugin, supabaseGlobalPlugin as supabasePlugin, syncPlugin };
