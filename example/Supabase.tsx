import React from 'react';
import { createStore, supabasePlugin } from '../src/index';


const store = createStore({count: 1, update: Date.now()}, {
    plugins: [
        supabasePlugin({
            url: 'https://bhgrcocadwsejwodvzql.supabase.co',
            anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3Jjb2NhZHdzZWp3b2R2enFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzY5NTksImV4cCI6MjA2NDIxMjk1OX0.ijFGDKECfWYBULzTDUtIJMFaAJN1N-70ygQSzMONQIg',
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
                    <div style={{ color:'orange' }}>
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
                        marginTop: '10px'
                    }}
                >
                    + add your click
                </button>
            </div>
        </div>
    );
}