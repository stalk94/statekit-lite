import type { StorePlugin, ProxyState } from '../store';
import { createClient } from '@supabase/supabase-js';

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
    polling?: number

    /**
     * The column name where the store state will be stored
     * Default is 'value'
     */
    field?: string;

    /**
     * Enables debug logging to console
     */
    debug?: boolean;
}


export function supabaseGlobalPlugin(options: SupabaseGlobalPluginOptions): StorePlugin {
    const supabase = createClient(options.url, options.anon_key);
    const { table, primary_key = 'key', key, polling = 0, field = 'value', debug } = options;
    const log = (...args: any[]) => debug && console.log('[supabaseKVPlugin]', ...args);


    return (store: ProxyState<any>) => {
        let ignoreNext = false;
        let lastSent = '';
        let gotEvent = false;
        let pollTimer: any;
        let hasLocalUpdates = false;

        function startPolling() {
            if (!polling || polling <= 0) return;

            log('🔄 Realtime silent — fallback polling every', polling, 'ms');
            pollTimer = setInterval(async () => {
                const { data, error } = await supabase
                    .from(table)
                    .select(field)
                    .eq(primary_key, key)
                    .single();

                if (data?.[field]) {
                    const snap = JSON.stringify(data[field]);
                    if (snap !== lastSent) {
                        log('📥 polled update:', data[field]);
                        ignoreNext = true;
                        store.set(() => data[field]);
                        lastSent = snap;
                    }
                }
            }, polling);
        }

        const channel = supabase
            .channel(`realtime:${table}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table
            }, (payload) => {
                const rowKey = payload.new?.[primary_key];
                const incoming = payload.new?.[field];

                if (rowKey !== key || incoming === undefined) return;

                gotEvent = true;
                log('⬇️ incoming from Supabase:', incoming);

                ignoreNext = true;
                store.set(() => incoming);
            })
            .subscribe();


        const pushUpdate = async (data: any) => {
            await supabase.from(table).upsert({
                [primary_key]: key,
                [field]: data
            });
        }

        const unsub = store.watch(() => {
            const val = store.get?.(true);
            if (val === undefined) return;

            hasLocalUpdates = true;
            const snap = JSON.stringify(val);
            if (snap === lastSent) return;
            lastSent = snap;

            log('⬆️ pushUpdate to Supabase:', val);
            pushUpdate(val);
        });

        // начальная загрузка
        (async () => {
            const { data, error } = await supabase
                .from(table)
                .select(field)
                .eq(primary_key, key)
                .single();

            if (data?.[field]) {
                log('📥 initial load:', data[field]);
                ignoreNext = true;
                store.set(() => data[field]);
            } 
            else if (!error) {
                log('📦 inserting default store state');
                await pushUpdate(store.get(true));
            }
        })();

        const timeout = setTimeout(() => {
            if (hasLocalUpdates && !gotEvent) {
                console.warn(
                    '[supabasePlugin] ⚠️ No realtime events received from Supabase after local updates.\n' +
                    'Make sure Realtime is enabled for this table in Supabase Dashboard → Table Editor → Realtime tab.'
                );

                startPolling();
            }
        }, 5000);

        return () => {
            clearTimeout(timeout);
            clearInterval(pollTimer);
            supabase.removeChannel(channel);
            unsub?.();
        }
    }
}