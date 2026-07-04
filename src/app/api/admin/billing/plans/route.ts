import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Admin plan management. Plans can be repriced, renamed, badged, or disabled
 * here without a deploy — /api/billing/plans merges these rows over the static
 * catalog. Plan IDs are fixed (webhooks and profiles.plan reference them).
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data: plans } = await gate.admin
    .from("subscription_plans")
    .select("*")
    .order("sort_order");
  return NextResponse.json({ plans: plans ?? [] });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => ({}));
  const { id, name, tagline, monthly_price, annual_price, credits, is_active, badge } = body;
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof tagline === "string") patch.tagline = tagline.trim();
  if (typeof monthly_price === "number" && monthly_price >= 0) patch.monthly_price = monthly_price;
  if (annual_price === null || (typeof annual_price === "number" && annual_price >= 0)) patch.annual_price = annual_price;
  if (typeof credits === "number" && credits >= 0) patch.credits = Math.floor(credits);
  if (typeof is_active === "boolean") patch.is_active = is_active;
  if (badge === null || typeof badge === "string") patch.badge = badge;

  const { error } = await gate.admin.from("subscription_plans").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
