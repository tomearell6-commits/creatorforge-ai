import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** GET — list all packages (incl. inactive) for the admin portal. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data } = await gate.admin
    .from("credit_packages")
    .select("id, slug, name, usd_price, credits, bonus, sort_order, is_active")
    .order("sort_order", { ascending: true });
  return NextResponse.json({ packages: data ?? [] });
}

/**
 * POST { action: "create"|"update"|"disable"|"enable", ... }
 * Admins manage the credit package catalogue.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const b = (await request.json().catch(() => ({}))) as {
    action?: string; id?: string; slug?: string; name?: string;
    usd_price?: number; credits?: number; bonus?: number; sort_order?: number;
  };

  switch (b.action) {
    case "create": {
      if (!b.slug || !b.name || b.usd_price == null || b.credits == null) {
        return NextResponse.json({ error: "slug, name, usd_price, credits are required." }, { status: 400 });
      }
      const { error } = await admin.from("credit_packages").insert({
        slug: b.slug, name: b.name, usd_price: b.usd_price, credits: b.credits,
        bonus: b.bonus ?? 0, sort_order: b.sort_order ?? 99,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "update": {
      if (!b.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ["name", "usd_price", "credits", "bonus", "sort_order"] as const) {
        if (b[k] != null) patch[k] = b[k];
      }
      const { error } = await admin.from("credit_packages").update(patch).eq("id", b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "disable":
    case "enable": {
      if (!b.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      const { error } = await admin.from("credit_packages")
        .update({ is_active: b.action === "enable", updated_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
