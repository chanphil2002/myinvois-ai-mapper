# AI MyInvois Mapper

An AI-assisted tool for Malaysian SMEs to map sales documents (spreadsheets, receipts, scanned
invoices) into LHDN MyInvois e-Invoice submissions: upload a file, review the AI-mapped fields,
confirm, and submit via the MyInvois API.

This is a **walking skeleton**: auth, upload, and the MyInvois API client are fully wired;
AI mapping and MyInvois submission need real credentials (Anthropic + LHDN sandbox) to exercise
end-to-end. See "Known limitations" below.

## Structure

- `backend/` — Spring Boot 3 (Java 21) REST API, MySQL via Flyway
- `frontend/` — React 18 + TypeScript + Vite + Ant Design SPA
- `LHDN MyInvois SDK.postman_collection.json` — reference collection the MyInvois client code
  was built against

## Running the backend

Requires Java 21 and Maven (on this machine both were installed via `brew install openjdk@21 maven`;
Homebrew's `openjdk@21` is keg-only, so if `java -version` still shows an older JDK, either run
`export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home` first or symlink
it system-wide per the `brew info openjdk@21` caveats).

You also need a running MySQL 8 instance with a `mytax_mapper` database:

```sql
CREATE DATABASE mytax_mapper;
CREATE USER 'mytax'@'localhost' IDENTIFIED BY 'mytax';
GRANT ALL PRIVILEGES ON mytax_mapper.* TO 'mytax'@'localhost';
```

Then, from `backend/`:

```bash
cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml
# edit application-local.yml, or just export the env vars it lists

mvn spring-boot:run
```

Flyway applies `V1__init_schema.sql` automatically on startup. Swagger UI is at
`http://localhost:8080/swagger-ui.html`.

Required environment variables (see `application.yml` for defaults):

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` — any long random string
- `MYINVOIS_ENCRYPTION_KEY` — any long random string (used to encrypt stored client secrets)
- `ANTHROPIC_API_KEY` — required for the AI mapping step to work
- `MYINVOIS_ID_SERVER_BASE_URL` / `MYINVOIS_API_BASE_URL` — default to LHDN's preprod (sandbox)
  endpoints; switch to production URLs only once you have production LHDN credentials

`mvn compile` and `mvn package` have been verified to succeed on this machine. Booting against a
real MySQL instance has **not** been verified here (no local MySQL/Docker available in this
environment) — do that as your first step.

## Running the frontend

```bash
cd frontend
npm install
cp .env.example .env   # points at http://localhost:8080 by default
npm run dev
```

Opens on `http://localhost:5173`. `npm run build` (tsc + vite build) has been verified to succeed.

## Getting real credentials wired up

1. **Anthropic API key** — sign up at console.anthropic.com, set `ANTHROPIC_API_KEY`. Without this,
   the "Run AI mapping" step will fail with an auth error from Claude's API.
2. **LHDN MyInvois sandbox credentials** — register for MyInvois SDK sandbox access via LHDN's
   MyInvois portal, get a `client_id`/`client_secret`, then enter them in the app's Settings page
   (stored AES-encrypted per user). The default `MYINVOIS_*_BASE_URL` values point at LHDN's
   preprod environment.

## Known limitations (by design, for this first pass)

- **UBL document format**: `UblDocumentBuilder` (`backend/src/main/java/com/mytax/mapper/invoice/UblDocumentBuilder.java`)
  emits a simplified JSON approximation of the invoice, not the full LHDN UBL 2.1 JSON schema
  (digital signatures, full party/address structures, tax scheme codes, etc.). Replace this before
  submitting anything beyond sandbox smoke-testing.
- **Document type support**: the AI mapping engine (`ClaudeMappingService`) handles `.xlsx`, `.pdf`,
  and common image formats. `.doc`/`.docx` is not implemented — convert to PDF first, or add a
  parser (e.g. Apache POI's `XWPFDocument`) if needed.
- **No submission status polling job** — refreshing a submission's status is a manual button in
  the UI (`POST /api/submissions/{id}/refresh`), not a background scheduler.
- **WhatsApp bot channel** — deferred per the original spec (marked optional). The mapping and
  submission logic lives in plain services (`MappingService`, `SubmissionService`) specifically so
  a WhatsApp webhook controller can call into them later without duplicating logic.
- **No automated tests** — out of scope for this scaffolding pass.
