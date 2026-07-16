/**
 * GET /api/social/tiktok/creator-info
 *
 * Queries TikTok's Content Posting API creator_info endpoint for the signed-in
 * user's connected TikTok account. Powers the TikTok Direct-Post compliance UI
 * (posting-as username, the allowed privacy levels, and which interactions the
 * creator permits). TikTok REQUIRES this call before a Direct Post.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";

export const maxDuration = 30;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: acct } = await supabase
    .from("social_accounts")
    .select("access_token, account_name")
    .eq("platform", "tiktok").eq("status", "connected")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (!acct) return NextResponse.json({ ok: false, error: "Connect your TikTok account first (Manage → Integrations)." });

  const token = decryptSecret(acct.access_token ?? null);
  if (!token) return NextResponse.json({ ok: false, error: "TikTok authorization is missing — reconnect the account." });

  let j: {
    error?: { code?: string; message?: string };
    data?: {
      creator_username?: string; creator_nickname?: string;
      privacy_level_options?: string[];
      comment_disabled?: boolean; duet_disabled?: boolean; stitch_disabled?: boolean;
      max_video_post_duration_sec?: number;
    };
  };
  try {
    const r = await fetchWithTimeout("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }, 20_000);
    j = await r.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't reach TikTok. Try again in a moment." });
  }
  if (j.error && j.error.code && j.error.code !== "ok") {
    const reconnect = /token|auth|expired|invalid/i.test(`${j.error.code} ${j.error.message}`);
    return NextResponse.json({
      ok: false,
      error: `${j.error.message ?? "TikTok error"}${reconnect ? " — reconnect your TikTok account." : ""} (${j.error.code})`,
    });
  }

  const d = j.data ?? {};
  return NextResponse.json({
    ok: true,
    username: d.creator_username ?? null,
    nickname: d.creator_nickname ?? null,
    options: d.privacy_level_options ?? [],
    commentDisabled: !!d.comment_disabled,
    duetDisabled: !!d.duet_disabled,
    stitchDisabled: !!d.stitch_disabled,
    maxDurationSec: d.max_video_post_duration_sec ?? null,
  });
}
