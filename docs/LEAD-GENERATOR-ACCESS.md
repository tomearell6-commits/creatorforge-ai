# Lead Generator — Premium Access & Compliance Controls

The Lead Generator is a controlled premium Business Studio feature. Because it
uses paid APIs and carries compliance risk, access is gated server-side and
outreach requires explicit review.

## Server-side access guard (`lib/leads/access.ts`)
`guardLead(supabase, userId, emailConfirmed, need)` is the single gate every lead
route calls (`need` = `view | search | send`). It evaluates, in order:
1. **Verified** account (email confirmed).
2. **Feature enabled** (not admin-suspended/disabled).
3. **Active paid plan** with Lead-Generator access (`level !== none`).
4. For `search`: within the **monthly lead limit**.
5. For `send`: plan allows **automated sending**, **compliance accepted**,
   **sender profile complete**, and within the **daily send limit**.
Each failure returns HTTP 403 with `{ reason, action, message }` so the UI shows
the right button (Verify / Upgrade / Accept policy / Complete profile / Top up).

## Plan access (defaults; admin-editable in `lead_usage_limits`)
| Plan | Level | Monthly leads | Daily sends | Automated send |
| --- | --- | --- | --- | --- |
| Free / Starter | none | 0 | 0 | no |
| Creator / Professional | limited | 100 | 0 | no (manual export only) |
| Pro / Business | full | 2,000 | 500 | yes |
| Agency / Enterprise | advanced | 10,000 | 2,000 | yes |

## Compliance agreement
Before first use, the Compliance Modal requires agreement to the 9-point policy
(public data only, no private individuals, no hidden data, no login/CAPTCHA
bypass, no spam, unsubscribe text in every campaign, respect DNC/unsubscribed,
review before outreach, follow email/privacy laws). Acceptance is stored in
`lead_compliance_acceptance` with `user_id, version, accepted_at, ip_address,
user_agent`. The guard only passes `send` when the accepted `version` matches the
current `COMPLIANCE_POLICY_VERSION`.

## Manual review + send safety (`/api/leads/brevo/send`)
Sending is never automatic after scraping. The workflow is: generate → verify →
save to list → review/remove → **confirm compliance (send-approval)** → pick
template → **final preview** → confirm send. The send route:
- runs `guardLead(...,"send")`;
- requires a `lead_send_approvals` row (`approved` + `confirmed_compliance`);
- records a `lead_safety_checks` row (manual approval, daily limit, credits,
  Brevo configured, has recipients, compliance, sender profile);
- blocks with a specific reason if any check fails and logs `blocked_send`;
- charges credits, sends via Brevo, logs `send` usage + compliance.
The Brevo list is compliance-filtered at sync time (`canContact` drops DNC /
unsubscribed / invalid / no-source leads).

## Sender profile
`lead_sender_profiles`: sender name, business name/website/email/address,
reply-to, unsubscribe footer, compliance confirmation. `completed` is true only
when the required fields are set and compliance is confirmed — a prerequisite for
sending.

## Admin controls (`/api/admin/leads/controls`, `Admin → Lead Generator`)
Enable/disable, suspend/unsuspend, per-user access override, and per-plan limits
(monthly leads, daily sends, automated send, access level). Every change is
audited in `lead_admin_actions`. Analytics surface high-bounce users, suspended
users, and compliance logs.

## Database (migration 0025)
`lead_feature_access, lead_compliance_acceptance, lead_sender_profiles,
lead_usage_limits (seeded), lead_usage_logs, lead_send_approvals,
lead_safety_checks, lead_admin_actions`. Owner-only RLS on user data;
`lead_usage_limits` is readable by authenticated users (the guard needs it);
admin actions are service-role only.

## API protection
Every lead route enforces auth + ownership + `guardLead`. Access is never trusted
from the frontend — the UI `LeadAccessGate` mirrors the server rules for UX only.
Rate-limited; credit checks before paid actions; usage logged.

## Testing (maps to the 10 spec cases)
Starter blocked (level none) · Professional search/export only (automatedSend
false blocks send) · Business full workflow · send blocked without compliance /
without sender profile / to invalid or unsubscribed / without credits · duplicate
send blocked (status='sent' 409 + approval required) · admin suspend blocks all.

## Remaining recommendations
Brevo event webhook → auto DNC on unsubscribe/bounce; team-review approval
workflow (Enterprise); per-domain send throttling; downloadable compliance
report; periodic re-acceptance when the policy version changes.
