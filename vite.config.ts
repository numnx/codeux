import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  root: 'dashboard',
  base: './',
  build: {
    outDir: '../dist/dashboard',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
});
