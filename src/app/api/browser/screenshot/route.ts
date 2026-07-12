import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Screenshot capture — DORMANT until a rendering API is configured
 * (SCREENSHOT_API_KEY). Vercel can't reliably run full Chromium, so full-page /
 * region capture is delegated to a screenshot service. Wired here so the UI has
 * a stable endpoint; returns 501 with a clear message until configured.
 */
export function isScreenshotConfigured(): boolean {
  return !!process.env.SCREENSHOT_API_KEY;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isScreenshotConfigured()) {
    return NextResponse.json(
      { error: "Screenshot capture isn't enabled yet. Add a screenshot/rendering API key (SCREENSHOT_API_KEY) to turn it on.", code: "not_configured" },
      { status: 501 }
    );
  }
  // Real capture is added when the rendering provider is chosen + configured.
  return NextResponse.json({ error: "Screenshot provider configured but capture not yet implemented." }, { status: 501 });
}
