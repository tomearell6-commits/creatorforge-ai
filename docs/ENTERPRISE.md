# Enterprise Platform & Admin (Phase 7)

Phase 7 adds the business-management layer: a separate admin portal, user &
subscription administration, referral + affiliate programs, API key management,
support center, white-label branding, system monitoring, and audit logging.
Built on the existing patterns (owner RLS, env-driven, admin via service-role).

## Modules → files

| Module | UI | API | Library |
|---|---|---|---|
| 1 Super Admin Portal | `/admin/*` (gated layout) | `/api/admin/overview` | `lib/admin.ts` (`requireAdmin`) |
| 2 User Management | `/admin/users` | `/api/admin/users` | — |
| 3 Subscription Admin | `/admin/subscriptions` | `/api/admin/overview` + `billing_events` | — |
| 4 Referral Program | `/dashboard/referrals` | `/api/referrals` | — |
| 5 Affiliate Center | `/dashboard/affiliate` | `/api/affiliate` | — |
| 6 White Label | `/dashboard/white-label` | `/api/white-label` | `system_settings` |
| 7 API Management | `/dashboard/api` | `/api/api-keys[+/[id]]` | `lib/apikeys.ts` |
| 8 Support Center | `/dashboard/support` + `/admin/support` | `/api/support/*`, `/api/admin/support` | — |
| 9 System Monitoring | `/admin/monitoring` | `/api/admin/monitoring` | — |
| 10 Audit Logs | `/admin/audit` | `/api/admin/audit` (+CSV) | `lib/audit.ts` |

## Admin portal

`/admin` is a **separate route group** with its own layout + sidebar, gated by
`isPlatformAdmin()` (server). Admins are recognized via the `ADMIN_EMAILS` env
allowlist **or** an `admin_users` row. Admin APIs call `requireAdmin()`, which
returns a **service-role** client (bypasses RLS) only after the gate passes, so
admins can read/act across all users while normal RLS protects everyone else.

## API key handling (security)

`lib/apikeys.ts` generates `cfk_…` secrets; only the **SHA-256 hash** + a short
prefix are stored (`api_keys.key_hash` / `key_prefix`). The plaintext is returned
**once** at creation/rotation and never persisted. Verify an incoming key by
hashing it and matching `key_hash`. Keys carry `scopes` + a `rate_limit` for the
forthcoming `/api/v1` gateway.

## Referral vs affiliate

- **Referral** (peer): every user gets `ref<id>` code + link; conversions grant
  `REFERRAL_REWARD_CREDITS` via `referral_rewards`.
- **Affiliate** (partner): opt-in `affiliate_accounts` with a commission rate
  (default 30%); clicks → `affiliate_clicks`, earnings → `affiliate_commissions`;
  payouts are recorded for manual processing (architecture only).

## White label

Per-user/agency branding stored in `system_settings` under `white_label:user:<id>`
(brand name, color, logo, custom domain, email sender). Read/written via the
white-label API using the service-role client scoped to the caller's own key.
Custom domain + email require DNS/SMTP setup (activated per agency plan).

## Audit logging

`logAudit()` appends to `audit_logs` (actor, action, target, ip, metadata).
Wired into API key create/revoke and all admin user/settings actions. The admin
viewer supports action/email filters and **CSV export** (`?format=csv`).

## Monitoring

`/api/admin/monitoring` computes health for render queue, publishing queue,
payments, database, storage, and email from live tables, and raises alerts on
abnormal failure rates.

## Database

`supabase/migrations/0007_phase7_enterprise.sql` (idempotent) adds 16 tables:
`admin_users, system_settings, feature_flags, referrals, referral_rewards,
affiliate_accounts, affiliate_clicks, affiliate_commissions, api_keys,
support_tickets, support_messages, audit_logs, platform_notifications,
system_metrics, billing_events, user_sessions` — plus `profiles.status`,
`profiles.referral_code`, `profiles.referred_by`. RLS: owner policies on
user-owned tables; admin/config tables have no permissive policy (service-role
only); `feature_flags` world-readable; `platform_notifications` broadcast-readable.

## Security

- Admin routes gated by `requireAdmin` (allowlist or `admin_users`).
- API keys stored hashed; plaintext shown once.
- Owner RLS on all user tables; workspace isolation from Phase 6 preserved.
- Admin actions + key lifecycle recorded in `audit_logs`.
- Sessions tracked in `user_sessions` (revocable; architecture for session mgmt).

## Environment

No new required env. `ADMIN_EMAILS` (Phase 6) controls bootstrap admin access.
Optional white-label custom domain/email need external DNS/SMTP.

## Known limitations

- Social/publish providers remain placeholder (real OAuth = future).
- Secure **impersonation** is architected but disabled (needs signed short-lived tokens).
- Affiliate **payouts** and coupon/credit-package **editor** are architecture-only (Phase 8).
- API **gateway** (`/api/v1` request auth + rate limiting) not yet enforcing keys.
- `social_accounts`/`api_keys` secrets: hash keys; encrypt OAuth tokens before launch.
