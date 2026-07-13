/**
 * GET /api/social-business/capabilities
 * Provider capability registry + content types + the user's connected accounts,
 * so the UI can honestly show Supported / Limited / Manual / Not-available and
 * which platforms are connected. Owner-scoped, free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSocialAccounts } from "@/lib/social/service";
import { SOCIAL_PROVIDERS } from "@/config/socialProviderCapabilities";
import { SOCIAL_CONTENT_CAPABILITIES } from "@/config/socialContentCapabilities";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getSocialAccounts(supabase);
  const connected = new Set(accounts.filter((a) => a.status === "connected").map((a) => a.provider));

  const providers = Object.values(SOCIAL_PROVIDERS).map((p) => ({ ...p, connected: connected.has(p.id) }));
  const contentTypes = Object.values(SOCIAL_CONTENT_CAPABILITIES).map((c) => ({ id: c.contentType, label: c.label, supportedPlatforms: c.supportedPlatforms }));

  return NextResponse.json({ providers, contentTypes, accounts });
}
