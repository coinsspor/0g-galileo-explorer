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
      // ?? API v2 - Blockchain Stats (port 3002) - öncelikli
      '/api/v2': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // ?? API v1 - Validator API (port 3001) - DEFAULT
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});
