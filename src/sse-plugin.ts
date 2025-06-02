import { ProxyState } from './store';

type SSEPluginOptions<T> = {
    /** URL SSE-сервера */
    url: string;
    /** Путь в store: ['messages'] или ['chat', 'list'] */
    path: (string | number)[];
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

                // Находим целевой store по пути
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
                console.warn('[ssePlugin] Ошибка разбора данных:', err);
            }
        }

        source.onerror = (err) => {
            console.warn('[ssePlugin] Ошибка соединения:', err);
        }
    };
}