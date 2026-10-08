import type { CapacitorConfig } from '@capacitor/cli';

// By default the app is a STANDALONE native build: the web UI in `dist` is bundled into the .app
// and served locally by Capacitor (capacitor://localhost) — no dev server, runs fully on-device.
//
// For DEV hot-reload instead, point the native WebView at your live Vite dev server by setting
// CAP_DEV_URL before syncing, e.g.:
//   CAP_DEV_URL=http://192.168.1.14:5173 npm run ios:dev
// (find your Mac's IP with `ipconfig getifaddr en0`, and run `npm run dev -- --host` + the backend).
const devUrl = process.env.CAP_DEV_URL;

const config: CapacitorConfig = {
  appId: 'com.mytax.app',
  appName: 'MyTax',
  webDir: 'dist',
  ...(devUrl
    ? { server: { url: devUrl, cleartext: true } }
    : {}),
};

export default config;
