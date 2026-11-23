# Vercel deployment

This project deploys the Expo web export and FastAPI together. iOS/Android
installation packages are separate from the Vercel website.

## Prerequisites

- A Vercel account and a hosted PostgreSQL database reachable over TLS.
- Apply `backend/migrations/001_initial.sql` through `004_profiles.sql`
  in filename order to a new database. Check the actual filenames first.
  Existing databases: apply only migrations not already applied.
- Use a dedicated runtime database role without SUPERUSER or BYPASSRLS.
  Keep FORCE ROW LEVEL SECURITY enabled. Do not use a provider admin role
  as the app's runtime connection.

Your Mac's localhost database cannot be reached by Vercel. Existing local
customers/accounts do not automatically move to the hosted database.

## Deploy from the project directory

```powershell
npm ci
npm run typecheck
npm run build
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
npx vercel --prod
```

Enter the hosted PostgreSQL pooled TLS URL at the DATABASE_URL prompt and a
new random secret of at least 32 characters at JWT_SECRET. Never paste
secrets into source code, CLI arguments, or chat. Keep JWT_SECRET stable.
Use the same commands with `preview` instead of `production` for preview
deployments; preferably use a separate development database.

Leave EXPO_PUBLIC_API_URL **unset** in Vercel. The browser uses its own
HTTPS deployment origin for API requests. This also prevents previews from
calling production APIs. Local `.env` files are excluded from upload.
Only DATABASE_URL and JWT_SECRET are required on Vercel for this setup.

If a separate web/mobile client calls this API, set WEB_ORIGIN to its exact
browser origin(s), comma-separated. Set EXPO_PUBLIC_API_URL in the mobile
build environment to the deployed HTTPS origin. No OAuth callbacks are
needed for the existing password/JWT authentication. SSO is not configured.

## Verify after deployment

1. Open the deployment URL and confirm the login page loads.
2. Visit `/health` and `/docs` on the same domain.
3. Register a test account, add a customer, and record an interaction.
4. Reload: the web login should persist until its one-hour expiry.
5. Check profile editing, logout, and private records from a second account.
6. Find API errors in Vercel Runtime Logs by X-Request-ID. Local rotating
   log files are disabled in the serverless runtime.

The current 5 MB evidence upload limit may exceed the deployment platform's
request-body limit. Test with small files; larger uploads need direct object
storage rather than passing file bodies through a serverless function.
