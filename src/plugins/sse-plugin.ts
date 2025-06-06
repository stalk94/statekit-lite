import type { StorePlugin } from '../store';
import { syncPlugin } from '../sync-plugin';


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
}


export function ssePlugin<T = any>(options: SSEPluginOptions<T>): StorePlugin {
	const { url, path, mapper, mode = 'set', debug } = options;

	return syncPlugin<T>({
		path,
		debug,
		subscribe: (emit) => {
			const source = new EventSource(url);

			source.onmessage = (e) => {
				try {
					const data = JSON.parse(e.data);
					const mapped = mapper ? mapper(data) : data;

					if (debug) {
						console.log('[ssePlugin] raw:', data);
						console.log('[ssePlugin] mapped:', mapped);
					}

					if (mode === 'push') {
						emit(((prev: any) => [...(prev || []), mapped]) as (prev: T) => T);
					} 
					else emit(mapped);
				} 
				catch (err) {
					if (debug) console.warn('[ssePlugin] parse error:', e.data);
				}
			}

			return () => source.close();
		},
	});
}