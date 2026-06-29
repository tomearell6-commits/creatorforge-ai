# Forge AI Assistant

A floating AI help widget inside the dashboard that guides users through the
platform — creating content, choosing tools, connecting WordPress/social, credits,
and onboarding.

## Widget

Floating "Ask Forge AI" button (bottom-right). Opens a chat panel with: welcome
message, message history, suggested quick actions, text input + send, credit-cost
indicator, remaining-credits / free-allowance display, minimize, and close.
Mounted once in `src/app/dashboard/layout.tsx`, so it appears on every dashboard
page (home, Create Content, all studios, Billing, Credit Wallet, Publishing). The
dashboard-home onboarding card ("Open Assistant") triggers it via an
`open-forge-assistant` window event.

## Free allowance + credit logic (server-side)

- Each user gets **10 free assistant messages/month** (admin-configurable; optional
  per-user override in `assistant_free_allowance`).
- After the free allowance, each reply costs credits by tier:
  - **simple** (navigation/help) — 1 credit
  - **workflow** (create/connect/publish/render/schedule) — 2 credits
  - **advanced** (strategy/optimize/grow/ideas/recommend) — 3 credits
  - Tier is classified deterministically in `lib/assistant/cost.ts`, so the
    estimate shown before sending matches the charge.
- **Credits are deducted only after a successful reply** via `deductCredits()`,
  which writes the wallet ledger with reason **`AI_ASSISTANT_MESSAGE`**. Failed
  replies (provider error) charge nothing and don't consume the free allowance.
- If free allowance is exhausted **and** the balance is below the tier cost, the
  request is rejected (402) *before* calling the model, with a "Top Up Credits"
  prompt — the user is never silently failed.
- **Placeholder mode** (no `ANTHROPIC_API_KEY`): replies are helpful but free and
  never consume the allowance — consistent with the rest of the app, which only
  bills for real AI. Set the key to activate billing.

## Context (no sensitive data)

The system prompt receives: current page, plan, credits remaining, selected
category. It never receives other users' data, raw secrets, or the internal
prompt text (which is never returned to the client).

## API routes

- `POST /api/assistant/chat` — main turn: gate → persist user msg → generate →
  charge on success → persist reply. Rate-limited 20/min.
- `GET /api/assistant/history[?conversationId]` — conversations or messages (owner).
- `GET /api/assistant/free-allowance` — month limit/used/remaining + low-credit threshold.
- `POST /api/assistant/estimate-cost` — tier + cost + whether it's free.
- `POST /api/assistant/feedback` — 👍/👎 on a reply.

## Database (migration `0012_assistant.sql`)

`assistant_conversations`, `assistant_messages`, `assistant_usage`
(unique per user+month), `assistant_free_allowance`, `assistant_feedback` — all
owner-only RLS. SECURITY DEFINER functions `assistant_consume_free` (atomic free
decrement) and `assistant_record_paid` (records paid usage).

## Admin controls

`/admin/assistant`: enable/disable, free messages/month, per-tier costs,
low-credit threshold; plus usage stats (conversations, free/paid messages, credits
spent, 👍/👎), and top questions. Stored in `system_settings` key `assistant`,
read via the service-role client; edits are audit-logged.

## Security

Owner-only conversations (RLS). All credit math server-side. Rate-limited. Input
trimmed + length-capped (2000). No API keys or internal prompt exposed. Errors
captured via `captureError` without leaking data.

## Testing

1. Open/close/minimize the widget (all dashboard pages).
2. Send a message → reply appears; quick actions send too.
3. Free allowance: first 10 (real-AI) replies show "Free messages remaining: N".
4. After 10, replies deduct the tier cost; ledger row reason `AI_ASSISTANT_MESSAGE`.
5. Provider failure → error bubble, no deduction.
6. Low credits → warning; zero credits + no free → input disabled + Top Up button.
7. Top Up button → `/dashboard/credits`.
8. History persists per conversation; another user can't read it (RLS).
9. Admin toggles disable/costs and they take effect.

## Known limitations

- Live billing requires `ANTHROPIC_API_KEY` (placeholder mode is free).
- "Top questions" is a simple frequency of the first words of recent questions.
- The assistant guides but never performs actions on the user's behalf.

## Future improvements

- Stream replies token-by-token; deep-link buttons that navigate to the exact page.
- Retrieval over the live docs/changelog; conversation list UI + resume.
- Per-tier model selection (cheaper model for simple questions).
