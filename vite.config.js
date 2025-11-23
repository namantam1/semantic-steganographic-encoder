import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  base: '/wasm-explorer/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
