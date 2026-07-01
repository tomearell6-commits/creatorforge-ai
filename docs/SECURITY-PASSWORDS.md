# Account Security — Password Reset & Change

Built on **Supabase Auth** (secure token issuance, hashing, link expiry, session
management) with branded confirmation emails via **Brevo**.

## Flows

### Forgot / reset (unauthenticated)
1. `/forgot-password` → `POST /api/auth/forgot-password` with the email.
2. Route is rate-limited (5/15 min per IP, 3/15 min per email) and **always** returns the same generic message — it never reveals whether an account exists. Logs `PASSWORD_RESET_REQUESTED`.
3. `supabase.auth.resetPasswordForEmail` emails a secure, expiring link → `/auth/callback?next=/reset-password`.
4. The callback exchanges the code for a short-lived **recovery session**, then redirects to `/reset-password`.
5. `/reset-password` verifies the recovery session, enforces the password policy (with a strength meter), and calls `supabase.auth.updateUser({ password })`.
6. `POST /api/auth/reset-complete` logs `PASSWORD_RESET_COMPLETED`, revokes other sessions (`signOut({ scope: 'others' })`), and emails the change confirmation. The user is signed out and sent to `/login?reset=success`.

### Change password (authenticated)
`Settings → Security → Change Password` → `POST /api/auth/change-password`:
1. Re-verifies the **current** password on a throwaway anon client (so the live session isn't disturbed). Wrong password → `PASSWORD_CHANGE_FAILED` + 400.
2. Enforces the policy server-side, rejects reuse, calls `updateUser`.
3. Revokes other sessions, logs `PASSWORD_CHANGED`, emails the confirmation.

## Password policy (`lib/security/password.ts`, shared client + server)
Min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number, ≥1 special character. `passwordScore` (0–4) drives the meter; `validatePassword` gates both the reset page and the API routes.

## Security events (`security_events`, migration 0021)
`id, user_id (nullable), event_type, ip_address, user_agent, metadata, created_at`.
Types: `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED`, `SUSPICIOUS_ACTIVITY`. Owner-read RLS; **all writes via the service-role admin client** (`lib/security/events.ts`). Reset requests are logged without a user id (non-enumeration) and store only the email domain — never the address or any token.

## Emails (`lib/email/`)
`send.ts` posts to Brevo (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL/NAME`); no-op fallback when unconfigured so dev flows still work. `templates.ts` provides branded HTML for: password reset, password changed, suspicious activity. The Supabase-sent reset email itself is templated in the Supabase dashboard.

## Security properties
- Passwords are never stored by us (Supabase hashes them); never logged.
- Reset tokens are Supabase-managed, single-use, and expire; never logged or placed in our metadata.
- Non-enumeration: identical response + no user lookup on reset request.
- Rate limiting on reset requests and change attempts.
- Other sessions invalidated after any password change.
- CSRF posture: same-origin `fetch` with the Supabase auth cookie (`SameSite=Lax`); state-changing routes require an authenticated session (change) or are non-enumerating + rate-limited (forgot).

## Env
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `NEXT_PUBLIC_APP_URL` (email links), plus existing `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`.

## Remaining recommendations
- Configure the Supabase reset-email template + set the OTP/link expiry in the dashboard.
- Optionally add a `SUSPICIOUS_ACTIVITY` trigger (e.g. N failed changes) that emails `suspiciousActivityEmail`.
- Consider surfacing recent `security_events` to users in Settings.
