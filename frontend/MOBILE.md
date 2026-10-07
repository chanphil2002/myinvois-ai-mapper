# MyTax — iOS app (Capacitor)

The iOS app wraps the existing React web app with [Capacitor](https://capacitorjs.com). There's no
separate codebase — the same `src/` runs inside a native iOS WebView, so every web change flows to
the app via a rebuild/sync.

## One-time prerequisites (on your Mac)

1. **Xcode** — install from the Mac App Store (large download). Then point the toolchain at it:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcodebuild -version   # confirm it works
   ```
   (CocoaPods is **not** required — Capacitor 8 uses Swift Package Manager.)
2. In Xcode → Settings → Accounts, add your Apple ID (needed to run on a real device / submit).

## Run it

The app talks to the backend over your LAN in dev. The dev server URL + API host are configured in
[`capacitor.config.ts`](./capacitor.config.ts) — update the IP there to your Mac's current address
(`ipconfig getifaddr en0`) if it changed.

```bash
# 1. Start the backend (port 8080) and the web dev server with --host, from the repo root:
#    (these are the existing backend-dev / frontend-dev tasks)

# 2. From frontend/, sync the web build into the native project and open Xcode:
cd frontend
npm run ios:sync      # = vite build + cap sync ios
npm run ios:open      # opens ios/App in Xcode

# 3. In Xcode: pick an iPhone simulator (or your device), press ▶ Run.
```

Because `capacitor.config.ts` points `server.url` at the Vite dev server, the app hot-reloads on
save and the API resolves to your Mac automatically. `Info.plist` has a **dev-only** ATS exception
(`NSAllowsArbitraryLoads`) so cleartext HTTP to the LAN backend is allowed.

## Production / App Store build

1. In `capacitor.config.ts`, **remove the `server` block** so the bundled `dist` is used.
2. Build the web app pointed at your deployed backend:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com npm run build
   npx cap sync ios
   ```
3. In `Info.plist`, remove `NSAllowsArbitraryLoads` (serve the backend over HTTPS, or scope an
   exception to your domain under `NSExceptionDomains`).
4. Set a real bundle identifier + your Apple Developer team in Xcode (Signing & Capabilities),
   then Product → Archive → distribute to the App Store / TestFlight.

## Useful scripts (in `package.json`)

| Script | What it does |
|---|---|
| `npm run ios:add` | Add the iOS platform (already done once) |
| `npm run ios:sync` | Rebuild the web app and copy it into the native project |
| `npm run ios:open` | Open the native project in Xcode |

## Android (later)

Same approach: `npm i -D @capacitor/android && npx cap add android && npx cap open android`
(requires Android Studio).
