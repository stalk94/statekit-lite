import React from 'react';
import { createStore, supabasePlugin } from '../src/index';
import secret from './_core';


const store = createStore({count: 1, update: Date.now()}, {
    plugins: [
        supabasePlugin({
            url: secret.url,
            anon_key: secret.anon_key,
            table: 'kv_store',
            key: 'user-5421748935',
            debug: true,
            polling: 3000
        })
    ]
});


export default function() {
    
    return(
        <div style={{ marginTop: '80px'}}>
            <div style={{display: 'flex', flexDirection: 'column', margin: 'auto'}}>
                <div style={{display:'flex', margin: 'auto', padding: 'auto'}}>
                    <div style={{ color:'orange', fontSize:'20px' }}>
                        ALL COUNT CLICK:
                    </div>
                    <div style={{ color:'red', marginLeft: 10, fontWeight:'bold', fontSize:'20px' }}> 
                        { store.count.use() }
                    </div>
                </div>
                <button
                    onClick={()=> store.count.set((p)=> p + 1)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 4,
                        border: '1px solid #c5f467',
                        background: 'none',
                        color: '#c5f467',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        margin: 'auto',
                        marginTop: '16px'
                    }}
                >
                    + add your click
                </button>
            </div>
        </div>
    );
}