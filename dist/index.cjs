var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createStore: () => createStore,
  ssePlugin: () => ssePlugin
});
module.exports = __toCommonJS(index_exports);

// src/store.ts
var import_react = require("react");
var import_immer = require("immer");
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
      set: (val) => {
        const prev = getByPath(store.get(), path);
        const next = typeof val === "function" ? options.immer ? (0, import_immer.produce)(prev, val) : val(prev) : val;
        lastUpdatedPath = pathStr;
        store.set(setByPath(store.get(), path, next));
      },
      update: (fn) => {
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
      use: () => (0, import_react.useSyncExternalStore)(
        store.subscribe,
        () => getByPath(store.get(), path)
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
      watch: (fn) => {
        if (!watchers.has(pathStr)) {
          watchers.set(pathStr, /* @__PURE__ */ new Set());
        }
        const set = watchers.get(pathStr);
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
  if (Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      try {
        plugin(proxyStore);
      } catch (e) {
        console.warn("[statekit-lite] Plugin error:", e);
      }
    }
  }
  return proxyStore;
}

// src/sse-plugin.ts
function ssePlugin(options) {
  const { url, path, mapper, mode = "set" } = options;
  return (store) => {
    const source = new EventSource(url);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const data = mapper ? mapper(parsed) : parsed;
        if (!path || path.length === 0) {
          if (mode === "push") {
            throw new Error('[ssePlugin] mode: "push" \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C \u0431\u0435\u0437 path');
          }
          store.set(data);
          return;
        }
        let target = store;
        for (const key of path.slice(0, -1)) {
          target = target[key];
        }
        const lastKey = path[path.length - 1];
        if (mode === "push") {
          target[lastKey].update((prev) => [...prev ?? [], data]);
        } else {
          target[lastKey].set(data);
        }
      } catch (err) {
        console.warn("[ssePlugin] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438:", err);
      }
    };
    source.onerror = (err) => {
      console.warn("[ssePlugin] \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F:", err);
    };
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStore,
  ssePlugin
});
//# sourceMappingURL=index.cjs.map