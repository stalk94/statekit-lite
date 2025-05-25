import { defineConfig } from 'tsup';


export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
	//globalName: 'StateKitLite',
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
	//minify: true,
    outDir: 'dist',
    target: 'es2020',
	//noExternal: ['immer']
});