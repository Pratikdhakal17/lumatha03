# Integrations Checklist

This file lists the server-side environment variables and quick tests for third-party integrations used by the app.

## Agora (RTC tokens)
- Required envs (server):
  - `AGORA_APP_ID`
  - `AGORA_APP_CERTIFICATE`
- Endpoint: `api/agora-token.js`
- Quick local test (requires a logged-in Supabase user token):
  ```bash
  curl -X POST http://localhost:5173/api/agora-token \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPABASE_JWT>" \
    -d '{"channel":"test-channel","uid":12345}'
  ```

## Resend (transactional email)
- Required envs (server):
  - `RESEND_API_KEY`
  - `RESEND_SENDER` (optional)
- Endpoint: `api/resend.js`
- Quick local test (server will contact Resend):
  ```bash
  curl -X POST http://localhost:5173/api/resend \
    -H "Content-Type: application/json" \
    -d '{"to":"you@example.com","subject":"Test","html":"<p>Hello</p>"}'
  ```

## Supabase
- Required envs (client & server):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, for privileged functions)

## Notes for testing
- Some endpoints require an authenticated Supabase JWT in the `Authorization: Bearer` header.
- If an endpoint fails locally, check Vite server logs and confirm env vars are available to the dev server.

## Next actions
- Provide AGORA and RESEND credentials (securely) to run full end-to-end tests.
- I can run the curl tests locally once you provide the minimal secrets or run them in your environment.
