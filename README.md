# CreatorForge AI

An AI content-creation platform for creators, businesses, marketers, and agencies.
The long-term goal is to generate faceless videos, scripts, voiceovers, captions,
thumbnails, blog posts, and social content.

> **This repository is Phase 1: the project foundation.** Authentication, dashboard,
> project management, category selection, an AI **script-generation placeholder**, the
> full database structure, and **payment architecture placeholders** (Paddle + crypto).
> Full video generation is intentionally **not** built yet.

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** (dark/light ready via CSS variables)
- **Supabase** — PostgreSQL + Auth (email/password) + Row Level Security
- **OpenAI** integration point (placeholder engine for now)
- **Paddle** + **crypto** payment structure (placeholders)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   …then fill in your Supabase values (see docs/ENVIRONMENT.md)

# 3. Set up the database
#   Open Supabase → SQL Editor → paste & run supabase/schema.sql
#   (see docs/DATABASE.md)

# 4. Run the dev server
npm run dev
# open http://localhost:3000
```

Without Supabase keys the marketing pages still render, but auth and the dashboard
require a configured Supabase project. The script generator works **without** any AI
key (it uses a built-in placeholder engine).

## Project structure

```
creatorforge-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── pricing/                 # Pricing page
│   │   ├── (auth)/                  # login / signup (shared layout)
│   │   ├── dashboard/               # Authenticated app
│   │   │   ├── layout.tsx           # Sidebar + topbar shell
│   │   │   ├── page.tsx             # Dashboard home
│   │   │   ├── projects/            # list / new / [id] detail + server actions
│   │   │   ├── generate/            # Script generator
│   │   │   ├── voice/               # Voice Studio
│   │   │   ├── scenes/              # Scene Builder + timeline + subtitles
│   │   │   ├── thumbnails/          # Thumbnail generator
│   │   │   ├── assets/              # Asset library
│   │   │   ├── render/              # Render queue
│   │   │   ├── billing/             # Plans + payment placeholders
│   │   │   └── settings/            # Profile settings
│   │   └── api/
│   │       ├── generate-script/     # POST generate, PUT save
│   │       ├── voice/{preview,generate}/
│   │       ├── scenes/  images/  thumbnails/  subtitles/  assets/  render/
│   │       └── webhooks/            # paddle + crypto (placeholders)
│   ├── components/                  # UI + dashboard + auth components
│   ├── lib/
│   │   ├── supabase/                # browser + server + middleware clients
│   │   ├── ai/                      # generate.ts, providers.ts (Claude), prompts.ts
│   │   ├── media/                   # media engine: types, audio, scenes, subtitles
│   │   │   └── providers/           # voice / image / video registries (env-driven)
│   │   ├── payments/                # paddle.ts + crypto.ts (placeholders)
│   │   ├── credits.ts               # credit balance + atomic deduction
│   │   ├── constants.ts             # categories + plans + tones/lengths
│   │   └── types.ts
│   └── middleware.ts                # session refresh + /dashboard guard
├── supabase/schema.sql              # full DB schema + RLS + seed
├── docs/                            # DATABASE / ENVIRONMENT / PAYMENTS guides
└── .env.example
```

## Documentation

- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — environment variable guide
- [docs/DATABASE.md](docs/DATABASE.md) — database setup instructions
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — payment architecture & where API keys go

## Phase 2 (done) — AI generation & credits

- **Real AI script generation** via Anthropic Claude (`src/lib/ai/`): `generate.ts`
  orchestrates, `providers.ts` calls Claude (`claude-opus-4-8` by default, override
  with `AI_MODEL`), `prompts.ts` holds per-category templates with tone + length
  controls. Falls back to a free offline placeholder when no key is set.
- **Credit usage tracking** (`src/lib/credits.ts` + `deduct_credits()` SQL function):
  real generations cost 1 credit, deducted atomically and logged to `credit_usage`.
  The generator pre-checks the balance and returns `402` with an upgrade prompt
  when the user is out of credits.
- **Project save workflow**: generate → save to a project (records model + token usage).

## Phase 3 (done) — AI media generation engine

Modular, provider-based media pipeline (see [docs/MEDIA.md](docs/MEDIA.md)). Ships with
placeholder engines so it runs end-to-end without external keys:

- **Voice Studio** — voice/language/accent + speed/pitch, preview, generate, save, download.
- **Scene Builder** — auto-splits the script into editable scenes (narration, visual
  description, image/video prompts, camera direction, transition, duration), a reorderable
  **timeline**, per-scene image generation, and **subtitle** (SRT/VTT) generate/edit/download.
- **Thumbnail Generator** — 16:9 thumbnails with editable titles + styles.
- **Asset Library** — search/filter/download/delete across all media.
- **Render Queue** — placeholder render jobs with simulated progress, logs, and retry.
- New tables: `assets`, `voiceovers`, `thumbnails`, `subtitles`, `render_jobs`,
  `scene_assets`, `media_library` (+ extended `scenes`). Provider interfaces in `src/lib/media`.

## Phase 4 — Track A (done): Storage & production foundation

Generated media now persists to **Supabase Storage** instead of data URIs / external
links (see [docs/MEDIA.md](docs/MEDIA.md) → Storage). `src/lib/media/storage.ts` uploads
to a per-user folder in the public `media` bucket and stores the durable URL on `assets`;
deleting an asset removes the underlying file. Run
[`supabase/migrations/0004_phase4_storage.sql`](supabase/migrations/0004_phase4_storage.sql)
to create the bucket + RLS. Deployable to Vercel — see [docs/DEPLOY.md](docs/DEPLOY.md).

## What's next (Phase 4 — remaining)

1. **Track B** — real provider integrations (ElevenLabs voice, Stability/OpenAI images, Replicate video).
2. **Track C** — final video rendering (compose scenes + audio + burned-in captions) via a job worker.
3. **Track D** — Paddle + crypto checkout/webhooks; grant credits + monthly allowances on payment.
4. Team workspaces and API access.
