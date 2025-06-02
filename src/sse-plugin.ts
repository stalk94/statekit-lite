import { ProxyState } from './store';

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

    return (store: ProxyState<any>) => {
        const source = new EventSource(url);

        source.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const data = mapper ? mapper(parsed) : parsed;

                if (!path || path.length === 0) {
                    // если path не задан → пишем в корень
                    if (mode === 'push') {
                        throw new Error('[ssePlugin] mode: "push" недопустим без path');
                    }
                    store.set(data);
                    return;
                }

                // иначе идём по пути
                let target: any = store;
                for (const key of path.slice(0, -1)) {
                    target = target[key];
                }

                const lastKey = path[path.length - 1];

                if (mode === 'push') {
                    target[lastKey].update((prev: T[]) => [...(prev ?? []), data]);
                } 
                else {
                    target[lastKey].set(data);
                }

            } 
            catch (err) {
                console.warn('[ssePlugin] Ошибка обработки:', err);
            }
        }

        source.onerror = (err) => {
            console.warn('[ssePlugin] Ошибка соединения:', err);
        }
    };
}