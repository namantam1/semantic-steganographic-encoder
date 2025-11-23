import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/semantic-steganographic-encoder/',
  root: 'public',
  publicDir: false, // Don't copy public dir to avoid duplicates
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        visualizer: resolve(__dirname, 'public/visualizer.html'),
      },
    },
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
});
