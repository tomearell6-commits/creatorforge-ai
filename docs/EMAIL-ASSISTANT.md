# AI Email Assistant

Business Studio module (`/dashboard/email`) that reads a connected inbox,
classifies messages, surfaces what needs attention, drafts replies in six
tones, and sends ONLY with user approval — never giving the AI unsafe control.

## Permission modes
1. **Read & Summarize** — read + summarize only.
2. **Draft Assistant (default)** — read + prepare drafts; can never send.
3. **Assisted Automation** — drafts may send via explicitly safe rules only.

## Safety rules (enforced SERVER-SIDE in /api/email/send-reply)
- Nothing auto-sends by default.
- Auto-send is permanently blocked for sensitive topics: legal, financial/
  billing, password/security, medical, government, disputes, refunds,
  complaints, confidential (keyword blocklist + category rules in
  `src/lib/email-assistant/safety.ts`; the AI classifier can only ADD
  sensitivity, never remove it).
- Sensitive manual sends require an extra confirmation (409 → dialog).
- Automation rules offer safe actions only (draft/alert/label/follow-up) and
  refuse draft rules on sensitive categories.

## Providers
| Provider | Status | Env |
|---|---|---|
| Gmail / Google Workspace | OAuth, dormant until configured | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` |
| Outlook / Microsoft 365 | OAuth, dormant until configured | `MS_EMAIL_CLIENT_ID`, `MS_EMAIL_CLIENT_SECRET` |
| IMAP | Placeholder (roadmap) | — |
| **Demo Inbox** | Always available — clearly-flagged sample data to test the full flow | — |

No raw passwords, ever. Tokens are AES-256-GCM encrypted (SECRETS_KEY) in
`email_provider_tokens` (RLS enabled, NO policies — service-role only) and are
deleted immediately on disconnect.

## OAuth setup guide (platform owner)
### Google (Gmail / Workspace)
1. console.cloud.google.com → create/reuse a project → enable **Gmail API**.
2. OAuth consent screen → External → add scopes `gmail.readonly`, `gmail.send`
   → add yourself as a **test user** (RESTRICTED scopes: production use
   requires Google's OAuth verification + possible security assessment).
3. Credentials → Create OAuth client ID → Web application →
   redirect URI `https://www.creatorsforge.io/api/email/callback`.
4. Put the client ID/secret in Vercel as `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` → redeploy.
### Microsoft (Outlook / 365)
1. portal.azure.com → Microsoft Entra ID → App registrations → New.
2. Supported accounts: personal + org. Redirect URI (Web):
   `https://www.creatorsforge.io/api/email/callback`.
3. API permissions → Microsoft Graph delegated: `Mail.Read`, `Mail.Send`,
   `offline_access`, `User.Read`.
4. Certificates & secrets → new client secret → Vercel `MS_EMAIL_CLIENT_ID` /
   `MS_EMAIL_CLIENT_SECRET` → redeploy.

## Credits (charged only when real AI runs and succeeds; 402 pre-check)
Scan+classify 5 / 25 emails · draft reply 2 · daily summary 5 · full report 10
· rule execution 2. Estimates shown before scans. Placeholder mode is free.

## Data model (migration 0030)
email_accounts, email_provider_tokens (encrypted, no-policy RLS),
email_messages (headers + snippet; `is_demo` flag), email_classifications,
email_draft_replies, email_attention_items, email_automation_rules,
email_activity_logs (sensitive-action audit), email_summary_reports.
All user tables owner-RLS. Admin panel (/admin/email-assistant) shows
aggregate counts ONLY — admins can never read email content.

## Jobs
`/api/cron/email-assistant` daily 06:30 UTC (CRON_SECRET fail-closed):
per-account daily summary (stored + emailed, "Your CreatorsForge.io email
attention summary"), automation-rule drafting (safe categories only), credits
deducted via service role only when balance covers it — never negative.

## Pages
/dashboard/email (dashboard) · /connect (consent + permission selector) ·
/inbox · /needs-attention · /drafts · /rules · /reports · /settings
(mode switch, notification toggles, disconnect, delete-all-data).
