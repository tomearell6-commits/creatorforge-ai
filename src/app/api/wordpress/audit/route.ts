import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { basicAuth, proposeFixes } from "@/lib/seo/wpfix";
import { apiError } from "@/lib/api/respond";

export const maxDuration = 60;

/**
 * POST { siteId } — audit a connected WordPress site and propose meta
 * title/description fixes. Read-only (nothing is changed). Free preview;
 * credits are charged only when the user applies fixes via /api/wordpress/fix.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "wp-audit", 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many audits. Try again shortly." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { siteId?: string };
  if (!b.siteId) return apiError("siteId is required.", 400);

  // RLS scopes wordpress_sites to the owner.
  const { data: site } = await supabase.from("wordpress_sites").select("*").eq("id", b.siteId).single();
  if (!site) return apiError("WordPress site not found. Connect it first in SEO Studio → WordPress Sites.", 404);

  const appPassword = decryptSecret(site.encrypted_application_password);
  if (!appPassword) return apiError("Couldn't read the site credentials — reconnect the site.", 400);

  const auth = basicAuth(site.username, appPassword);
  try {
    const fixes = await proposeFixes(site.site_url, auth);
    return NextResponse.json({ siteId: b.siteId, siteUrl: site.site_url, fixes });
  } catch (e) {
    return apiError(`Audit failed: ${(e as Error).message}`, 502);
  }
}
