# AI Video Footage — Plan & Recommendation (advisory)

**Goal:** generate **real AI moving footage** per scene (not Ken Burns motion on
still images), then assemble clips + voiceover + captions into the final video.

This is advisory only — not yet implemented. It documents the recommended tools,
cost model, architecture, and a phased plan so you can decide when ready.

---

## 1. The core reality

AI text-to-video models output **short clips (~4–10s each)**, not full videos. So
even with real footage you still need an **assembler** to concatenate the scene
clips and add the voiceover + captions.

```
Scene prompt → AI video model → 5–10s clip   (× each scene)
                                   │
        all clips + voiceover + captions → assembler (ffmpeg or Shotstack) → final MP4
```

So we don't remove the assembler — we **swap the visual source** from still images
to AI video clips, and keep a thin stitching layer.

## 2. Tool options

| Tool | Quality | Cost (approx) | Notes |
|---|---|---|---|
| **fal.ai** (aggregator) ⭐ | Kling/Veo/MiniMax/Luma/Wan in one API | pay-per-use | Best fit — swap models via config; offer fast/premium tiers |
| **Google Veo 3 / 3.1** | Top-tier + native audio | ~$0.20–0.75 / sec | Direct (Gemini/Vertex); premium-only; needs GCP billing |
| **Kling 2.x** | Excellent motion | moderate | via fal.ai / PiAPI |
| **Runway Gen-4 (Turbo)** | Production-grade | ~$0.05–0.12 / sec | Direct API |
| **MiniMax / Hailuo** | Great value | low | via fal.ai — good default for testing |
| **Luma Ray2** | Good | moderate | via fal.ai/direct |
| **Replicate** | Aggregator (alt) | pay-per-use | Similar to fal.ai |

**Recommendation:** **fal.ai** as the video provider. One key → many models, so you
can offer a cheap model (MiniMax/Kling) for most users and a premium model (Veo 3)
for paid tiers — and switch with an env var, matching CreatorForge's provider pattern.

## 3. Cost & latency (the deciding factors)

- **Cost:** 10–100× the image slideshow. A 60s video ≈ 6–10 clips; at ~$0.10–0.50/sec
  that's **~$6–$30 of compute per video** (Veo higher). This must be a **premium /
  paid** feature, and **credits must be repriced** (a real-AI-video render can't be
  the same 5 credits as a slideshow — more like 100–500 credits, or a per-second meter).
- **Latency:** ~1–5 min per clip → a full video can take **10–30 min**. Must run as a
  **background queue**, not a live request (Vercel cron / a worker, polling status).
- **Consistency:** character/style drift between clips is an industry-wide limitation;
  mitigations: strong style prompts, seed reuse, reference images, image-to-video.

## 4. How it fits CreatorForge (clean)

- A dormant **`VIDEO_PROVIDER`** placeholder + `VideoProvider` interface already exist
  in `src/lib/media/providers/` — exactly the seam for this.
- Add **`falVideoProvider`**: input = scene `video_prompt` (+ optional first-frame =
  the scene's generated image for image-to-video consistency); output = a clip URL,
  re-hosted to Supabase Storage like other media.
- **Two render modes** in the Render Queue: **"Slideshow"** (current, cheap) vs
  **"AI Video"** (new, premium). AI Video: generate a clip per scene → assemble.
- **Assembler:** keep Shotstack (it can sequence video clips + audio + captions too),
  or move to an **ffmpeg worker** (the `docker-compose.yml` worker scaffold) to avoid
  per-render API cost once volume grows.

## 5. Phased plan (when you're ready)

1. **Spike (cheap):** integrate fal.ai with **one cheap model** (e.g. MiniMax/Kling),
   generate a single 5s clip from one scene prompt → validate quality + cost.
2. **Per-scene generation + assembly:** loop scenes → clips → stitch with voiceover +
   captions → store MP4. Run in a background job with status polling.
3. **Productize:** "AI Video" premium mode, repriced credits (per-second meter),
   model tiers (fast vs premium/Veo), image-to-video for consistency.
4. **Scale:** move assembly to an ffmpeg worker; add caching/retries; cost dashboards
   in the admin portal.

## 6. Honest recommendation

- **Yes, it's doable** and fits the architecture — but treat it as a **premium feature
  with real per-video cost**, not a free default.
- Start on **fal.ai + a cheap model** to control spend during testing.
- Keep the **slideshow mode** as the free/cheap default; offer **AI Video** as the
  paid upgrade. This protects your unit economics while giving the "real footage" wow.
- Budget a test float (e.g. $20–50) before launching it to customers.

When you want to proceed, the first concrete step is a fal.ai key + the Phase-1 spike.
