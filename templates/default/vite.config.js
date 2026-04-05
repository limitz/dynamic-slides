import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// SKILL_DIR is set by the startup script to point to the dynamic-slides install
const skillDir = process.env.SKILL_DIR || resolve('..', '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@viewer': resolve(skillDir, 'slide-viewer', 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: ['.', resolve(skillDir)],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
