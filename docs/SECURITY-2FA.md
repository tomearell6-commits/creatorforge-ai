# Two-Factor Authentication (2FA)

Account-level second factor for CreatorsForge.io. Users enable it under
**Settings → Security → Two-Factor Authentication**; admins manage platform
policy under **Admin Portal → Security & 2FA**.

## Methods

| Method | Notes |
| --- | --- |
| Authenticator app (TOTP) | **Recommended.** RFC 6238, SHA-1/30s/6 digits — Google Authenticator, Microsoft Authenticator, Authy, 1Password. Implemented in `src/lib/security/totp.ts` (unit-tested against the RFC test vectors). |
| Email verification code | 6-digit code, 10-minute expiry, 5 attempts, hashed at rest (`user_2fa_challenges`). |
| Backup codes | 10 one-time codes (`XXXX-XXXX-XXXX`), SHA-256 hashes only, shown once. Regeneration requires password confirmation. |

## How enforcement works

1. Password login (or Google OAuth) creates the Supabase session as before.
2. `src/lib/supabase/middleware.ts` refuses `/dashboard` until the browser holds a
   **signed verification cookie** (`cf2fa`, HMAC-SHA256 with `SECRETS_KEY`,
   30 days, httpOnly). Unverified users are redirected to `/two-factor`.
3. `/api/security/2fa/verify-login` verifies a TOTP/email/backup code and issues
   the cookie. A short-lived signed "off" marker avoids a DB query per request
   for users without 2FA.
4. Edge-safe: the cookie module uses Web Crypto only (`twofactor-cookie.ts`).
   If `SECRETS_KEY` is unset (dev), enforcement is skipped entirely so users
   can't be locked out.

## High-risk actions

`/api/security/2fa/verify-action` verifies a fresh code and returns a 5-minute
**action token** (distinct signing prefix — a login cookie can never satisfy an
action check). Protected routes require it via the `x-2fa-token` header;
`HighRiskAction2FAModal` handles the client side. Wired into:

- Change password (`/api/auth/change-password`, only when the account has 2FA)
- Disable 2FA (password + current code)
- Regenerate backup codes (password)

To protect another route: `verifyActionToken(req.headers.get("x-2fa-token"), user.id)`.

## Admin enforcement

`security_settings.enforce_admin_2fa` (singleton row). When active, `requireAdmin`
rejects admins without 2FA on every admin API (403). The admin layout shows a
warning banner (amber = recommended, red = enforcement active). Turning
enforcement ON requires the acting admin to have 2FA themselves. The panel
route uses `requireAdmin({ skip2faEnforcement: true })` so a blocked admin can
still see why.

## Data model (migration 0032)

- `user_2fa_settings` — method, `secret_encrypted` (AES-256-GCM via SECRETS_KEY), enabled, timestamps. RLS: select-own.
- `user_2fa_backup_codes` — sha256 hashes, used flags. RLS: select-own.
- `user_2fa_challenges` — hashed email codes, purpose (`login|action|setup`), attempts, expiry. Service-role only.
- `security_settings` — admin enforcement singleton. Service-role only.

All writes go through service-role API routes. Security events are logged to
`security_events`: `2FA_ENABLED/DISABLED/LOGIN_SUCCESS/LOGIN_FAILED/BACKUP_CODE_USED/BACKUP_CODES_REGENERATED/2FA_REQUIRED_FOR_ACTION`.

## Emails (Brevo)

Enabled / disabled / backup codes regenerated / failed-attempts alert (sent once
when 3 failures accumulate in 15 minutes) / the 6-digit code email. Templates in
`src/lib/email/templates.ts`.

## Rate limits

Setup 5/10min·IP, verify-setup 10/10min·IP, verify-login 20/10min·IP **and**
8/10min·user, verify-action 15/10min·IP + 8/10min·user, email-code 6/10min·IP +
3/10min·user, disable 5/10min·IP, regenerate 3/10min·IP.

## API routes

`/api/security/2fa/`: `setup`, `verify-setup`, `verify-login`, `disable`,
`regenerate-backup-codes`, `status`, `verify-action`, `email-code`.
Admin: `/api/admin/security/2fa` (GET status+admin list, PATCH enforcement).

## Known limitations

- OAuth (Google) sign-ins are covered by the middleware gate, but the Google
  account's own 2FA is independent of ours.
- "Login from new device" emails are not implemented (no device fingerprinting).
- Email-method users depend on Brevo availability at login; backup codes are the
  fallback.
- Direct Supabase REST calls with a stolen access token bypass the middleware
  gate (RLS still applies). Supabase-native AAL2 policies would close this but
  require per-table policy changes across the schema.
