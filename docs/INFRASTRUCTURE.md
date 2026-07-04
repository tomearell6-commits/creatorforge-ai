# AI Infrastructure Operations Center

Admin-only command center for monitoring every external service CreatorsForge
depends on — AI providers, payments, storage, email, auth, publishing, and core
infra — with health, usage, quotas, balances, costs, renewals, and alerts.

## 1. Architecture

Two layers of truth:

1. **Derived live (always known):** whether each provider's env credentials are
   configured. Computed server-side in `src/lib/infra/status.ts` from the code
   **registry** (`src/lib/infra/registry.ts`).
2. **Recorded snapshots:** usage / cost / balance / renewal / health rows written
   by admins or a metrics cron into the `provider_*` tables. The app merges the
   newest row per provider.

Why: most provider usage/balance figures require per-provider API calls with
their own keys and endpoints. Rather than fake them, the registry tells us what
each provider *supports* (`supportsUsageReporting`, `supportsBalanceReporting`,
…) and snapshots fill in real numbers when recorded via `/api/admin/infra/record`.

```
registry (static metadata) ──► status.ts (env check) ──► snapshot ──► UI
                                        ▲
   provider_* snapshot tables ─────────┘ (admin / cron recorded metrics)
```

## 2. Provider Registry

`src/lib/infra/registry.ts` — every provider with: id, name, category, `envKeys`
(what makes it "configured"), authType, apiEndpoint, docs/support URLs,
`renewalRequired`, and capability flags. Categories: `ai`, `payment`, `storage`,
`email`, `auth`, `publishing`, `infra`. Add a provider = one entry here.

Tracked today: Anthropic, OpenAI, ElevenLabs, Gemini, Shotstack, fal.ai
(AI); NOWPayments, Paddle (payment); Supabase Storage, Cloudflare R2 (storage);
Resend, Brevo (email); Supabase Auth, Google OAuth (auth); YouTube, Instagram,
Facebook, TikTok, LinkedIn, X, Pinterest, WordPress (publishing); Supabase
Postgres, Upstash Redis, Sentry (infra).

## 3. Renewal workflow

`/api/admin/infra/renewals` returns every provider with a renewal date, sorted
soonest-first, tagged: **critical ≤7d, warning ≤14d, upcoming ≤30d**. The Renewal
Center (`/admin/infra/renewals`) highlights each tier. Dates come from recorded
`provider_renewals` snapshots.

## 4. Alert workflow

`src/lib/infra/alerts.ts` evaluates snapshots against thresholds and derives live
alerts (quota %, low balance, renewal proximity, spend spikes, config gaps).
`/api/admin/infra/alerts` merges these **live** alerts (auto-clear when resolved)
with **stored** `provider_alerts` rows (manually/cron created, resolvable). The
Alert Center shows both and lets admins resolve stored ones.

Thresholds (`provider_thresholds`, single row): warning/critical usage %, renewal
reminder days, storage %, API quota %, credit %, daily & monthly spend. Editable
in the Alert Center; defaults in `DEFAULT_THRESHOLDS`.

## 5. Cost calculation

`/api/admin/infra/costs` aggregates `provider_costs` snapshots: daily total,
monthly total, per-provider breakdown, top drivers, and a forecast =
`max(recorded monthly, daily run-rate × 30)`. CSV export via `?format=csv`.

## 6. Health monitoring

Per-provider status: `healthy | warning | critical | offline | not_configured`.
Configured + no health row ⇒ `healthy`; a recorded `provider_health` row (status,
latency, error rate, webhook ok, last success/failure) overrides. Service Health
page surfaces latency and webhook state across all providers.

## 7. Database schema (migration `0011_infrastructure.sql`)

14 tables: `service_providers`, `provider_accounts`, `provider_usage`,
`provider_costs`, `provider_health`, `provider_renewals`, `provider_alerts`,
`provider_balances`, `provider_api_keys`, `provider_webhook_logs`,
`provider_status_history`, `provider_notifications`, `provider_thresholds`,
`provider_cost_forecasts`. Indexed on `(provider_id, created_at desc)`. RLS is
**enabled with no permissive policy** — only the service-role admin client (behind
`requireAdmin()`) can read/write. `provider_api_keys` stores a **masked hint
only**, never a full key.

## 8. API documentation

All under `/api/admin/infra/`, all `requireAdmin`-gated:
- `GET overview` — summary cards, widgets, live alert count.
- `GET providers?category=` — full per-provider snapshot + registry metadata.
- `GET renewals` — renewal-sorted list with urgency tiers.
- `GET alerts` / `POST alerts {id}` — live+stored alerts / resolve a stored one.
- `GET costs[?format=csv]` — cost breakdown, totals, forecast, CSV.
- `GET|PUT thresholds` — read / update alert thresholds (audited).
- `POST record { kind, provider_id, … }` — record a usage/cost/health/balance/
  renewal/alert/apikey/webhook/forecast snapshot (admin / cron; whitelisted cols).

## 9. Administrator guide

Open **Admin Portal → Infrastructure**. Overview shows system status, summary
cards, and widgets. Category pages (AI / Payments / Storage / Email / Auth /
Publishing) show provider cards with status, plan, usage, balance, cost, renewal,
and docs/support links. API Keys lists configured providers (masked). Set
thresholds in the Alert Center. To feed live numbers, POST snapshots to
`/api/admin/infra/record` from a scheduled job.

## 10. Security review

- Admin-only: `/admin` layout gates on `isPlatformAdmin`; every infra route uses
  `requireAdmin`. Tables are service-role only (RLS, no policy).
- Secrets never exposed: keys live in env / encrypted at rest; the UI shows only
  masked hints and "configured" state, never values.
- Admin actions (threshold edits, alert resolves, snapshot records) are written to
  the audit log.
- Destructive credential changes happen at the provider, not here — the panel
  links out to rotate, avoiding any plaintext handling.

## Testing

1. Run `0011_infrastructure.sql` in Supabase.
2. As an admin (email in `ADMIN_EMAILS`), open `/admin/infra` — providers show
   `healthy` (configured) or `not configured` based on env.
3. POST a snapshot, e.g. usage:
   `POST /api/admin/infra/record {"kind":"usage","provider_id":"openai","calls_today":1200,"calls_month":34000,"quota_limit":50000,"quota_used":34000}`
   → the card shows the quota bar; if >80% an alert appears in the Alert Center.
4. Record a renewal 5 days out → Renewal Center flags it critical + an alert fires.
5. Record costs → Cost Management totals + forecast update; CSV exports.
6. Edit thresholds → re-evaluate alerts.

## Future improvements

- **Metrics cron** that polls provider APIs (OpenAI usage, ElevenLabs credits,
  Supabase storage, Shotstack/fal balances) and auto-records snapshots.
- Real-time webhook health from the existing payment webhooks into
  `provider_webhook_logs`.
- Email/Slack admin notifications on critical alerts (`provider_notifications`).
- Per-user cost attribution (cost-by-user) from credit ledger + provider rates.
- Status-history sparklines and uptime % over time.
