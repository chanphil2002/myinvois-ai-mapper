import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
