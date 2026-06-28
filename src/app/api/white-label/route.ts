import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WhiteLabelConfig } from "@/lib/types";

/**
 * White Label (Phase 7 — Module 6). Per-user/agency branding is stored in
 * system_settings under "white_label:user:<id>" (admin client, scoped to the
 * authenticated user's own key — never another user's). Falls back to the
 * platform default in "white_label_default".
 */
const DEFAULT: WhiteLabelConfig = { brandName: "CreatorForge AI", brandColor: "#7c3aed", logoUrl: null };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin.from("system_settings").select("value").eq("key", `white_label:user:${user.id}`).maybeSingle();
  return NextResponse.json({ config: (data?.value as WhiteLabelConfig) ?? DEFAULT });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<WhiteLabelConfig>;
  const config: WhiteLabelConfig = {
    brandName: body.brandName?.trim() || DEFAULT.brandName,
    brandColor: body.brandColor || DEFAULT.brandColor,
    logoUrl: body.logoUrl ?? null,
    customDomain: body.customDomain ?? null,
    emailFrom: body.emailFrom ?? null,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("system_settings")
    .upsert({ key: `white_label:user:${user.id}`, value: config, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config });
}
