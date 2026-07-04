# Database Setup

CreatorsForge AI uses **Supabase** (PostgreSQL + Auth).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Copy the **Project URL** and **anon key** from Project Settings → API into `.env.local`
   (see [ENVIRONMENT.md](ENVIRONMENT.md)).

## 2. Run the schema

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](../supabase/schema.sql).
3. Click **Run**.

This creates all tables, the auto-profile trigger, Row Level Security policies, and seeds
the content categories. The script is idempotent — safe to run again.

## 3. Auth settings

- Auth → Providers → **Email** is enabled by default.
- For fast local testing you can disable "Confirm email" (Auth → Providers → Email) so
  signups log in immediately. With it enabled, the signup form will prompt the user to
  confirm via email before logging in.

## Tables

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — display name, plan, credit balance |
| `categories` | Reference list of the 13 content categories (seeded) |
| `projects` | A unit of content work (title, category, idea, status) |
| `generated_scripts` | Scripts generated for a project |
| `scenes` | Per-script scene breakdown — extended in Phase 3 with title, prompts, camera, transition, duration |
| `videos` | Rendered videos (Phase 4) |
| `subscriptions` | Active plan/subscription per user |
| `credit_usage` | Ledger of credits granted/consumed |
| `payment_transactions` | Paddle / card payments |
| `crypto_transactions` | Crypto payments |
| `settings` | Per-user app settings (theme, preferences) |

### Phase 3 media tables

| Table | Purpose |
|---|---|
| `assets` | Unified store for all generated media (image/audio/video/thumbnail/subtitle) |
| `voiceovers` | AI voiceovers (provider, voice, language, accent, speed, pitch, audio) |
| `thumbnails` | 16:9 thumbnails (title, style, image) |
| `subtitles` | SRT/VTT caption files |
| `render_jobs` | Render queue jobs (status, progress, logs) — placeholder in Phase 3 |
| `scene_assets` | Links scenes to assets by role (image/video/voice/subtitle) |
| `media_library` | Per-user organization layer over `assets` (tags, favorites) |

Migrations: apply `supabase/migrations/0002_phase2_credits.sql` then
`supabase/migrations/0003_phase3_media.sql` to an existing database (fresh installs get
everything from `schema.sql`). The `deduct_credits()` function and all RLS policies are
included.

> **`users`**: Supabase manages the authoritative user record in `auth.users`. We do not
> create a separate public `users` table; `profiles` is the public extension of it, and every
> other table references `auth.users(id)`.

## Row Level Security

Every user-owned table has an RLS policy: `auth.uid() = user_id`. A user can only read and
write their own rows. `categories` is world-readable (reference data). A trigger
(`handle_new_user`) automatically creates a `profiles` row (20 free credits) and a `settings`
row whenever someone signs up.
