import React from 'react';
import { createStore, ssePlugin } from '../src/index';
const id = Date.now();

////////////////////////////////////////////////////////////////////////
let originalTitle = document.title;
let flashInterval: number | undefined;

function startFlashingTitle(msg: string = '🔔 Новое сообщение!') {
    if (flashInterval) return; // уже мигает

    let visible = true;
    flashInterval = window.setInterval(() => {
        document.title = visible ? msg : originalTitle;
        visible = !visible;
    }, 500);
}
function stopFlashingTitle() {
    if (flashInterval) {
        clearInterval(flashInterval);
        flashInterval = undefined;
        document.title = originalTitle;
    }
}
window.addEventListener('focus', stopFlashingTitle);
////////////////////////////////////////////////////////////////////////


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
const testSse = createStore({} as {data: string, clients: number}, {
    plugins: [
        ssePlugin<string>({
            url: 'http://localhost:3000/events'
        })
    ]
});


export function Display() {
    const user = userStore.user.use();

    return (
        <pre style={{ marginLeft: '35%', marginTop: '5%', fontSize: '24px', color: '#c5f467' }}>
            { JSON.stringify(user, null, 2) }
        </pre>
    );
}


function Sender() {
    const [text, setText] = React.useState('');

    const send = async () => {
        if (!text.trim()) return;
        await fetch('http://localhost:3000/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, id: id  }),
        });
        setText('');
    }

    return (
        <div style={{ margin: '20px 35%', display: 'flex', gap: 8 }}>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="message"
                style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #666',
                    background: '#222',
                    color: '#c5f467',
                }}
            />
            <button
                onClick={send}
                style={{
                    padding: '8px 16px',
                    borderRadius: 4,
                    background: '#c5f467',
                    color: '#222',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: 'none',
                }}
            >
                Отправить
            </button>
        </div>
    );
}
// test Sse plugin
export function MessagesList() {
    const sseStore = testSse.use();
    const [messages, setMessages] = React.useState([]);
    
  
    React.useEffect(() => {
        if(sseStore.data && sseStore.id !== id) {
            setMessages([...messages, sseStore.data]);
            startFlashingTitle();
        }
    }, [sseStore]);
   

    return (
        <div style={{ marginTop: '80px'}}>
            <div style={{display: 'flex', flexDirection: 'column', margin: 'auto'}}>
                <div style={{display: 'flex', margin: 'auto'}}>
                    🧩 SSE PLUGIN 
                    <div style={{color:'gold'}}> (open to new browser tab)</div>
                </div>
                <div style={{marginLeft: '35%', display: 'flex'}}>
                    <div style={{color: 'orange'}}>👤connected:</div> 
                    <div style={{margin: '3px', color: 'red'}}>
                        { testSse.clients.use() ?? 0 }
                    </div>
                </div>
                <ul style={{ color: '#c5f467', marginLeft: '35%' }}>
                    {messages.map((m, i) => (
                        <li key={i}>
                            { m }
                        </li>
                    ))}
                </ul>
                <Sender />
            </div>
        </div>
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