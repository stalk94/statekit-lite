// src/store.ts
import { useSyncExternalStore } from "react";
import { produce } from "immer";
function safeClone(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(safeClone);
  const result = {};
  for (const key in obj) {
    const val = obj[key];
    result[key] = typeof val === "function" ? val : safeClone(val);
  }
  return result;
}
function getByPath(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj);
}
function setByPath(obj, path, val) {
  if (!path.length) return val;
  const [key, ...rest] = path;
  const isIndex = typeof key === "number" || /^\d+$/.test(String(key));
  const prev = obj ?? (isIndex ? [] : {});
  const clone = Array.isArray(prev) ? [...prev] : { ...prev };
  clone[key] = setByPath(prev[key], rest, val);
  return clone;
}
function pathToString(path) {
  return path.join(".");
}
function createStore(initialValue, options = {}) {
  const key = typeof options.persist === "object" ? options.persist.key : options.persist === true ? "statekit-store-" + Math.random().toString(36).slice(2) : null;
  let value = initialValue;
  let devtools = null;
  let lastUpdatedPath = null;
  if (typeof window !== "undefined" && options.devtools) {
    const ext = window.__REDUX_DEVTOOLS_EXTENSION__;
    if (ext?.connect) {
      devtools = ext.connect({
        name: typeof options.devtools === "object" ? options.devtools.name ?? "statekit" : "statekit"
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
  const listeners = /* @__PURE__ */ new Set();
  const watchers = /* @__PURE__ */ new Map();
  const notify = () => listeners.forEach((l) => l());
  const store = {
    get: () => value,
    set: (v) => {
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
        fns.forEach((fn) => fn(val));
      });
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }
  };
  function createProxy(path) {
    const pathStr = pathToString(path);
    const api = {
      get: (clone = false) => {
        const val = getByPath(store.get(), path);
        return clone ? structuredClone(val) : val;
      },
      set: (val) => {
        const prev = getByPath(store.get(), path);
        const next = typeof val === "function" ? options.immer ? produce(prev, val) : val(prev) : val;
        lastUpdatedPath = pathStr;
        store.set(setByPath(store.get(), path, next));
      },
      update: (fn) => {
        const current = getByPath(store.get(), path);
        const next = fn(current);
        store.set(setByPath(store.get(), path, next));
      },
      use: () => useSyncExternalStore(
        store.subscribe,
        () => getByPath(store.get(), path)
      ),
      watch: (fn) => {
        if (!watchers.has(pathStr)) {
          watchers.set(pathStr, /* @__PURE__ */ new Set());
        }
        const set = watchers.get(pathStr);
        const wrapped = (val) => fn(val, unsub);
        set.add(wrapped);
        const unsub = () => set.delete(wrapped);
        return unsub;
      },
      export: () => safeClone(getByPath(store.get(), path)),
      toJSON: () => getByPath(store.get(), path)
    };
    return new Proxy(api, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return createProxy([...path, prop]);
      }
    });
  }
  const proxyStore = createProxy([]);
  const cleanups = [];
  if (Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      try {
        const result = plugin(proxyStore);
        if (typeof result === "function") {
          cleanups.push(result);
        }
      } catch (e) {
        console.error(`[statekit-lite] Plugin error "${plugin.name}":`, e);
      }
    }
  }
  proxyStore.dispose = () => {
    cleanups.forEach((fn) => fn());
  };
  return proxyStore;
}

// src/sync-plugin.ts
function syncPlugin(options) {
  return (store) => {
    const { subscribe, pushUpdate, mapper, debug, path } = options;
    const log = (...args) => debug && console.log("[syncPlugin]", ...args);
    const isRoot = !path || path.length === 0;
    const target = isRoot ? store : path.reduce((acc, key) => acc?.[key], store);
    if (!target || typeof target.set !== "function") {
      log("\u274C invalid target at path:", path);
      return () => {
      };
    }
    let ignoreNext = false;
    const unsubscribeRemote = subscribe((incoming) => {
      const mapped = mapper ? mapper(incoming) : incoming;
      log("\u2B07\uFE0F incoming:", mapped);
      ignoreNext = true;
      if (typeof mapped === "function") {
        target.set(mapped);
      } else {
        target.set(() => mapped);
      }
    });
    const unsub = pushUpdate ? isRoot ? store.watch(() => {
      if (ignoreNext) {
        log("\u{1F6D1} skipping push (from remote)");
        ignoreNext = false;
        return;
      }
      const val = store.get?.(true);
      log("\u2B06\uFE0F pushUpdate:", val);
      if (val !== void 0) pushUpdate(val);
    }) : target.watch((val) => {
      if (ignoreNext) {
        log("\u{1F6D1} skipping push (from remote)");
        ignoreNext = false;
        return;
      }
      log("\u2B06\uFE0F pushUpdate path:", val);
      if (val !== void 0) pushUpdate(val);
    }) : void 0;
    return () => {
      unsubscribeRemote?.();
      unsub?.();
    };
  };
}

// src/plugins/sse-plugin.ts
function ssePlugin(options) {
  const { url, path, mapper, mode = "set", debug } = options;
  return syncPlugin({
    path,
    debug,
    subscribe: (emit) => {
      const source = new EventSource(url);
      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const mapped = mapper ? mapper(data) : data;
          if (debug) {
            console.log("[ssePlugin] raw:", data);
            console.log("[ssePlugin] mapped:", mapped);
          }
          if (mode === "push") {
            emit((prev) => [...prev || [], mapped]);
          } else emit(mapped);
        } catch (err) {
          if (debug) console.warn("[ssePlugin] parse error:", e.data);
        }
      };
      return () => source.close();
    }
  });
}
export {
  createStore,
  ssePlugin,
  syncPlugin
};
//# sourceMappingURL=index.js.map