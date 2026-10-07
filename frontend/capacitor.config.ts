import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mytax.app',
  appName: 'MyTax',
  // The web build output that gets bundled into the native app.
  webDir: 'dist',

  // DEV convenience: load the live Vite dev server over your LAN so the app hot-reloads on save,
  // and the API (client.ts uses window.location.hostname:8080) resolves to your Mac automatically.
  // Update the IP to your Mac's current LAN address (ipconfig getifaddr en0), and make sure the
  // backend + `npm run dev -- --host` are running. cleartext allows http:// (iOS blocks it otherwise).
  //
  // For a PRODUCTION / App Store build: remove this `server` block (so the bundled `dist` is used),
  // and build the web app with VITE_API_BASE_URL pointing at your deployed backend, e.g.
  //   VITE_API_BASE_URL=https://api.yourdomain.com npm run build
  server: {
    url: 'http://192.168.1.14:5173',
    cleartext: true,
  },
};

export default config;
