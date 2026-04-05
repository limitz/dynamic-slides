import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This config is only for developing the viewer itself.
// Presentations run from the project dir's own vite.config.js.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
