import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { uploadFromUrl } from "@/lib/media/storage";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";
import { isScreenshotConfigured, buildScreenshotUrl } from "@/lib/browser/screenshot";
import { apiError } from "@/lib/api/respond";

export const maxDuration = 60;

const COST = 3; // credits per capture (covers the rendering API)
const DEVICE_WIDTH: Record<string, number> = { desktop: 1280, tablet: 768, mobile: 390 };

/** GET — list the user's saved screenshots. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("browser_screenshots")
    .select("id,url,kind,image_url,width,created_at").order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ screenshots: data ?? [], configured: isScreenshotConfigured() });
}

/** POST { url, fullPage?, device? } — capture a screenshot via the rendering
 *  API, store it in Supabase, and charge COST. Dormant (501) until configured. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isScreenshotConfigured()) {
    return NextResponse.json(
      { error: "Screenshots aren't enabled yet. Add a SCREENSHOT_API_KEY (e.g. ScreenshotOne) in Vercel to turn on capture.", code: "not_configured" },
      { status: 501 }
    );
  }

  const rl = await limitRequestAsync(request, "browser-screenshot", 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many captures. Try again shortly." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { url?: string; fullPage?: boolean; device?: string };
  if (!b.url) return apiError("A URL is required.", 400);

  const check = await validateAuditUrl(b.url.trim());
  if (!check.ok) return apiError(check.error, 400);
  const url = check.url.toString();

  if ((await getCreditBalance()) < COST) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
  }

  const fullPage = b.fullPage !== false; // default full page
  const width = DEVICE_WIDTH[b.device ?? "desktop"] ?? 1280;

  let upload;
  try {
    const providerUrl = buildScreenshotUrl({ url, fullPage, width });
    upload = await uploadFromUrl(supabase, { userId: user.id, type: "image", sourceUrl: providerUrl, ext: "png", contentType: "image/png" });
  } catch {
    return NextResponse.json({ error: "Capture failed — the page may block rendering, or the screenshot service errored." }, { status: 502 });
  }

  const kind = fullPage ? "full" : "viewport";
  const { data: row } = await supabase.from("browser_screenshots")
    .insert({ user_id: user.id, url, kind, image_url: upload.url, width })
    .select("id,url,kind,image_url,width,created_at").single();

  await deductCredits(COST, "browser_screenshot");

  return NextResponse.json({ ok: true, screenshot: row, charged: COST });
}
