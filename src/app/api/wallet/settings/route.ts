import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_CRYPTO, CREDIT_PACKAGES } from "@/lib/constants";

/** GET /api/wallet/settings — auto top-up settings for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("wallet_settings")
    .select("auto_topup_enabled, threshold_credits, package_slug, preferred_currency, confirm_required")
    .eq("user_id", user.id).maybeSingle();

  return NextResponse.json({
    settings: data ?? {
      auto_topup_enabled: false, threshold_credits: 100,
      package_slug: null, preferred_currency: "USDT", confirm_required: true,
    },
  });
}

/** PUT /api/wallet/settings — upsert auto top-up settings (owner, RLS-protected). */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as {
    auto_topup_enabled?: boolean; threshold_credits?: number;
    package_slug?: string | null; preferred_currency?: string; confirm_required?: boolean;
  };

  // Validate references against known catalogues.
  if (b.package_slug && !CREDIT_PACKAGES.some((p) => p.slug === b.package_slug)) {
    return NextResponse.json({ error: "Unknown package." }, { status: 400 });
  }
  if (b.preferred_currency && !SUPPORTED_CRYPTO.some((c) => c.code === b.preferred_currency)) {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const { error } = await supabase.from("wallet_settings").upsert({
    user_id: user.id,
    auto_topup_enabled: !!b.auto_topup_enabled,
    threshold_credits: Math.max(0, Number(b.threshold_credits ?? 100)),
    package_slug: b.package_slug ?? null,
    preferred_currency: b.preferred_currency ?? "USDT",
    confirm_required: b.confirm_required ?? true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
