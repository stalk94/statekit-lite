# 🧠 statekit-lite

A minimal global state manager for React  

- 🔥 has no dependencies (except immer)
- ⚛️ Fully typed reactive access 
- 🔁 `.get()`, `.set()`, `.use()` and `.watch()` on any nested path  
- 📦 Redux DevTools compatible 


## ✨ Key Features

- 🔥 **Proxy-based access with automatic nested structure creation**
- 🔥 **Typed access and reactivity with `.get()` / `.set()` / `.use()`**
- 📝 **Watch outside React with `.watch(fn)`**
- 💾 **Persist to localStorage**
- ⚛️ **Redux DevTools integration**
- ✨ **SSR-safe by design**



## 📦 Installation

```bash
# Using npm
npm install statekit-lite

# Using yarn
yarn add statekit-lite

# Using pnpm
pnpm add statekit-lite
```


## 🚀 Features

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


---

## 🧩 When to Use

- Global state in React SPA
- Forms, visual editors, configuration schemas
- Embedded apps and libraries
- Forms and config panels
- Minimal, fast global state


→ And view updates in [Redux DevTools Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)