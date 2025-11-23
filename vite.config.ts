import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/semantic-steganographic-encoder/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        visualizer: resolve(__dirname, 'public/visualizer.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
