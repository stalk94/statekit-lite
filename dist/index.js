// src/index.ts
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
    if (ext) {
      devtools = ext.connect({ name: typeof options.devtools === "object" ? options.devtools.name ?? "statekit" : "statekit" });
      devtools.init(value);
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
        devtools.send({ type: `[set] ${lastUpdatedPath ?? "unknown"}` }, value);
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
        const next = typeof val === "function" ? options.immer ? produce(prev, val) : val(prev) : val;
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
      use: () => useSyncExternalStore(
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
  return createProxy([]);
}
export {
  createStore
};
//# sourceMappingURL=index.js.map