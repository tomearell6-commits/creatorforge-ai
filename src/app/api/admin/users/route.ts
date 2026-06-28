import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

/**
 * User management (Phase 7 — Module 2).
 * GET ?q= -> list/search users (profiles).
 * PATCH { userId, action } -> suspend | activate | reset_credits | set_role | set_credits.
 * DELETE { userId } -> delete the auth user (cascades profile + owned rows).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  let query = admin
    .from("profiles")
    .select("user_id, full_name, plan, credits, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { userId, action, value } = await request.json();
  if (!userId || !action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  let auditAction = "user.updated";
  if (action === "suspend") { update.status = "suspended"; auditAction = "user.suspended"; }
  else if (action === "activate") { update.status = "active"; auditAction = "user.activated"; }
  else if (action === "reset_credits") { update.credits = 0; auditAction = "credits.changed"; }
  else if (action === "set_credits") { update.credits = Math.max(0, Number(value) || 0); auditAction = "credits.changed"; }
  else if (action === "set_role") { update.plan = String(value); auditAction = "role.changed"; }
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const { data, error } = await admin.from("profiles").update(update).eq("user_id", userId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(admin, {
    userId: user.id, actorEmail: user.email, action: auditAction,
    targetType: "user", targetId: userId, metadata: { action, value },
  });
  return NextResponse.json({ user: data });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Deleting the auth user cascades to profile and all user-owned rows.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email, action: "user.deleted", targetType: "user", targetId: userId });
  return NextResponse.json({ ok: true });
}
