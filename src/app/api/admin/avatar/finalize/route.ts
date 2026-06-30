import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { captureError } from "@/lib/logger";

/**
 * POST { url, title, category?, description?, duration?, level?, sort_order?, publish? }
 * Downloads the finished avatar video, rehosts it to Supabase storage (so the URL
 * is permanent), and adds it to the tutorials library.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const b = (await request.json().catch(() => ({}))) as Record<string, string | number | boolean>;
  const url = String(b.url ?? "");
  const title = String(b.title ?? "");
  if (!url || !title) return NextResponse.json({ error: "url and title are required." }, { status: 400 });

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: `Could not download video (${res.status}).` }, { status: 502 });
    const bytes = Buffer.from(await res.arrayBuffer());
    const path = `tutorials/${slug(title)}-${Date.now()}.mp4`;

    const up = await admin.storage.from("media").upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (up.error) return NextResponse.json({ error: `Storage upload failed: ${up.error.message}` }, { status: 500 });
    const publicUrl = admin.storage.from("media").getPublicUrl(path).data.publicUrl;

    const { error } = await admin.from("tutorials").insert({
      title, description: (b.description as string) ?? null, category: (b.category as string) ?? "Getting Started",
      video_url: publicUrl, duration: (b.duration as string) ?? null, level: (b.level as string) ?? "beginner",
      sort_order: Number(b.sort_order ?? 0), is_published: b.publish !== false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, videoUrl: publicUrl });
  } catch (e) {
    captureError(e, { category: "api", feature: "avatar", stage: "finalize" });
    return NextResponse.json({ error: "Finalize failed." }, { status: 500 });
  }
}

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tutorial"; }
