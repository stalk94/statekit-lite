import React from 'react';
import { createRoot } from 'react-dom/client';
import { Updater, Display, MessagesList } from './App'


type TopBarProps = {
    setRenderMod: (mod: 'base'|'sse')=> void
    mod: 'base'|'sse'
}
function TopBar({ setRenderMod, mod }: TopBarProps) {
    const render =()=> {
        return(
            <div style={{display:'flex'}}>
                <button
                    onClick={()=> setRenderMod('base')}
                    style={{
                        background: mod === 'base' ? '#c5f467' : '#444',
                        color: mod === 'base' ? '#000' : '#c5f467',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginRight: 5,
                    }}
                >
                    base
                </button>
                <button
                    onClick={()=> setRenderMod('sse')}
                    style={{
                        background: mod === 'sse' ? '#c5f467' : '#444',
                        color: mod === 'sse' ? '#000' : '#edede4',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    sse-plugin
                </button>
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
    const [mod, setMod] = React.useState<'base'|'sse'>('base');

    const useRender =()=> {
        if(mod === 'base') return <Display />
        else if(mod === 'sse') return <MessagesList />
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