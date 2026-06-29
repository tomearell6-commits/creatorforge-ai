import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { notifyWallet } from "@/lib/credits/wallet";
import { logAudit } from "@/lib/audit";

/**
 * POST { userId, amount, type, reason }
 *   type ∈ bonus | promo | refund | manual_adjustment | admin_adjustment
 *   amount: signed integer (+ grants, − deducts) — applied atomically via the
 *   wallet_adjust() ledger function. Admin-only.
 */
const ALLOWED = new Set(["bonus", "promo", "refund", "manual_adjustment", "admin_adjustment"]);

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const b = (await request.json().catch(() => ({}))) as {
    userId?: string; amount?: number; type?: string; reason?: string;
  };
  if (!b.userId || !b.amount || !Number.isInteger(b.amount)) {
    return NextResponse.json({ error: "userId and a non-zero integer amount are required." }, { status: 400 });
  }
  const type = b.type && ALLOWED.has(b.type) ? b.type : "manual_adjustment";

  const { data, error } = await admin.rpc("wallet_adjust", {
    p_user: b.userId, p_amount: b.amount, p_type: type, p_reason: b.reason ?? `Admin ${type}`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data == null) return NextResponse.json({ error: "Adjustment would overdraw the balance." }, { status: 400 });

  // Mirror into the transaction history.
  await admin.from("credit_transactions").insert({
    user_id: b.userId,
    transaction_type: type === "refund" ? "refund" : (b.amount > 0 ? "bonus" : "adjustment"),
    credit_amount: b.amount, payment_status: "completed", payment_method: "admin",
    payment_reference: `admin:${user.id}`,
  });

  await notifyWallet(admin, b.userId,
    b.amount > 0 ? "credits_added" : "renewed",
    b.amount > 0 ? "Credits added" : "Balance adjusted",
    `${b.amount > 0 ? "+" : ""}${b.amount} credits — ${b.reason ?? type}.`);

  await logAudit(admin, {
    userId: user.id, actorEmail: user.email ?? null, action: "credits.changed",
    targetType: "user", targetId: b.userId, metadata: { amount: b.amount, type, reason: b.reason },
  });

  return NextResponse.json({ ok: true, newBalance: data });
}
