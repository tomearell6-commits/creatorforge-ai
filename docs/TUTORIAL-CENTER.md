# Demo Video & Tutorial Center

Walkthrough videos for every major module. Watching is ALWAYS free — credits
are only spent by ADMINS generating assets (avatar videos via HeyGen, AI
thumbnails via FLUX at 8 credits).

## Surfaces

- **Public** `/tutorials` — published videos only (RLS `is_published`); homepage
  navbar "Watch Demo", hero, footer CTA and the embedded demo video all lead here.
- **Dashboard** `/dashboard/tutorials` — the Tutorial Center: search, the 7
  category filters, continue-watching strip, per-video progress + completion
  badges, related tutorials, and a **CTA end card** after each video
  ("Enable 2FA", "Top Up Credits", …) driven by `cta_label`/`cta_url`.
  Linked from Manage → Settings → "Watch Demo & Tutorials" and the Support page.
- **Admin** `/admin/tutorials` — CRUD with the 7-category select, CTA fields,
  publish/unpublish (syncs `status`), per-tutorial **AI thumbnail** button,
  and started/completed analytics. The avatar generator panel (HeyGen pipeline)
  renders presenter videos from scripts.

## Catalog (migration 0035)

7 categories seeded (`tutorial_categories`): Getting Started, Account &
Security, Create, Grow, Manage, Business Operations, Admin & Infrastructure.
The 11 live videos were re-mapped into the taxonomy with slugs + CTAs; the
full spec catalog is seeded as **28 additional records with
`status='planned'`, `is_published=false`** — users never see a promised video;
admin publishes each after generating it. The required security tutorial
(`secure-your-account`) ships with its complete 6-section script in
`transcript`, ready for the avatar generator, CTA "Secure My Account".

Tables: tutorials (extended: slug/transcript/status/target_route/cta_label/
cta_url/version), tutorial_categories, tutorial_assets, tutorial_progress
(owner RLS; watched_seconds + completed_at), tutorial_playlists (seeded
"New User Onboarding"), tutorial_generation_jobs.

## Thumbnails

Two tiers:
1. **Automatic, free** — `lib/tutorials/thumb.ts` renders a branded 1280×720
   SVG data-URI (white bg, lime accent, wrapped bold title, Watch button) used
   as the poster wherever `thumbnail_url` is empty. No black boxes, ever.
2. **Premium, admin-generated** — `/api/admin/tutorials/thumbnail` renders a
   FLUX image from a branded prompt, rehosts it to storage (fal URLs are
   temporary), records a tutorial_asset + generation job, charges 8 admin
   credits only on real-AI success.

## Progress

`/api/tutorials/progress` GET/POST. The player saves position every 10s and
marks complete at 90% (`COMPLETE_THRESHOLD`) or on `ended`. Free.

## Script standards

`SCRIPT_TEMPLATE` (config/tutorialCatalog.ts): Welcome → What it does → When
to use → Steps → Safety/billing notes → Final action. Tone: professional,
friendly, clear, short, no exaggeration.

## Known gaps

- 28 planned tutorials need their videos generated (admin avatar pipeline) —
  publish each as it's ready.
- Screen-recording assets are a kind in tutorial_assets but there's no
  in-platform recorder; record externally and paste the URL.
- Playlists table is seeded and readable but the UI orders by category;
  playlist-driven ordering is a future improvement.
