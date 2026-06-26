# Deployment (Vercel)

CreatorForge AI is a standard Next.js App Router app and deploys cleanly to Vercel.

## Prerequisites

- A Supabase project with the schema applied (`supabase/schema.sql`) and the storage
  bucket created (`supabase/migrations/0004_phase4_storage.sql`).
- The repo pushed to GitHub/GitLab/Bitbucket (or deploy via the Vercel CLI).

## Steps

1. **Import the project** at [vercel.com/new](https://vercel.com/new) and select the repo.
   Framework preset auto-detects **Next.js**; no build settings to change.
2. **Add environment variables** (Project → Settings → Environment Variables) — the same
   values as your local `.env.local`:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
   | `SUPABASE_URL` / `SUPABASE_ANON_KEY` | optional | server-side mirrors |
   | `NEXT_PUBLIC_APP_URL` | recommended | your Vercel URL, e.g. `https://yourapp.vercel.app` |
   | `ANTHROPIC_API_KEY` | optional | enables real Claude script generation |
   | `VOICE_PROVIDER` / `IMAGE_PROVIDER` / `VIDEO_PROVIDER` | optional | default `placeholder` |

3. **Deploy.** Vercel builds and gives you a live URL.

## Supabase auth redirect URLs

In Supabase → **Authentication → URL Configuration**, add your production URL to
**Site URL** and **Redirect URLs** (e.g. `https://yourapp.vercel.app`). For local dev,
`http://localhost:3000` should already be allowed.

## Storage / image notes

- Generated media is served from your Supabase Storage public bucket
  (`https://<ref>.supabase.co/storage/v1/object/public/media/...`). `next.config.mjs`
  already allow-lists `*.supabase.co` for `next/image`.
- The Supabase **free tier** includes ~1 GB of storage — fine for testing; bump the plan
  for production volume.

## Post-deploy smoke test

Visit `/`, sign up, create a project, generate a script, build scenes, and generate a
voiceover + thumbnail — then confirm the files appear in the Asset Library and in your
Supabase Storage `media` bucket.
