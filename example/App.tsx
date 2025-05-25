import React from 'react';
import { createStore } from '../src/index';


const userStore = createStore({
    user: {
        name: 'Anon',
        age: 25
    }
},{
    //persist: { key: 'user' },
    devtools: { name: "userStore" },
    immer: true
});



export function Display() {
    const user = userStore.user.use();

    return (
        <pre style={{ marginLeft: '35%', marginTop: '5%', fontSize: '24px', color: '#c5f467' }}>
            { JSON.stringify(user, null, 2) }
        </pre>
    );
}


export function Updater() {
    const ref = React.useRef<any>(null);

    const useMutNested =()=> {
        // 🔥 creates nested object structure
        if(!userStore.user?.test?.test?.get()) userStore.user.test.test.set(1); 
        // updates with function
        userStore.user.test.test.set(count => count + 1);
    }
    const useMutNestedArray = () => {
        // ⚡️ creates nested array structure
        if (userStore?.user?.arr?.[0]?.test.get()) {
            userStore?.user?.arr?.[0]?.test.set((p) => {
                console.log(p);
                return p + 1;
            });
        }
        else {
            userStore?.user?.arr?.[0]?.test.set(1);
        }
    }

    React.useEffect(() => {
        ref.current = setInterval(() => {
            userStore.user.age.set((prev)=> {
                prev++;
                return prev;
            });
            useMutNested();
            useMutNestedArray();
        }, 1000);


        return () => clearInterval(ref.current);
    }, []);

    return null;
}