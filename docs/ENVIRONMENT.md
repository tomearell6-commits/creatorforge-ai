# Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. **Never commit `.env.local`.**

| Variable | Required for Phase 1 | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_URL` | ✅ Yes | Same as the public URL (used server-side) |
| `SUPABASE_ANON_KEY` | ✅ Yes | Same as the public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase → API → service_role (server-only; admin tasks) |
| `OPENAI_API_KEY` | ❌ No (placeholder) | platform.openai.com → API keys |
| `ANTHROPIC_API_KEY` | ❌ No (placeholder) | console.anthropic.com |
| `PADDLE_API_KEY` | ❌ No (Phase 2) | Paddle dashboard |
| `PADDLE_WEBHOOK_SECRET` | ❌ No (Phase 2) | Paddle webhook settings |
| `CRYPTO_PAYMENT_API_KEY` | ❌ No (Phase 2) | Your crypto provider |
| `CRYPTO_PAYMENT_WEBHOOK_SECRET` | ❌ No (Phase 2) | Your crypto provider |
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3000` in dev |

## Notes

- The browser bundle can only read variables prefixed with `NEXT_PUBLIC_`. That's why the
  Supabase URL and anon key are duplicated — the `NEXT_PUBLIC_*` copies are used by the
  client, and the non-prefixed copies are available server-side.
- The **anon key is safe to expose** to the browser; Row Level Security (RLS) protects data.
- The **service role key must never** be exposed to the browser or committed to git.
- The script generator works with **no AI key** in Phase 1 (placeholder engine). To enable
  real generation in Phase 2, set `OPENAI_API_KEY` and flip `USE_REAL_OPENAI` in
  `src/lib/ai/openai.ts`.
