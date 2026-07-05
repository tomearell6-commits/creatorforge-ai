import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreProfile } from "@/lib/business/profile";

/** Company Profile Manager: GET profile + score, PUT full update (owner). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  let { data: profile } = await admin.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) {
    const { data: created } = await admin
      .from("company_profiles").insert({ user_id: user.id }).select("*").single();
    profile = created;
  }
  return NextResponse.json({ profile, scoring: scoreProfile(profile ?? {}) });
}

const STRING_FIELDS = [
  "company_name", "description", "industry", "products_summary", "services_summary",
  "target_market", "business_hours", "website", "contact_email", "contact_phone",
  "address", "logo_url", "brand_voice", "mission", "story",
] as const;

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of STRING_FIELDS) {
    if (typeof body[f] === "string") patch[f] = body[f].slice(0, 4000);
  }
  if (body.social_links && typeof body.social_links === "object") patch.social_links = body.social_links;
  if (Array.isArray(body.brand_colors)) patch.brand_colors = body.brand_colors.slice(0, 8);
  if (Array.isArray(body.certificates)) patch.certificates = body.certificates.slice(0, 20);
  if (Array.isArray(body.awards)) patch.awards = body.awards.slice(0, 20);

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("company_profiles")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not save the profile." }, { status: 500 });
  return NextResponse.json({ profile: updated, scoring: scoreProfile(updated) });
}
