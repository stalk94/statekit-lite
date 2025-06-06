import React, { useState } from 'react';
import { userStore } from './App'; // импортируй как у тебя



function parsePath(path: string): (string | number)[] {
    const parts: (string | number)[] = [];

    path.split('.').forEach(segment => {
        const regex = /([^\[\]]+)|\[(\d+)\]/g;
        let match;
        while ((match = regex.exec(segment)) !== null) {
            if (match[1] !== undefined) {
                parts.push(match[1]);
            } else if (match[2] !== undefined) {
                parts.push(Number(match[2]));
            }
        }
    });

    return parts;
}


export function DynamicSetter() {
    const [path, setPath] = useState('');
    const [value, setValue] = useState('');

    const parseValue = (val: string) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(Number(val))) return Number(val);
        try {
            return JSON.parse(val);
        }
        catch {
            return val;
        }
    }
    const handleSet = () => {
        if (!path.trim()) return;

        const keys = parsePath(path);
        const val = parseValue(value);

        userStore.user.set((prev) => {
            let target: any = prev;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const nextKey = keys[i + 1];

                const isNextIndex = typeof nextKey === 'number';

                if (!(key in target)) {
                    target[key] = isNextIndex ? [] : {};
                }

                // преобразуем массив, если он оказался объектом
                if (isNextIndex && !Array.isArray(target[key])) {
                    target[key] = [];
                }

                target = target[key];
            }

            const lastKey = keys.at(-1)!;
            target[lastKey] = val;
            return prev;
        });
    }

    const examples = [
        'test.deep.value',
        'meta.status.online',
        'arr.[0].score',
    ];

    return (
        <div style={{ maxWidth: 800, margin: '24px auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {examples.map((example) => (
                    <span className='btn_n'
                        key={example}
                        onClick={() => setPath(example)}
                        style={{
                            padding: '4px 8px',
                            background: '#444',
                            border: '1px solid gray',
                            color: '#aef57bd0',
                            borderRadius: '12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        {example}
                    </span>
                ))}
            </div>

            <input
                placeholder="Path (e.g. test.deep.value)"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                style={input}
            />
            <input
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={input}
            />
            <button className='btn_n' onClick={handleSet} style={btn}>Set nested</button>
        </div>
    );
}


export default function UserControls() {
    const name = userStore.user.name.use();

    const setName = (e: React.ChangeEvent<HTMLInputElement>) => {
        userStore.user.name.set(e.target.value);
    }
    const incrementAge = () => {
        userStore.user.age.set(age => age + 1);
    }


    return (
        <div style={{border: '1px solid #22222263', padding: 12, marginTop:'10%', background:'#2222224b'}}>
            <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Enter your name"
                    style={{ padding: '8px', borderRadius: '4px', background: '#222', color: '#c5f467', border: '1px solid #555' }}
                />

                <button className='btn_n' onClick={incrementAge} style={btn}>Age +1</button>
            </div>
            <div style={{borderBottom: '1px dotted #22222263', marginTop: '24px'}}></div>
            <DynamicSetter />
        </div>
    );
}



const btn = {
    padding: '8px 12px',
    border: '1px solid #c5f467',
    background: 'none',
    fontWeight: 'bold',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#c5f467'
} as React.CSSProperties;

const input: React.CSSProperties = {
  padding: '8px',
  background: '#222',
  color: '#c5f467',
  border: '1px solid #555',
  borderRadius: 4
}