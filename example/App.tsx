import React from 'react';
import { createRoot } from 'react-dom/client';
import { createStore } from '../src/index';


const userStore = createStore({
    user: {
        name: 'Anon',
        age: 25
    }
},{
    persist: { 
        key: 'user'
    },
    devtools: { 
        name: "userStore" 
    }
});


function Display() {
    const user = userStore.user.use();


    return (
        <div style={{marginLeft: '45%', marginTop: '15%', fontSize:'24px', color: 'silver'}}>
            {  user.age }
        </div>
    );
}

function Updater() {
    React.useEffect(() => {
        const i = setInterval(() => {
            userStore.user.arr[1].set({t: 1})
            userStore.user.test.test.set({a: 1});
            
            userStore.user.age.set((age)=> age + 1);

            console.log(userStore.user.get())
        }, 1000);

        return () => clearInterval(i);
    }, []);

    return null;
}

// Root component
export function App() {
    return (
        <div>
            <Updater />
            <Display />
        </div>
    );
}


createRoot(document.querySelector(".root")).render(<App/>);