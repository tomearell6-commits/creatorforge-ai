/**
 * POST /api/social/quick-post — publish a short TEXT post right now to the
 * user's connected LinkedIn / Facebook / X accounts. No video or heavy content
 * required (unlike the main Publishing Center). Text-only platforms only —
 * Instagram/Pinterest/TikTok need media, so they're not offered here.
 *
 * Uses the same live adapters as every other publish path, and never fakes
 * success: each destination returns the real provider result or an honest error.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { publishToSocialPlatform } from "@/lib/publishing/social-live";
import type { SocialPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Platforms whose live adapter supports a text-only post. */
export const TEXT_CAPABLE = ["linkedin", "facebook", "x"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ text?: string; destinations?: string[]; visibility?: "public" | "private" }>(request);
  const text = (body?.text ?? "").trim();
  if (!text) return apiError("Write something to post.", 400);
  if (text.length > 3000) return apiError("Keep your post under 3000 characters.", 400);

  const wanted = [...new Set(body?.destinations ?? [])].filter(
    (d): d is (typeof TEXT_CAPABLE)[number] => (TEXT_CAPABLE as readonly string[]).includes(d),
  );
  if (!wanted.length) return apiError("Pick at least one connected account (LinkedIn, Facebook or X).", 400);

  const visibility = body?.visibility === "private" ? "private" : "public";

  // Publish to each destination independently — one failing never blocks the rest.
  const results = await Promise.all(
    wanted.map(async (platform) => {
      try {
        const r = await publishToSocialPlatform(supabase, platform as SocialPlatform, {
          title: text, description: "", hashtags: [], visibility,
        });
        return { platform, ok: r.ok, url: r.url ?? null, error: r.error ?? null };
      } catch (e) {
        return { platform, ok: false, url: null, error: e instanceof Error ? e.message : "Post failed" };
      }
    }),
  );

  return NextResponse.json({ results });
}
