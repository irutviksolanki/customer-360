# Customer360 by Welspun GCC — complete application guide

Customer360 is a customer relationship and feedback workspace for web, iOS, and Android. It combines an Expo/React Native frontend, Python FastAPI backend, and PostgreSQL database.

## What the app does

1. Register or sign in with email and password.
2. View customers, interactions, open commitments, and sentiment on the dashboard.
3. Create customer profiles and maintain stakeholders.
4. Capture meeting details, feedback, sentiment, and follow-up actions. Save drafts or submit interactions.
5. Track action progress, deadlines, evidence, closure notes, and customer confirmation.
6. Review customer timelines, insights, and in-app notifications.
7. Export pre-meeting briefs and update personal profile details from the avatar menu.
8. Select Light, Dark, or System appearance from the workspace sidebar. On mobile, open the hamburger menu.

The login design is adapted from the supplied Sites ZIP. Company SSO and Microsoft Entra ID are not connected; their controls explain the setup requirement. Password-reset email delivery is not implemented. The original ZIP's preview credentials do not create an account in this database.

Records are private to each account. Owner labels and the administration screen do not grant access to another account's records. Notifications are generated within the app; no email/push delivery worker is configured.

## Stack and architecture

The project targets Expo SDK 58, React Native 0.88, React 19.3, and TypeScript. Exact dependency versions are recorded in package-lock.json.

```text
Web / iOS / Android UI
  -> shared SessionClient attaches JWT and X-Request-ID
  -> FastAPI validates JWT and revocable database session
  -> transaction sets app.user_id to authenticated account UUID
  -> PostgreSQL enforces ownership policies
  -> API responds; UI updates or reloads workspace state
```

### Frontend

- Root App.tsx loads bundled Poppins fonts, restores sessions, and shows login or the workspace.
- src/LoginScreen.tsx contains the responsive login/register design.
- src/App.tsx contains dashboard pages, customer timelines, meeting forms, action tracker, sidebar, and mobile navigation. Navigation uses React state rather than separate URL routes.
- src/api.ts configures the API origin and endpoint helpers.
- src/sessionClient.ts handles authenticated requests, persistence, expiry, mobile renewal, logout, and sanitized request diagnostics.
- Platform-specific .native files implement SecureStore, native SVG icons, file selection, downloads, and sharing. Browser equivalents use web APIs.
- Theme tokens provide consistent light/dark colors. Poppins is bundled; no external font request is required.
- Mobile navigation uses safe-area insets and src/mobileLayout.ts.

### Backend

backend/main.py creates FastAPI and configures authentication, CORS, diagnostics, and core routes. backend/sites_ui.py maps the imported workspace UI to the actual database. Profiles and sessions have separate modules.

Psycopg connection contexts commit successful operations and roll back failures. Owner context is transaction-local, so one user's identity should not leak into a later transaction.

| Endpoint | Purpose |
| --- | --- |
| POST /auth/register, POST /auth/login | Create an account/session or log in |
| GET /auth/me | Restore authenticated identity |
| POST /auth/refresh | Renew mobile access |
| POST /auth/logout | Revoke current device session |
| GET /api/state | Load workspace records and derived state |
| POST /api/customers, POST /api/stakeholders | Customer/stakeholder changes |
| POST /api/interactions | Save a draft or submitted interaction |
| POST /api/actions, POST /api/actions/{id} | Create/update commitments |
| POST /api/evidence, GET /api/evidence/{id} | Owner-protected uploads/downloads |
| GET /profile, PATCH /profile | Current user's profile |
| GET /health | Health response |
| GET /docs, GET /openapi.json | Swagger UI and API schema |

Swagger: http://localhost:8000/docs. Log in/register there, copy the returned token, click Authorize, and paste it without the Bearer prefix. Do not share tokens in screenshots. A health response alone does not verify database connectivity: also test login and a customer read/write.

### Authentication

Passwords use Argon2 hashing. JWTs are signed with JWT_SECRET and checked against revocable sessions.

| Platform | Lifetime | Storage |
| --- | --- | --- |
| Web | One hour from sign-in; refresh does not extend it | Browser localStorage |
| Mobile | Short-lived access token renews using a non-expiring device session until logout/revocation | Expo SecureStore |

Mobile login still depends on device storage and server session validity. Clearing app data, removing credentials, or server revocation can require login again. Browser localStorage requires protecting the application against XSS. Use HTTPS for hosted deployments.

Current authentication requires no OAuth callback URLs. Adding real SSO later requires provider configuration and callback implementation.

## Project structure

```text
gcc360-app/
├── App.tsx                         Fonts, session restoration, root screen
├── app.json                        Expo metadata and plugins
├── package.json / package-lock.json
├── .env.example                    Configuration template
├── src/
│   ├── App.tsx                     Authenticated workspace
│   ├── LoginScreen.tsx             Login/register screen
│   ├── ProfileScreen.tsx           Profile form
│   ├── api.ts                      API configuration/helpers
│   ├── sessionClient.ts            JWT requests, renewal, diagnostics
│   ├── sessionStorage.ts           Web session storage
│   ├── sessionStorage.native.ts    SecureStore session storage
│   ├── theme.tsx / themePalette.ts Theme provider/colors
│   ├── themeStorage*.ts            Appearance persistence
│   ├── AppearanceControl.tsx       Sidebar theme selector
│   ├── typography.tsx              Shared Poppins text/input
│   ├── Icon*.tsx                   Web/native Lucide icons
│   ├── files*.ts                   Web/native files and sharing
│   ├── mobileLayout.ts             Bottom navigation spacing
│   ├── data.ts                     Initial UI state/date helpers
│   └── web.css                     Browser styles
├── backend/
│   ├── main.py                     FastAPI app/auth/core routes
│   ├── sites_ui.py                 Workspace API adapter
│   ├── profiles.py / sessions.py
│   ├── diagnostics.py              Safe JSON logging
│   ├── requirements.txt
│   ├── migrations/                 Versioned SQL migrations
│   ├── seed_demo.py                Fictional sample records
│   └── test_*.py                   Backend tests
├── tests/*.test.mjs                Frontend behavior tests
├── api/index.py                    Vercel ASGI entrypoint
├── requirements.txt                Vercel Python requirements entrypoint
├── vercel.json / .vercelignore
├── DEPLOYMENT.md                   Short deployment checklist
└── .local/logs/api.log              Generated local logs
```

node_modules, .venv, .expo, dist, and .local are generated directories. This checkout may not yet be a Git repository; no GitHub remote is assumed.

## Requirements and environment

Install Node 22.13+ on the Node 22 line, Python 3.12+, PostgreSQL with psql, and compatible Expo Go for SDK 58. Android emulation requires Android Studio. iOS simulation requires macOS and full Xcode with an installed iOS runtime.

On a new setup, copy .env.example to .env. Preserve an existing working .env.

| Variable | Secret? | Purpose |
| --- | --- | --- |
| DATABASE_URL | Yes | PostgreSQL runtime URL. URL-encode password special characters; use TLS in cloud. |
| JWT_SECRET | Yes | Random secret of at least 32 characters; keep stable across deployments. |
| WEB_ORIGIN | No | Additional exact browser origins, comma-separated; include scheme/port, omit trailing slash. |
| EXPO_PUBLIC_API_URL | Public | Local/mobile backend origin. Leave unset on Vercel web to use its own domain. |
| EXPO_PUBLIC_API_DEBUG | Public | Set false to disable client API diagnostics. |
| API_LOG_LEVEL | No | Backend log level; normally INFO. |

Never put database passwords or signing secrets into EXPO_PUBLIC_ variables: they are embedded in the frontend bundle. Generate JWT_SECRET with a cryptographic random generator into your local editor/secret manager; do not post it in chat.

Changing backend variables requires restarting FastAPI. Changing public Expo variables requires restarting Metro or rebuilding a deployed bundle. App name is configured in app.json; legacy APP_NAME/APP_ENV variables do not rename the native application.

## PostgreSQL setup and migrations

### Create a new local database

Skip creation if your development database/role already exist. Connect with your PostgreSQL administrator account:

```sh
psql -h localhost -p 5432 -U YOUR_ADMIN_USER -d postgres
```

Run in psql. The password command prompts without putting a password into shell history:

```sql
CREATE ROLE gcc360 LOGIN NOSUPERUSER NOBYPASSRLS;
\password gcc360
CREATE DATABASE gcc360 OWNER gcc360;
\connect gcc360
GRANT USAGE, CREATE ON SCHEMA public TO gcc360;
\quit
```

Set DATABASE_URL in .env to this role/database.

### Apply SQL versions

| File | Changes |
| --- | --- |
| 001_initial.sql | Users, customers, meetings, actions, indexes, constraints, ownership RLS |
| 002_sites_ui.sql | UI JSON metadata, workspace events, evidence storage |
| 003_sessions.sql | Revocable web/mobile sessions |
| 004_profiles.sql | Personal/professional profile metadata |

For a fresh database, run from the project root:

```sh
psql -h localhost -p 5432 -U gcc360 -d gcc360 -v ON_ERROR_STOP=1 --single-transaction -f backend/migrations/001_initial.sql
psql -h localhost -p 5432 -U gcc360 -d gcc360 -v ON_ERROR_STOP=1 --single-transaction -f backend/migrations/002_sites_ui.sql
psql -h localhost -p 5432 -U gcc360 -d gcc360 -v ON_ERROR_STOP=1 --single-transaction -f backend/migrations/003_sessions.sql
psql -h localhost -p 5432 -U gcc360 -d gcc360 -v ON_ERROR_STOP=1 --single-transaction -f backend/migrations/004_profiles.sql
```

These commands also work in PowerShell when psql is on PATH. Migrations are applied manually; there is no automatic migration ledger. Apply each once. Existing databases need inspection and only missing versions. Back up data first; several migration statements are not idempotent.

Customer-owned records, events, evidence, sessions, and profile metadata have forced owner-based RLS. The runtime role must have neither SUPERUSER nor BYPASSRLS. The users account table itself is accessed through authentication/profile code and does not have those ownership policies. Owner names do not change permissions.

### View records in pgAdmin

Connect to the same database as DATABASE_URL. Navigate to Databases → gcc360 → Schemas → public → Tables. Customer reviews are meeting/interaction records, not a separate reviews table. Additional UI fields are in JSON metadata from migration 002.

With a restricted database role, RLS may show no rows until context is set:

```sql
BEGIN;
SELECT set_config('app.user_id', 'REPLACE_WITH_YOUR_APP_ACCOUNT_UUID', true);
SELECT * FROM customers;
SELECT * FROM meetings ORDER BY meeting_date DESC;
SELECT * FROM actions ORDER BY due_date;
ROLLBACK;
```

Use your registered account UUID. Do not disable RLS just to inspect data. Elevated database administrators can see more than an app account.

## Run locally on macOS

One-time dependency installation from the project root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm ci
```

Create/configure .env and apply migrations if needed. Start two terminals:

Terminal 1 — backend:

```sh
.venv/bin/python -m uvicorn backend.main:app --reload --reload-dir backend --host 0.0.0.0 --port 8000 --no-access-log
```

Terminal 2 — frontend:

```sh
npm start -- --localhost --port 8081
```

Press w for web, i for iOS, or a for Android. Use one Metro instance for all platforms. A browser-only alternative is npm run web -- --localhost --port 8081.

- Website: http://localhost:8081
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

Use the actual Metro URL if you deliberately choose another port; add that exact origin to WEB_ORIGIN. An activated Python environment does not prevent npm from working. Stop each server with Ctrl+C in its own terminal.

## Run on Windows PowerShell

Install Node, Python, PostgreSQL, and optionally Android Studio. Open PowerShell in the project folder. On a new setup:

```powershell
Copy-Item .env.example .env
notepad .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
npm ci
```

Create the database and apply the four psql migration commands above. Start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --reload-dir backend --host 0.0.0.0 --port 8000 --no-access-log
```

In a second project terminal:

```powershell
npm start -- --localhost --port 8081
```

Press w or a. If virtual-environment activation is blocked, use its Python executable directly, as above; changing machine-wide execution policy is unnecessary. Windows cannot run Apple's iOS Simulator; use a physical iPhone or macOS/EAS builds.

## Run on mobile devices

### iOS Simulator

Use full Xcode and an installed iOS runtime. If the wrong developer tools are selected:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcrun simctl list devices available
xcrun simctl list devices booted
```

Boot a device through Xcode/Simulator/Device Hub and press i in Metro. Expo Go must support SDK 58. If already installed, open a specific booted device:

```sh
xcrun simctl openurl DEVICE_UUID exp://127.0.0.1:8081
```

Using the UUID avoids ambiguity with multiple booted devices.

### Android Emulator

Start an Android Virtual Device, then forward backend and Metro ports:

```sh
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
```

Press a in Metro. With forwarding, EXPO_PUBLIC_API_URL=http://localhost:8000 works. Without forwarding, Android Emulator can reach its host at 10.0.2.2; configure the API URL and restart Metro.

If adb is not on PATH, macOS's default is "$HOME/Library/Android/sdk/platform-tools/adb". In PowerShell use:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

### Physical phone

Put phone and computer on the same reachable network. Set EXPO_PUBLIC_API_URL to http://YOUR_COMPUTER_LAN_IP:8000. Keep FastAPI bound to 0.0.0.0 and run:

```sh
npm start -- --lan --port 8081
```

Scan with compatible Expo Go and allow ports 8000/8081 through your development firewall. On a phone, localhost means the phone. Expo's tunnel option does not automatically expose the separate FastAPI server.

## Test, seed, and troubleshoot

### Automated checks and exports

```sh
npm run typecheck
npm test
npm run build
npm run build:ios
npm run build:android
.venv/bin/python -m pytest backend -q
```

Windows backend test command: .\.venv\Scripts\python.exe -m pytest backend -q.

Backend integration tests need a migrated development database and use rollback fixtures. Never point tests at production. The current suite contains 17 frontend and 14 backend tests.

Web export goes to dist. iOS/Android export commands generate JavaScript/assets under .local; they do not create signed APK/AAB/IPA packages. Use native builds or EAS for installation packages.

### Optional fictional testing records

Register an app account first, then:

```sh
.venv/bin/python -m backend.seed_demo
```

If multiple accounts exist, append --owner-id YOUR_ACCOUNT_UUID. On Windows use the virtual-environment Python path. The seed inserts fictional customers, interaction reviews, actions, and events. Deterministic IDs avoid duplicates and preserve existing edits. It does not create a known login password.

### Manual smoke test

1. Register/login, refresh web, and confirm session restoration.
2. Add a customer/stakeholder; confirm persistence after refresh.
3. Save an interaction draft, reopen it, submit it, and check its timeline.
4. Update an action; verify closure requires notes and confirmation.
5. Upload/download a small supported evidence file and export a brief.
6. Edit your profile; confirm the account name updates.
7. Change sidebar appearance; restart and confirm it persists.
8. Check mobile keyboard, card layout, tab navigation, and safe areas.
9. Log out and use another account; verify records stay isolated.

### Diagnostics and common errors

Backend JSON logs go to stdout and .local/logs/api.log with rotation. They include process ID, X-Request-ID, method/path, route, status, duration, and safe exception/validation details. Request bodies, passwords, JWTs, and raw database exception messages are excluded.

Client diagnostics use the [Customer360 API] console prefix. Match a failed response's X-Request-ID with backend logs. Vercel uses runtime stdout logs instead of local files.

| Problem | Resolution |
| --- | --- |
| permission denied for schema public | Grant the migration role USAGE/CREATE on the intended schema as administrator; rerun only the failed transaction. |
| OPTIONS login returns 400 | Add the exact browser origin/port to WEB_ORIGIN and restart FastAPI. |
| /profile returns 404 despite current source | Check for a stale LAN backend; run one current listener on 0.0.0.0:8000. |
| Port 8081 already running | Reuse that Metro terminal or stop it with Ctrl+C before starting another. |
| Expo Go SDK mismatch | Install a compatible SDK 58 client. |
| Simulator cannot open exp URL | Verify device UUID, boot state, Expo Go installation, and Metro port. |
| Phone fetch fails | Check API LAN address, firewall, server binding, and network. |
| Hosted login fails | Check API routing, environment variables, hosted database connection, and migrations. |

On macOS inspect listeners with lsof -nP -iTCP:8000 -sTCP:LISTEN (or port 8081). Identify a process before stopping it. Uvicorn's reload parent and worker sharing one socket is normal.

## Deploy on Vercel with a hosted database

### What is configured

vercel.json builds the Expo web export and serves dist. API/auth/profile/docs paths route to api/index.py, which exports FastAPI. Other frontend routes fall back to index.html. Root requirements.txt includes backend dependencies. .vercelignore excludes local secrets, environments, logs, and generated files.

The deployment configuration has not yet been validated with a successful live Vercel deployment. Vercel hosts the web frontend and API; it does not host your Mac's database or distribute mobile installation packages.

### 1. Provision PostgreSQL

Create a hosted PostgreSQL database through a provider such as Neon or Supabase, directly or through Vercel Marketplace. This app uses ordinary PostgreSQL and its own auth, so a separate provider Auth service is not required.

Choose a region near your function deployment. Obtain a direct SQL connection for setup and a TLS-enabled, preferably pooled runtime URL.

Create a dedicated non-superuser runtime role. With appropriate administrator privileges:

```sql
CREATE ROLE gcc360 LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT CONNECT ON DATABASE YOUR_DATABASE TO gcc360;
GRANT USAGE, CREATE ON SCHEMA public TO gcc360;
```

Run schema grants while connected to the target database. Set the password securely through the provider or psql's password prompt. Managed providers can require their own role-creation interface.

Verify:

```sql
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname = 'gcc360';
```

Both flags must be false. Do not use a provider administrator or BYPASSRLS role as the application's DATABASE_URL.

### 2. Apply cloud migrations

Use the direct host to connect as gcc360 with TLS, letting psql prompt for its password. Example connection command uses placeholders only:

```sh
psql "host=YOUR_HOST port=5432 dbname=YOUR_DATABASE user=gcc360 sslmode=require"
```

From the project directory, for a fresh cloud database:

```sql
\set ON_ERROR_STOP on
BEGIN;
\i backend/migrations/001_initial.sql
\i backend/migrations/002_sites_ui.sql
\i backend/migrations/003_sessions.sql
\i backend/migrations/004_profiles.sql
COMMIT;
```

Apply as the restricted role so table ownership matches local setup. Existing databases require inspection and only missing migrations. Do not run schema migrations automatically on each web build. Local accounts/data do not transfer automatically; register in the new environment or plan a separate data migration.

### 3. Link Vercel and set secrets

These commands work in macOS terminals and PowerShell:

```sh
npm ci
npm run typecheck
npm run build
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
```

Enter the hosted runtime URL with TLS and a random JWT signing secret at the prompts. Keep production JWT_SECRET stable. Never place real secrets in source or CLI arguments.

Leave EXPO_PUBLIC_API_URL unset in Vercel: the web client uses its deployment's HTTPS origin. Do not set a localhost/LAN address there. Same-origin web requests do not require additional CORS settings. Add WEB_ORIGIN only for other intended browser clients.

For preview deployments, repeat environment configuration with preview instead of production, preferably with a separate database. Environment changes require a new deployment.

### 4. Publish and verify

```sh
npx vercel --prod
```

Open the URL Vercel prints. Test /health, /docs, registration/login, customer creation, interaction submission, profile editing, logout, and owner isolation. Diagnose errors in Vercel Runtime Logs by X-Request-ID.

For later updates, run checks and npx vercel --prod again. Keep .vercel out of source control. For automatic Git deployments, push the project to a repository, import it into Vercel, use the project root as Root Directory, and retain vercel.json settings.

### Limits and mobile configuration

Evidence is stored in PostgreSQL with a 5 MB application limit. Vercel function request/response limits can reject smaller bodies, especially after encoding overhead. Test with small files. Larger uploads need direct object storage support, which is not implemented.

For mobile access, set EXPO_PUBLIC_API_URL to https://YOUR_PROJECT.vercel.app and restart Metro/rebuild. Preview deployment protection may prevent mobile API access before FastAPI receives a request.

References: [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Python runtime](https://vercel.com/docs/functions/runtimes/python), [environment variables](https://vercel.com/docs/environment-variables), [function limits](https://vercel.com/docs/functions/limitations).

## Change splash screen and app icon

### Current state

The native splash is configured using the artwork from the supplied source ZIP: a green (#103f34) background, full Customer360/Welspun lockup on iOS, and compact icon on Android. Assets live in assets/splash-lockup.png and assets/splash-icon.png; matching editable SVG sources are included. The expo-splash-screen plugin is configured in app.json. App.tsx holds the splash while Poppins loads and releases it on font readiness or error, with a short fade.

To see this change, rebuild and reopen the native app using the release commands below. Metro reloads and Vercel web deployments cannot change an installed native splash. Session restoration continues in the React loading screen after the splash hides.

### Configure a custom native splash

1. Replace the existing splash PNGs with your desired artwork, or supply optional assets/splash-icon-dark.png and assets/icon.png. Use a high-resolution PNG with centered branding and transparent space. Preserve the included SVG sources if you want to edit the artwork later.
2. Install the SDK-compatible package:

```sh
npx expo install expo-splash-screen
```

3. To customize further, edit the existing expo-splash-screen entry in app.json; do not add it a second time. The following is an alternative configuration example. Keep the existing sharing, SecureStore, and font plugins:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#f6f9f7",
    "dark": {
      "image": "./assets/splash-icon-dark.png",
      "backgroundColor": "#101914"
    }
  }
]
```

If using one image, omit the dark image field or point it to the same existing file. All referenced assets must exist. For the launcher icon, add "icon": "./assets/icon.png" inside expo. expo.name is already Customer360 by Welspun GCC.

4. Optionally hold the splash until fonts load: import expo-splash-screen in App.tsx and call preventAutoHideAsync at module scope. In ThemedApp, add a useEffect before any conditional return to hide it on fontsLoaded OR fontError. This hands over to the React session-restoration screen. If also waiting for restoration, hide on both success and failure so launch cannot stay stuck.
5. Rebuild a native application:

```sh
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

iOS requires macOS/Xcode; Android requires its SDK/Java tools. Native directories are generated as needed. For cloud builds, configure EAS and run npx eas-cli build --platform ios or npx eas-cli build --platform android. Device distribution requires platform signing credentials/accounts.

Native plugin/icon/splash changes need a new binary; a Metro reload or web deployment cannot update them. Expo Go and development clients do not faithfully reflect all splash settings: verify a release build. Native splash dark mode follows the operating system; saved in-app appearance is applied after React starts.

For web loading visuals, edit App.tsx's font/session loading UI and browser branding, then export/redeploy the web app. The native plugin does not create a browser page loader.

References: [Expo splash-screen package](https://docs.expo.dev/versions/latest/sdk/splash-screen/), [splash and app icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).

## Verification boundaries

Type checks, frontend behavior tests, development-database backend tests, and JavaScript exports are separate from visual simulator checks, signed mobile release builds, and live cloud deployment tests. Run the appropriate checks and manual smoke test in the actual target environment before demonstrating the result.
