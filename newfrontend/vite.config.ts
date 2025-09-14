// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.svg'],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: ['0ggalileoexplorer.coinsspor.com'],
    hmr: {
      protocol: 'ws',
      host: '0ggalileoexplorer.coinsspor.com',
      port: 5174,
      overlay: false,
    },
    proxy: {
      '/api/v2/uptime': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      '/api/v2': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      '/api/transaction': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      '/api/tokens': {
        target: 'http://localhost:3101',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});