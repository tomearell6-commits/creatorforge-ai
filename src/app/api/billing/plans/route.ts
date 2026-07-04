import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/constants";
import { COMPARISON_ROWS, COMPARISON_GROUPS } from "@/config/billing";

/**
 * GET /api/billing/plans — plan catalog + comparison matrix + user's plan.
 * Static PLANS are the base; admin edits in subscription_plans (price, badge,
 * active flag, credits) override them without a deploy.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("plan").eq("user_id", user.id).maybeSingle();

  const admin = createAdminClient();
  const { data: dbPlans } = await admin
    .from("subscription_plans")
    .select("id, name, tagline, monthly_price, annual_price, credits, is_custom, is_active, badge, sort_order")
    .order("sort_order");

  const merged = PLANS.map((p) => {
    const db = dbPlans?.find((d) => d.id === p.id);
    return {
      id: p.id,
      name: db?.name ?? p.name,
      tagline: db?.tagline ?? p.tagline ?? "",
      price: db ? Number(db.monthly_price) : p.price,
      annualPrice: db?.annual_price != null ? Number(db.annual_price) : p.annualPrice ?? null,
      credits: db?.credits ?? p.credits,
      custom: db?.is_custom ?? p.custom ?? false,
      active: db?.is_active ?? true,
      badge: db?.badge ?? p.badge ?? null,
      features: p.features,
    };
  }).filter((p) => p.active);

  return NextResponse.json({
    currentPlan: profile?.plan ?? "free",
    plans: merged,
    comparison: { groups: COMPARISON_GROUPS, rows: COMPARISON_ROWS },
  });
}
