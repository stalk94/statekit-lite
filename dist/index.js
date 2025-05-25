// src/index.ts
import { useSyncExternalStore } from "react";
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
      get: () => getByPath(store.get(), path),
      set: (val) => {
        const prev = getByPath(store.get(), path);
        const next = typeof val === "function" ? val(prev) : val;
        lastUpdatedPath = pathToString(path);
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
        set.add(fn);
        return () => set.delete(fn);
      }
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