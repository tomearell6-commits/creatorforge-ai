import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { safeSourceUrl } from "@/lib/leads/compliance";
import { MAX_LEADS_PER_CAMPAIGN, MAX_SOURCE_URLS } from "@/lib/leads/constants";

/** POST /api/leads/campaigns/create — create a lead search campaign (draft). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-create", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });

  // Validate + SSRF-check every source URL (blocks private IPs / non-public targets).
  const rawUrls = Array.isArray(b.source_urls) ? (b.source_urls as unknown[]).map(String).filter(Boolean).slice(0, MAX_SOURCE_URLS) : [];
  const sourceUrls: string[] = [];
  for (const u of rawUrls) {
    const c = await safeSourceUrl(u);
    if (!c.ok) return NextResponse.json({ error: `Blocked source URL "${u}": ${c.error}` }, { status: 400 });
    sourceUrls.push(c.url);
  }

  const maxLeads = Math.min(MAX_LEADS_PER_CAMPAIGN, Math.max(1, Number(b.max_leads) || 25));
  const { data, error } = await supabase.from("lead_campaigns").insert({
    user_id: user.id, name,
    business_type: (b.business_type as string) ?? null,
    country: (b.country as string) ?? null, city: (b.city as string) ?? null,
    keywords: Array.isArray(b.keywords) ? (b.keywords as unknown[]).map(String).slice(0, 20) : [],
    source_urls: sourceUrls, max_leads: maxLeads,
    require_email: b.require_email !== false, verify_emails: b.verify_emails !== false, sync_to_brevo: b.sync_to_brevo === true,
    status: "draft",
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ campaign: data });
}
