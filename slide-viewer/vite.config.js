import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const projectDir = process.env.SLIDES_PROJECT_DIR || process.cwd();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@project': resolve(projectDir),
    },
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: ['.', resolve(projectDir)],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/assets': { target: 'http://localhost:3001' },
    },
  },
});
