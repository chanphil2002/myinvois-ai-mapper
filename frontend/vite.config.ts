import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates don't force phones to re-download React/antd.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd'],
          icons: ['@ant-design/icons'],
          data: ['@tanstack/react-query', 'axios', 'dayjs'],
        },
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
    // Accept requests whose Host header is an external tunnel domain (e.g. Cloudflare Tunnel),
    // so the app can be opened remotely on a phone. Harmless for local/LAN use.
    allowedHosts: true,
    // Proxy API calls to the backend so the frontend and API share one origin. This lets a single
    // tunnel serve the whole app (no CORS, no second tunnel) and makes the client use relative
    // /api paths (see .env.local: VITE_API_BASE_URL is empty).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
