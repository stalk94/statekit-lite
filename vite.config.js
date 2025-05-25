import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
    root: 'example/',
    publicDir: '../public',
    plugins: [react()],
    resolve: {
        alias: {
            'statekit-lite': path.resolve(__dirname, './src'),
        }
    },
    build: {
        outDir: '../build',
        emptyOutDir: true,
    },
    test: {
        include: ['../test/**/*.test.ts'],
        globals: true,
        environment: 'jsdom',
    }
});