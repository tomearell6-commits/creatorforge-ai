import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { MONTHLY_CHECKLIST_ITEMS } from "@/lib/operations/registry";

export const dynamic = "force-dynamic";

/** Monthly review checklist. GET current month (creating it if missing) + history; PATCH toggles items. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const month = new Date().toISOString().slice(0, 7);
  let { data: checklist } = await admin.from("operations_review_checklists").select("*").eq("month", month).maybeSingle();

  if (!checklist) {
    const { data: created, error } = await admin
      .from("operations_review_checklists")
      .insert({ month })
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    checklist = created;
    await admin.from("operations_review_items").insert(
      MONTHLY_CHECKLIST_ITEMS.map((it, i) => ({ checklist_id: created.id, item_key: it.key, label: it.label, sort_order: i }))
    );
  }

  const [{ data: items }, { data: history }] = await Promise.all([
    admin.from("operations_review_items").select("*").eq("checklist_id", checklist.id).order("sort_order"),
    admin.from("operations_review_checklists").select("month, status, completed_at").order("month", { ascending: false }).limit(12),
  ]);

  return NextResponse.json({ ok: true, checklist, items: items ?? [], history: history ?? [] });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { itemId?: string; completed?: boolean; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.itemId) return NextResponse.json({ ok: false, message: "itemId is required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.completed !== undefined) {
    patch.completed = body.completed;
    patch.completed_by = body.completed ? (user.email ?? user.id) : null;
    patch.completed_at = body.completed ? new Date().toISOString() : null;
  }
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data: item, error } = await admin.from("operations_review_items").update(patch).eq("id", body.itemId).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Auto-complete the checklist when every item is done.
  const { data: remaining } = await admin
    .from("operations_review_items")
    .select("id", { count: "exact", head: false })
    .eq("checklist_id", item.checklist_id)
    .eq("completed", false);
  await admin.from("operations_review_checklists").update(
    (remaining ?? []).length === 0
      ? { status: "completed", completed_at: new Date().toISOString() }
      : { status: "open", completed_at: null }
  ).eq("id", item.checklist_id);

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.checklist.update", targetType: "operations_review_item", targetId: String(body.itemId) });
  return NextResponse.json({ ok: true, item });
}
