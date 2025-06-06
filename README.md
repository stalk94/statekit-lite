# 🧠 statekit-lite

A minimal global state manager for React  

- 🔥 has no dependencies (except immer)
- ⚛️ Fully typed reactive access 
- 🔁 `.get()`, `.set()`, `.use()` and `.watch()` on any nested path  
- 📦 Redux DevTools compatible 
- 🌐 Realtime support with SSE plugin


## ✨ Key Features

- 🔥 Proxy-based access with automatic nested structure creation
- 🔥 Typed access and reactivity with `.get()` / `.set()` / `.use()`
- 📝 Watch outside React with `.watch(fn)`
- 💾 Persist to localStorage
- ⚛️ Redux DevTools integration
- ✨ SSR-safe by design
- 🌐 Realtime updates via ssePlugin()
- 🧩 Plugin system — extend behavior with middleware-style plugins
- 🌐 Realtime sync via:

  - `ssePlugin()` – Server-Sent Events  
  - `syncPlugin()` – universal sync layer (WebSocket, polling, etc.)  
  - `supabasePlugin()` – Supabase integration (with optional fallback polling)


## 📦 Installation

```bash
# Using npm
npm install statekit-lite

# Using yarn
yarn add statekit-lite

# Using pnpm
pnpm add statekit-lite
```


## 📌 Examples

 crate state
```tsx
import React from "react";
import { createStore } from "statekit-lite";

// Create store with persist + devtools
const userStore = createStore({
  user: {
    name: 'Anon',
    age: 25
  }
}, {
  persist: {
    key: 'user'     //  (path key from local storage) persist save, and auto load 
  },
  immer: true 
});

```


full example of possible use
```tsx
import React from "react";
import { createStore } from "statekit-lite";

// Create store with persist + devtools
const userStore = createStore({
  user: {
    name: 'Anon',
    age: 25
  }
}, {
  persist: {
    key: 'user'
  },
  devtools: {
    name: "userStore"
  },
  immer: true
});

// Component that shows state
function Display() {
  const user = userStore.user.use();

  return (
    <div style={{ marginLeft: '45%', marginTop: '15%', fontSize: '24px', color: 'silver' }}>
      {user.age}
    </div>
  );
}

// Component that updates state every second
function Updater() {
  React.useEffect(() => {
    const i = setInterval(() => {
      userStore.user.arr[1].set({ t: 1 }); // creates nested array structure
      userStore.user.test.test.set({ a: 1 }); // creates nested object structure
      userStore.user.age.set(age => age + 1); // updates with function

      console.log(userStore.user.get());
    }, 1000);

    return () => clearInterval(i);
  }, []);

  return null;
}

// Root App
export function App() {
  return (
    <div>
      <Updater />
      <Display />
    </div>
  );
}
```

---

## ✅ Explanation

- `createStore(...)` creates a globally accessible reactive store
- `userStore.user.age.use()` subscribes to changes and re-renders `Display`
- `set(...)` auto-creates nested paths like `arr[1]` or `test.test`
- `persist` keeps state across reloads using localStorage
- `devtools` logs each `.set()` call into Redux DevTools




✅ **watch(fn)** — programmatic change listener

```ts
userStore.user.watch((user) => {
  console.log("state changed: ", user);
});
```

# 🧩 Plugins

statekit-lite supports realtime sync via plugins.

---

### 🔄 `syncPlugin(options)`

A universal plugin that connects any part of the store to remote data (SSE, WebSocket, polling, etc.).

#### ✅ Features
- Reactive sync from remote
- Optional pushUpdate to server
- Works on any nested path
- Supports both full-replace and updater modes


```ts
  import { syncPlugin, createStore } from 'statekit-lite';

  const store = createStore({ user: { name: '', age: 0 } }, {
    plugins: [
      syncPlugin({
        subscribe: (emit) => {
          const source = new EventSource('http://localhost:3000/events');
          source.onmessage = (e) => emit(JSON.parse(e.data));
          return () => source.close();
        },
        pushUpdate: (data) => {
          fetch('/update', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          });
        },
        debug: true,
      }),
    ]
  });
```

### or ssePlugin
Convenience wrapper around syncPlugin for Server-Sent Events (SSE).
Enable realtime updates from a server:
```ts
  import { createStore, ssePlugin } from 'statekit-lite';

  const store = createStore({
    messages: [] as string[],
  }, {
    plugins: [
      ssePlugin<string>({
        url: 'http://localhost:3000/events',
        path: ['messages'],
        mode: 'push',
        mapper: (data) => data.message
      })
    ]
  });

  // example component real time update SSE
  function Messages() {
    const list = store.messages.use();
    return <ul>{list.map((msg, i) => <li key={i}>{msg}</li>)}</ul>;
  }
```

```ts
  type SSEPluginOptions<T> = {
    url: string;                      // 🔌 URL SSE endpoint
    path?: (string | number)[];       // 🔑 (optional) Path inside store to update
    mapper?: (data: any) => T;        // 🧠 (optional) transform before storing
    mode?: 'set' | 'push';            // 🔁 (optional) 'set' (default) or 'push' to array (push mode is ideal for appending to arrays, set to override the target value)
  }

```

### 🔌 Realtime Server Example (Node.js + Express)
Below is a minimal SSE backend you can use to push real-time updates into statekit-lite.

#### 💡 → [Example of use](https://statekit-lite-production.up.railway.app/)   ←

```ts
  // server.ts
  import express from 'express';
  import cors from 'cors';

  const app = express();
  app.use(cors());
  app.use(express.json());

  let clients: Response[] = [];

  // SSE endpoint: clients connect here
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    console.log('👤 Client connected');

    req.on('close', () => {
      clients = clients.filter(c => c !== res);
      res.end();
      console.log('❌ Client disconnected');
    });
  });

  // Send an event to all clients
    app.post('/send', (req, res) => {
      const msg = req.body?.message ?? 'Пустое сообщение';
      const payload = JSON.stringify({ data: msg });
      
      for (const client of clients) {
          client.write(`data: ${payload}\n\n`);
      }

      res.sendStatus(200);
  });

  app.listen(3000, () => {
    console.log('🚀 SSE server running at http://localhost:3000/events');
  });
```

## 🗄️ supabase Plugin

A plugin that synchronizes your entire store with a Supabase table in key-value format.

Ideal for:

- Realtime collaboration
- Shared persistent state across clients
- Saving editor/project/user states per session or user ID


To use `supabasePlugin`, install Supabase client:
```bash
  npm install @supabase/supabase-js
```

#### ✅ Features
- Bidirectional sync with Supabase (`jsonb`)
- Works with any key and field (custom primary key supported)
- Realtime updates using `postgres_changes`
- Auto-insert on first load
- Full store hydration and push on change

#### 🧩 Table structure

```sql
create table kv_store (
  key text primary key,
  value jsonb,
  updated_at timestamp default now()
);
```
#### ⚠️ Enable Realtime in Supabase

To receive realtime updates from Supabase, you must **explicitly enable Realtime** for your table.

1. Go to your project in [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Table Editor → kv_store**
3. Click on the **Realtime** tab
4. Toggle the switch to **Enable Realtime**

Otherwise, `.on('postgres_changes', ...)` will not trigger any events.

#### 🔧 Usage
```ts
  import { createStore, supabasePlugin } from 'statekit-lite';

  const store = createStore({ count: 0 }, {
    plugins: [
      supabaseKVPlugin({
        url: 'https://your-project.supabase.co',
        anon_key: 'your-anon-key',
        table: 'kv_store',
        key: 'session-123',        // identifier of this row
        field: 'value',            // optional (default = 'value')
        primary_key: 'key',        // optional (default = 'key')
        debug: true,
        polling: 3000,             // ← (optional) fallback polling every 3s if Realtime is not working
      })
    ]
  });

```
This plugin automatically:
- Loads the initial state from Supabase
- Subscribes to realtime changes for the same key
- Pushes new state on every .set() or .update()

✅ Supports multi-user setups (just change the key value per user/project)

---

## 🧩 When to Use

- Global state in React SPA
- Forms, visual editors, configuration panels
- Embedded apps and UI libraries
- Minimal, fast alternative to Redux/Zustand
- Real-time dashboards, chats, logs (via SSE plugin)
- Server-driven UIs or status syncing
