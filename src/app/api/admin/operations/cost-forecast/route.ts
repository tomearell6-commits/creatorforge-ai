import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cost forecast. Fixed costs come from operations_providers.monthly_cost;
 * unit-economics metrics derive from live platform counts. Persists a
 * snapshot per month so trends build up over time.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);

  const { data: providers } = await admin
    .from("operations_providers")
    .select("provider_id, name, category, monthly_cost")
    .gt("monthly_cost", 0);

  const byProvider: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let currentCost = 0;
  for (const p of providers ?? []) {
    const c = Number(p.monthly_cost) || 0;
    currentCost += c;
    byProvider[p.name] = c;
    byCategory[p.category] = (byCategory[p.category] ?? 0) + c;
  }

  const countAll = async (table: string) => {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [users, renders, articles, campaigns, designs] = await Promise.all([
    countAll("profiles"), countAll("render_jobs"), countAll("seo_articles"),
    countAll("lead_campaigns"), countAll("design_projects"),
  ]);

  // Growth-based forecast: last month's snapshot vs this month's fixed cost.
  const lastMonthKey = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const { data: prev } = await admin.from("operations_cost_forecasts").select("current_cost").eq("month", lastMonthKey).maybeSingle();
  const growth = prev?.current_cost ? Math.max(0, (currentCost - Number(prev.current_cost)) / Number(prev.current_cost)) : 0.1;
  const forecastedCost = Math.round(currentCost * (1 + growth) * 100) / 100;

  const metrics = {
    activeUsers: users,
    costPerUser: users > 0 ? Math.round((currentCost / users) * 100) / 100 : null,
    costPerVideo: renders > 0 ? Math.round((currentCost / renders) * 100) / 100 : null,
    costPerArticle: articles > 0 ? Math.round((currentCost / articles) * 100) / 100 : null,
    costPerLeadCampaign: campaigns > 0 ? Math.round((currentCost / campaigns) * 100) / 100 : null,
    costPerDesign: designs > 0 ? Math.round((currentCost / designs) * 100) / 100 : null,
  };

  await admin.from("operations_cost_forecasts").upsert(
    {
      month, current_cost: currentCost, forecasted_cost: forecastedCost,
      by_provider_json: byProvider, by_feature_json: byCategory, metrics_json: metrics,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "month" }
  );

  const { data: history } = await admin
    .from("operations_cost_forecasts")
    .select("month, current_cost, forecasted_cost")
    .order("month", { ascending: false })
    .limit(12);

  const topDrivers = Object.entries(byProvider).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return NextResponse.json({
    ok: true, month, currentCost, forecastedCost, byProvider, byCategory, metrics, topDrivers, history: history ?? [],
  });
}
