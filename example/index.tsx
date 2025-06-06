import React from 'react';
import { createRoot } from 'react-dom/client';
import { Updater, Display, MessagesList, MessagesListWs } from './App'
import Spb from './Supabase';


type TopBarProps = {
    setRenderMod: (mod: 'base'|'sse')=> void
    mod: 'base'|'sse'
}
function TopBar({ setRenderMod, mod }: TopBarProps) {
    const data = [
        {title: 'base', value: 'base'},
        {title: 'supabase-plugin', value: 'spb'},
        {title: 'sync-plugin', value: 'ws'},
        {title: 'sse-plugin', value: 'sse'}
    ];

    const render =()=> {
        return(
            <div style={{display:'flex'}}>
                {data.map((elem, index)=> 
                    <button
                        key={index}
                        onClick={() => setRenderMod(elem.value)}
                        style={{
                            background: mod === elem.value ? '#c5f467' : '#444',
                            color: mod === elem.value ? '#000' : '#edede4',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginRight: 8,
                        }}
                    >
                        { elem.title }
                    </button>
                )}
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '15px 20px',
            background: '#222',
            color: '#c5f467',
            fontSize: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}>
            <span>⚙️ StateKit Demo</span>
            <div style={{right: 0}}>
                { render() }
            </div>
        </div>
    );
}


// Root component
export function App() {
    const [mod, setMod] = React.useState<'base'|'ws'|'sse'>('base');

    const useRender =()=> {
        if(mod === 'base') return <Display />
        else if(mod === 'sse') return <MessagesList />
        else if(mod === 'ws') return <MessagesListWs />
        else if(mod === 'spb') return <Spb />
    }


    return (
        <div>
            <TopBar
                mod={mod}
                setRenderMod={setMod}
            />
            <Updater />
            { useRender() }
        </div>
    );
}


createRoot(document.querySelector(".root")).render(<App/>);