import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** Admin coupon management (bonus-credit promos applied at top-up). */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data: coupons } = await gate.admin
    .from("billing_coupons").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ coupons: coupons ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { code, description, kind, value, max_uses, expires_at } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !/^[A-Z0-9_-]{3,32}$/i.test(code)) {
    return NextResponse.json({ error: "Code must be 3–32 letters/numbers." }, { status: 400 });
  }
  if (!["bonus_credits_pct", "bonus_credits_flat"].includes(kind) || typeof value !== "number" || value <= 0) {
    return NextResponse.json({ error: "Provide a kind and a positive value." }, { status: 400 });
  }

  const { error } = await gate.admin.from("billing_coupons").insert({
    code: code.toUpperCase(),
    description: typeof description === "string" ? description : null,
    kind,
    value: Math.floor(value),
    max_uses: typeof max_uses === "number" ? Math.floor(max_uses) : null,
    expires_at: expires_at ?? null,
  });
  if (error) return NextResponse.json({ error: error.message.includes("duplicate") ? "That code already exists." : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { id, is_active } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "id and is_active required" }, { status: 400 });
  }
  await gate.admin.from("billing_coupons").update({ is_active }).eq("id", id);
  return NextResponse.json({ ok: true });
}
