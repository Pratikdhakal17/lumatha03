# Deployment Checklist

Use this checklist before marking a Vercel deploy as ready.

## Pre-deploy

- Run `npm run build` locally and confirm it passes.
- Confirm the latest commit is pushed to `main`.
- Verify Vercel environment variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `RESEND_API_KEY`
  - `RESEND_SENDER`
  - `AGORA_APP_ID`
  - `AGORA_APP_CERTIFICATE`

## Manual Smoke Tests

- Open the home page and verify the app loads without console errors.
- Sign in and confirm the dashboard renders user content.
- Open `Random Connect` and verify the idle, searching, and connected states render.
- Join a Random Connect audio session and confirm:
  - mic toggle works
  - leave/skip works
  - fallback to Agora is attempted if Daily fails
- Open chat and confirm media previews still load.
- Test forgot-password flow end to end:
  - request reset email
  - verify code
  - set a new password
- Confirm email actions can be sent only from authenticated sessions.
- Confirm `/api/agora-token` rejects unauthenticated requests with `401`.

## Post-deploy

- Watch Vercel deployment logs for build warnings or runtime errors.
- Open the deployed site and repeat the smoke tests above.
- If a chunk warning reappears, note the page and component responsible before further changes.
