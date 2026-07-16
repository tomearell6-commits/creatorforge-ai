/**
 * GET /api/media/proxy?url=<supabase-public-object-url>
 *
 * Streams a video/image from our own Supabase public storage through the
 * creatorsforge.io domain. TikTok's Content Posting API (pull_by_url) only
 * accepts media whose domain is a VERIFIED URL-prefix property — our rendered
 * videos live on *.supabase.co (unverifiable), so we re-serve them from our
 * verified domain here.
 *
 * SSRF-safe: only proxies objects under our own Supabase public storage bucket.
 */
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try { target = new URL(raw); } catch { return new NextResponse("Bad url", { status: 400 }); }

  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  // Allow ONLY our own Supabase public storage objects.
  if (!supa || target.protocol !== "https:" || target.hostname !== supa.hostname || !target.pathname.startsWith("/storage/v1/object/public/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok || !upstream.body) return new NextResponse("Upstream error", { status: 502 });
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    headers.set("Cache-Control", "public, max-age=3600");
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
