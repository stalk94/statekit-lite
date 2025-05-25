import React from 'react';
import { createRoot } from 'react-dom/client';
import { Updater, Display } from './App'



function TopBar() {
    const [enabled, setEnabled] = React.useState(false);

    const toggle = () => {
        const next = !enabled;
        setEnabled(next);
        onTogglePersist(next);
    }
    const render =()=> {
        return(
            <button
                onClick={toggle}
                style={{
                    background: enabled ? '#c5f467' : '#444',
                    color: enabled ? '#000' : '#c5f467',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                }}
            >
                Persist: {enabled ? 'ON' : 'OFF'}
            </button>
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
        </div>
    );
}


// Root component
export function App() {
    const [_, forceUpdate] = React.useReducer(v => v + 1, 0);


    return (
        <div>
            <TopBar />
            <Updater />
            <Display />
        </div>
    );
}


createRoot(document.querySelector(".root")).render(<App/>);