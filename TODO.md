# MyTax — To-do checklist

Outstanding setup + polish tasks. Check items off as you go.

---

- [ ] ## 1. Beautify the frontend design
  Polish the UI (spacing, colors, typography, empty states, mobile layout).
  Ideas to consider:
  - A consistent brand color + logo in the sidebar header (currently plain text "AI MyInvois Mapper").
  - Nicer Dashboard stat cards (icons, trend hints) and empty states.
  - Tighten form spacing on Create / Mapping Review pages.
  - A light/dark theme toggle (antd `ConfigProvider` already themes via `colorPrimary`).
  - App icon + splash screen for the iOS build.

  _Ask Claude to do any of these — e.g. "give the dashboard a cleaner look"._

---

- [ ] ## 2. Set up Billplz API key (enable payments)
  1. Log in to your Billplz account → **Settings** → copy your **Secret Key** (API key),
     **X Signature Key**, and create/choose a **Collection** → copy its **Collection ID**.
     (Use a **sandbox** account first: https://www.billplz-sandbox.com)
  2. Edit `backend/src/main/resources/application-local.yml` — **uncomment** the `billplz:` block
     and fill in the three values:
     ```yaml
       billplz:
         api-key: YOUR_BILLPLZ_API_KEY
         x-signature-key: YOUR_BILLPLZ_X_SIGNATURE_KEY
         collection-id: YOUR_BILLPLZ_COLLECTION_ID
         base-url: https://www.billplz-sandbox.com/api/v3   # prod: https://www.billplz.com/api/v3
     ```
  3. Restart the backend. Subscribe on the **Billing** page → you'll be redirected to Billplz to pay.
  4. For payment confirmation to activate the plan, Billplz must reach the callback URL. On localhost
     use a tunnel (e.g. ngrok/cloudflared) and set `callback-url` to `https://<tunnel>/api/billing/callback`.
     In production it's just your real domain.

---

- [ ] ## 3. Set up Gemini Flash API key (enable AI mapping — for testing)
  1. Get a free key at https://aistudio.google.com/apikey
  2. Edit `backend/src/main/resources/application-local.yml` — replace the placeholder:
     ```yaml
       gemini:
         api-key: YOUR_GEMINI_API_KEY
         model: gemini-3.5-flash
     ```
     (Engine is already set to `gemini`. If `gemini-3.5-flash` errors, try `gemini-2.5-flash`.)
  3. Restart the backend. Upload a document → **Run AI mapping** should now work.
  4. Until then, **manual key-in works with no AI key**.

---

- [ ] ## 4. Install Xcode (build the iOS app)
  1. Install **Xcode** from the Mac App Store (large download, ~7GB+).
  2. Point the toolchain at it:
     ```bash
     sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
     xcodebuild -version   # confirm
     ```
  3. Build + open the iOS app (Capacitor is already set up):
     ```bash
     cd frontend
     npm run ios:sync      # build web + sync into the native project
     npm run ios:open      # opens ios/App in Xcode
     ```
  4. In Xcode pick an iPhone simulator (or your device) and press ▶ Run.
     (Full details + App Store steps: `frontend/MOBILE.md`.)

---

_Tip: ask Claude to tackle any item — e.g. "do item 1", "set up Billplz with these keys" (paste only
test keys in chat; real secrets go straight into the gitignored `application-local.yml`)._
