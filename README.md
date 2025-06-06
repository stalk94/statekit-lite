# 🧠 statekit-lite

A minimal global state manager for React  

- 🔥 has no dependencies (except immer)
- ⚛️ Fully typed reactive access 
- 🔁 `.get()`, `.set()`, `.use()` and `.watch()` on any nested path  
- 📦 Redux DevTools compatible 
- 🌐 Realtime support with SSE plugin


## ✨ Key Features

- 🔥 **Proxy-based access with automatic nested structure creation**
- 🔥 **Typed access and reactivity with `.get()` / `.set()` / `.use()`**
- 📝 **Watch outside React with `.watch(fn)`**
- 💾 **Persist to localStorage**
- ⚛️ **Redux DevTools integration**
- ✨ **SSR-safe by design**
- 🌐 **Realtime updates via ssePlugin()**


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

## 🧩 Plugins Support (SSE Example)

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
### 🧠 Plugin: ssePlugin(options)
- `url`: Server-Sent Events endpoint
- `path`: Where in the store to apply incoming data
- `mode`: 'set' (default) replaces the value, 'push' adds to array
- `mapper`: Optional function to transform data before applying

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

#### 💡 → [Example of use](statekit-lite-production.up.railway.app/)   ←

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

---

## 🧩 When to Use

- Global state in React SPA
- Forms, visual editors, configuration panels
- Embedded apps and UI libraries
- Minimal, fast alternative to Redux/Zustand
- Real-time dashboards, chats, logs (via SSE plugin)
- Server-driven UIs or status syncing
