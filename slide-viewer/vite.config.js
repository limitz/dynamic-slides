import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This config is only used if the viewer is run directly (development/testing).
// In production, the project dir's vite.config.js is the entry point.
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
