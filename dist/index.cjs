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
  ssePlugin: () => ssePlugin,
  supabasePlugin: () => supabaseGlobalPlugin,
  syncPlugin: () => syncPlugin
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
      get: (clone = false) => {
        const val = getByPath(store.get(), path);
        return clone ? structuredClone(val) : val;
      },
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
      use: () => (0, import_react.useSyncExternalStore)(
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

// src/plugins/supabase-plugin.ts
var import_supabase_js = require("@supabase/supabase-js");
function supabaseGlobalPlugin(options) {
  const supabase = (0, import_supabase_js.createClient)(options.url, options.anon_key);
  const { table, primary_key = "key", key, polling = 0, field = "value", debug } = options;
  const log = (...args) => debug && console.log("[supabaseKVPlugin]", ...args);
  return (store) => {
    let ignoreNext = false;
    let lastSent = "";
    let gotEvent = false;
    let pollTimer;
    let hasLocalUpdates = false;
    function startPolling() {
      if (!polling || polling <= 0) return;
      log("\u{1F504} Realtime silent \u2014 fallback polling every", polling, "ms");
      pollTimer = setInterval(async () => {
        const { data, error } = await supabase.from(table).select(field).eq(primary_key, key).single();
        if (data?.[field]) {
          const snap = JSON.stringify(data[field]);
          if (snap !== lastSent) {
            log("\u{1F4E5} polled update:", data[field]);
            ignoreNext = true;
            store.set(() => data[field]);
            lastSent = snap;
          }
        }
      }, polling);
    }
    const channel = supabase.channel(`realtime:${table}`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table
    }, (payload) => {
      const rowKey = payload.new?.[primary_key];
      const incoming = payload.new?.[field];
      if (rowKey !== key || incoming === void 0) return;
      gotEvent = true;
      log("\u2B07\uFE0F incoming from Supabase:", incoming);
      ignoreNext = true;
      store.set(() => incoming);
    }).subscribe();
    const pushUpdate = async (data) => {
      await supabase.from(table).upsert({
        [primary_key]: key,
        [field]: data
      });
    };
    const unsub = store.watch(() => {
      const val = store.get?.(true);
      if (val === void 0) return;
      hasLocalUpdates = true;
      const snap = JSON.stringify(val);
      if (snap === lastSent) return;
      lastSent = snap;
      log("\u2B06\uFE0F pushUpdate to Supabase:", val);
      pushUpdate(val);
    });
    (async () => {
      const { data, error } = await supabase.from(table).select(field).eq(primary_key, key).single();
      if (data?.[field]) {
        log("\u{1F4E5} initial load:", data[field]);
        ignoreNext = true;
        store.set(() => data[field]);
      } else if (!error) {
        log("\u{1F4E6} inserting default store state");
        await pushUpdate(store.get(true));
      }
    })();
    const timeout = setTimeout(() => {
      if (hasLocalUpdates && !gotEvent) {
        console.warn(
          "[supabasePlugin] \u26A0\uFE0F No realtime events received from Supabase after local updates.\nMake sure Realtime is enabled for this table in Supabase Dashboard \u2192 Table Editor \u2192 Realtime tab."
        );
        startPolling();
      }
    }, 5e3);
    return () => {
      clearTimeout(timeout);
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
      unsub?.();
    };
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStore,
  ssePlugin,
  supabasePlugin,
  syncPlugin
});
//# sourceMappingURL=index.cjs.map