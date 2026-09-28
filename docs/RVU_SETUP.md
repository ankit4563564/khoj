# KHOJ for RV University

KHOJ is now a university-only lost-and-found application with the navigation and dark/light visual direction of the accessible Losify pages. Losify's authenticated dashboard and forms were not accessible during implementation; those screens implement the documented workflows rather than claiming pixel-exact parity.

## Run locally

Use Node.js 24 LTS (minimum 22.13 for built-in SQLite).

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100. `APP_URL` in `.env.local` must match the browser origin, including port. Restart the server after changing environment settings.

Create a student account using an `@rvu.edu.in` email. In development only, without a mail provider, the signup/forgot-password screen displays a clearly marked email preview link. Following the link and pressing Verify completes the local verification flow. Production never exposes verification or reset links in API responses.

No demo accounts, passwords or reports are added to the application database. Test data lives in a separate ignored `.test-data` directory.

## Features

- Student signup, email verification, password login, reset, and logout. Passwords use salted scrypt; sessions are server-side with hashed tokens and HttpOnly cookies.
- Exact `@rvu.edu.in` domain restriction. Other domains require an explicit `RVU_EMAIL_DOMAINS` change; subdomains are not implicitly allowed.
- Optional Google sign-in, restricted to provider-verified university email addresses. OAuth uses state and PKCE.
- Lost/found reports with date, location, school, category, colour, brand, optional photo, and private identifying details.
- Search, category/location filters, sorting, item details, report status, and in-app notifications (refreshed every 15 seconds while the tab is visible).
- Matching in either report order, using public metadata. Scores are detail-similarity suggestions, not visual recognition confidence or proof of ownership.
- Optional Gemini photo-to-details analysis. It runs only when the user explicitly chooses to send their uploaded image to Google; manual entry remains available.
- Private ownership claims, staff custody receipts, approve/reject decisions, and recorded physical handovers. Staff cannot approve or hand over their own claims or found reports.
- Claim approval requires staff custody. Handover requires an approved claim and updates both linked lost and found reports transactionally.
- Audit records, protected images, server-side permission checks, same-origin mutations, and persisted rate limits.

## Staff provisioning

Staff cannot self-register or upgrade themselves through the website. After opening the app once to initialise SQLite, an authorised operator provisions each verified staff member:

```powershell
$env:RVU_STAFF_PASSWORD = '<unique password of at least 12 characters>'
npm run staff -- staff@rvu.edu.in "Staff Name"
Remove-Item Env:RVU_STAFF_PASSWORD
```

This command refuses to overwrite or promote an existing account. Use only staff addresses whose identity and authorisation you have confirmed. Staff can use password reset through their university email after provisioning. For Google-created students, staff check the physical university ID at collection; Google does not provide a register number.

## Connect production services

Put server-only credentials in the hosting environment or ignored `.env.local`, never in client variables or source control.

1. Set `APP_URL` to the HTTPS site origin.
2. For university email verification and password resets, set `RESEND_API_KEY` and `EMAIL_FROM` to a verified sender. Without these, production password signup is intentionally unavailable.
3. For Google login, configure an OAuth web client, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Add `<APP_URL>/api/rvu/google` as its exact authorised redirect URI. The UI disables Google login until configured.
4. For optional photo analysis, set `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. The default model is `gemini-2.5-flash`. Photo analysis is separate from the deterministic matching algorithm.
5. Create staff accounts and confirm actual campus custody desks before student rollout. Locations are editable suggestions; the application does not assert that RVU has approved a particular desk or this service.

Service credentials were not supplied, so live email, Google OAuth and Gemini calls have not been verified against real accounts. Their configured integrations and failure states are implemented; the core flows were tested locally.

References: [Google OAuth](https://developers.google.com/identity/openid-connect/openid-connect), [Gemini image input](https://ai.google.dev/api/generate-content), [Resend send email API](https://resend.com/docs/api-reference/emails/send-email).

## Build and host

```powershell
npm run build
npm start -- --hostname 127.0.0.1 --port 3100
```

Deploy on a **single Node.js server with persistent disk**. Set `RVU_DB_PATH` to a private writable path on that disk. SQLite stores accounts, photos, reports, claims and logs together. Use an HTTPS reverse proxy and an appropriate request-body limit (6 MB). Do not deploy this SQLite setup onto ephemeral serverless storage or multiple replicas sharing an ordinary network file. Migration to a managed database/object store is required for those hosting models.

Back up the SQLite database using SQLite's online backup mechanism or while the app is stopped; do not copy a live main file without its WAL. The app does not automatically delete reports or audit records. Establish your retention process before campus rollout.

## Integration and UI validation

Start an isolated development server:

```powershell
$env:RVU_DB_PATH = "$PWD/.test-data/integration.sqlite"
$env:APP_URL = 'http://127.0.0.1:3101'
npm run dev -- --hostname 127.0.0.1 --port 3101
```

In another terminal, with the same `RVU_DB_PATH`:

```powershell
$env:RVU_DB_PATH = "$PWD/.test-data/integration.sqlite"
node tests/rvu-e2e.mjs http://127.0.0.1:3101
```

Tests create unique student/staff accounts in that isolated database and cover verification, domain checks, CSRF, matching in either order, privacy, claims, custody, transitions, audit, session revocation, and file access. The printed credentials are test-only. Do not point this test at the application database.

## Previous implementation

The old shared-identity demo API `/api/db` now returns 410. Previous route names redirect into the new workflows. `data/khoj_database.json` is preserved without importing its unverified demo identities. The pre-change source is saved in ignored `.local-backup/before-rvu/src`. Older V1.5 architecture documents describe that previous demo and are not the current security model.
