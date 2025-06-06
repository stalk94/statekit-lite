import type { StorePlugin, ProxyState } from './store';


export interface SyncPluginOptions<T = any> {
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
    pushUpdate?: (data: T) => void

    /**
     * Optional: transforms incoming data before setting it to the store.
     */
    mapper?: (incoming: any) => T;

    /**
     * Optional: path to the specific store key you want to sync.       
     * Example: ['chat', 'messages'] to target store.chat.messages.     
     * If omitted, the root store will be used.
     */
    path?: (string | number)[]

    /**
     * Optional: enables debug logging for all incoming/outgoing events.
     */
    debug?: boolean
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
export function syncPlugin<T>(options: SyncPluginOptions<T>): StorePlugin {
    return (store: ProxyState<any>) => {
        const { subscribe, pushUpdate, mapper, debug, path } = options;

        const log = (...args: any[]) => debug && console.log('[syncPlugin]', ...args);

        const isRoot = !path || path.length === 0;
        const target = isRoot
            ? store
            : path.reduce((acc: any, key) => acc?.[key], store);

        if (!target || typeof target.set !== 'function') {
            log('❌ invalid target at path:', path);
            return () => {};
        }
        
        let ignoreNext = false;
        // Входящие события
        const unsubscribeRemote = subscribe((incoming) => {
            const mapped = mapper ? mapper(incoming) : incoming;
            log('⬇️ incoming:', mapped);

            ignoreNext = true;
            if (typeof mapped === 'function') {
                target.set(mapped as (prev: T) => T);
            } 
            else {
                target.set(() => mapped); // оборачиваем, чтобы .set() не трогал prev
            }
        });

        // Исходящие события
        const unsub = pushUpdate
            ? (isRoot
                ? store.watch(() => {
                    if (ignoreNext) {
                        log('🛑 skipping push (from remote)');
                        ignoreNext = false;
                        return;
                    }
                    const val = store.get?.(true);
                    log('⬆️ pushUpdate:', val);
                    if (val !== undefined) pushUpdate(val);
                })
                : target.watch((val) => {
                    if (ignoreNext) {
                        log('🛑 skipping push (from remote)');
                        ignoreNext = false;
                        return;
                    }
                    log('⬆️ pushUpdate path:', val);
                    if (val !== undefined) pushUpdate(val);
                })
            )
            : undefined;

        return () => {
            unsubscribeRemote?.();
            unsub?.();
        }
    };
}