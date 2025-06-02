import { ProxyState, Unsubscribe } from './store';

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
}


export default function ssePlugin<T = any>(options: SSEPluginOptions<T>) {
    const { url, path, mapper, mode = 'set' } = options;

    return (store: ProxyState<any>): Unsubscribe => {
        const source = new EventSource(url);

        source.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const data = mapper ? mapper(parsed) : parsed;
                let target: any = store;

                if (path) {
                    for (const key of path.slice(0, -1)) {
                        if (!(key in target)) return;
                        target = target[key];
                    }
                    const lastKey = path[path.length - 1];

                    if (mode === 'push') {
                        const current = target[lastKey].get?.();
                        if (!Array.isArray(current)) {
                            target[lastKey].set([]);
                        }
                        target[lastKey].update((prev: T[]) => [...(prev ?? []), data]);
                    } 
                    else {
                        target[lastKey].set(data);
                    }
                } 
                else {
                    store.set(data);
                }
            } 
            catch (err) {
                console.warn('[ssePlugin] Ошибка обработки:', err);
            }
        }

        source.onerror = (err) => {
            console.warn('[ssePlugin] Ошибка соединения:', err);
        }

        const cleanup: Unsubscribe = () => {
            source.close();
            console.log('[ssePlugin] Соединение закрыто');
        }

        return cleanup;
    }
}