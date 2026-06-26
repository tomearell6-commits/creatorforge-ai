# Media Generation Engine (Phase 3)

Phase 3 turns a generated script into production-ready media assets. Everything is
modular and provider-based, and ships with **placeholder engines** so the full
pipeline works end-to-end without any external API keys.

## Pipeline overview

```
Script (Phase 2)
   │  Scene Builder  → splits script into scenes (title, narration, visual desc,
   │                   image/video prompts, camera direction, transition, duration)
   ├─ Voice Studio   → voiceover audio  ─┐
   ├─ Scene images   → image per scene  ─┤
   ├─ Thumbnails     → 16:9 thumbnail   ─┼─→ assets (+ scene_assets links) → Asset Library
   ├─ Subtitles      → SRT / VTT        ─┘
   └─ Render Queue   → placeholder render job (simulated progress)
```

Every generated file is written to the unified **`assets`** table (the Asset Library
reads this). Scene-level media is also linked through **`scene_assets`** by role
(`image` | `video` | `voice` | `subtitle`) and surfaced on the Scene Builder timeline.

## Provider interfaces

Defined in [`src/lib/media/types.ts`](../src/lib/media/types.ts). Each media type has a
small interface plus an env-driven registry in `src/lib/media/providers/`:

| Type  | Interface       | Registry            | Env var          | Options (default first) |
|-------|-----------------|---------------------|------------------|-------------------------|
| Voice | `VoiceProvider` | `getVoiceProvider()` | `VOICE_PROVIDER` | `placeholder` (WAV tone) · `elevenlabs` |
| Image | `ImageProvider` | `getImageProvider()` | `IMAGE_PROVIDER` | `placeholder` (picsum) · `openai` (gpt-image-1) |
| Video | `VideoProvider` | `getVideoProvider()` | `VIDEO_PROVIDER` | `placeholder` (no-op) |

Voice and image providers return **raw bytes** (`{ data, contentType, … }`); the route
uploads them to Storage. Adding another provider = implement the interface + add a `case`
in the relevant `getXProvider()` switch. **No route or UI change** needed.

### Activating real providers (Phase 4 — Track B)

Real providers are built and **dormant** — set the env vars to switch them on; the app
stays on the free placeholders otherwise.

- **ElevenLabs voice** — `VOICE_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY`. The studio's
  5 voices are mapped to ElevenLabs premade voices; `ELEVENLABS_VOICE_ID` overrides the
  fallback. Returns MP3. (ElevenLabs has no pitch control, so the pitch slider is ignored;
  speed maps to `voice_settings.speed`, clamped 0.7–1.2.)
- **OpenAI images** — `IMAGE_PROVIDER=openai` + `OPENAI_API_KEY`. Uses `gpt-image-1`
  (sizes mapped to the nearest supported aspect; returns JPEG). Powers both scene images
  and thumbnails.
- **Video** — still placeholder; real text-to-video is a later track.

Both real providers cost money per generation — meter usage with the credit system before
a paid launch.

### Final video render (Shotstack — Phase 4)

Rendering an MP4 is too heavy for a Vercel request, so it's offloaded to **Shotstack**
(`src/lib/media/render/shotstack.ts`):

- `buildTimeline()` maps the project's ordered **scenes** (image clips with a zoom effect +
  per-scene narration as **burned-in subtitle captions**) and the latest **voiceover** (audio
  track) into a Shotstack timeline (1280×720 mp4).
- `POST /api/render` submits the render (deducts `CREDIT_COSTS.render` = 5) and stores the
  Shotstack render id on `render_jobs.provider_job_id`.
- `PATCH /api/render {action:"advance"}` (driven by the Render Queue's poll) checks the real
  Shotstack status; on completion it **downloads the MP4, re-uploads it to Supabase Storage**
  (durable URL), adds it to the Asset Library as a `video` asset, and sets `output_url`.
- Without `SHOTSTACK_API_KEY`, the queue falls back to the **placeholder** (simulated progress).

Activate: set `SHOTSTACK_API_KEY` (+ `SHOTSTACK_ENV=stage` sandbox or `v1` production) and run
`supabase/migrations/0005_phase4_render.sql`. Needs scenes with images and/or a voiceover.

### Placeholder behavior

- **Voice** — synthesizes a short sine-tone WAV ([`src/lib/media/audio.ts`](../src/lib/media/audio.ts));
  pitch/speed shift the tone so the controls are audible.
- **Image / Thumbnail** — returns a deterministic [picsum.photos](https://picsum.photos)
  image keyed by the prompt seed.
- **Video** — records the request and returns `status: "placeholder"` with no URL.
- **Render** — `render_jobs` rows simulate progress (advanced client-side every ~1.5s);
  no final video is produced.

### Storage (Phase 4 — Track A)

Generated media is persisted to **Supabase Storage**, not data URIs or external links:

- `src/lib/media/storage.ts` — `uploadMedia` (raw bytes), `uploadFromUrl` (fetch a
  provider URL and re-host it), `deleteMedia` (cleanup on asset delete).
- Files land in the public **`media`** bucket under `<userId>/<type>/<uuid>.<ext>`;
  the durable public URL is stored on the `assets` row (and `voiceovers.audio_url`,
  `thumbnails.image_url`, `scenes.image_url`). The storage `path` is kept in
  `assets.metadata.path` so deleting an asset also removes the underlying file.
- Voice **previews** stay ephemeral (returned as an inline data URI, never stored);
  only **generate** uploads.
- Uploads run under the user's session; storage RLS limits each user to their own folder.
- Setup: run [`supabase/migrations/0004_phase4_storage.sql`](../supabase/migrations/0004_phase4_storage.sql)
  to create the bucket + policies. No new env vars.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/voice/preview` | POST | Short, unsaved voice sample |
| `/api/voice/generate` | POST | Synthesize + save voiceover (+ asset, scene link) |
| `/api/scenes` | POST / PATCH | Build scenes; update one scene / reorder (`{order}`) |
| `/api/images` | POST | Generate a scene image (+ asset, scene link) |
| `/api/thumbnails` | POST | Generate a 16:9 thumbnail (+ asset) |
| `/api/subtitles` | POST / PATCH | Generate SRT/VTT; save edited captions |
| `/api/assets` | GET / DELETE | List (filterable) / delete assets |
| `/api/render` | POST / PATCH | Enqueue job; advance/retry (placeholder) |

All routes authenticate via the Supabase session and verify project ownership; RLS
enforces per-user access on every table.

## Environment variables

```
VOICE_PROVIDER=placeholder
IMAGE_PROVIDER=placeholder
VIDEO_PROVIDER=placeholder
ELEVENLABS_API_KEY=        # Phase 4
STABILITY_API_KEY=         # Phase 4
REPLICATE_API_TOKEN=       # Phase 4
```

## Database

See [DATABASE.md](DATABASE.md) for the full table list. Phase 3 adds `assets`,
`voiceovers`, `thumbnails`, `subtitles`, `render_jobs`, `scene_assets`, and
`media_library`, and extends `scenes` with the richer fields above. Apply
[`supabase/migrations/0003_phase3_media.sql`](../supabase/migrations/0003_phase3_media.sql)
to an existing database (fresh installs get everything from `schema.sql`).
