import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Admin: Build Studio stats + DB template management (audited). */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const countAll = async (table: string) => {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [projects, exportsCount, templates] = await Promise.all([
    countAll("build_projects"), countAll("build_project_exports"), countAll("build_templates"),
  ]);
  const { data: creditRows } = await admin.from("build_projects").select("credits_used");
  const creditsUsed = (creditRows ?? []).reduce((n, r) => n + (r.credits_used ?? 0), 0);
  const { data: dbTemplates } = await admin.from("build_templates").select("*").order("sort_order");

  return NextResponse.json({ ok: true, stats: { projects, exports: exportsCount, templates, creditsUsed }, templates: dbTemplates ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.name) return NextResponse.json({ ok: false, message: "name is required" }, { status: 400 });

  const { data, error } = await admin.from("build_templates").insert({
    name: body.name, category: body.category ?? null, project_type: body.projectType ?? null,
    description: body.description ?? null, default_idea: body.defaultIdea ?? null,
    estimated_credits: body.estimatedCredits ?? 20, tags: body.tags ?? [],
    is_premium: body.isPremium ?? false, is_featured: body.isFeatured ?? false,
  }).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.build.template.create", targetType: "build_template", targetId: data.id });
  return NextResponse.json({ ok: true, template: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { id?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const map: Record<string, string> = {
    name: "name", description: "description", defaultIdea: "default_idea", estimatedCredits: "estimated_credits",
    isPremium: "is_premium", isFeatured: "is_featured", isActive: "is_active", sortOrder: "sort_order",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await admin.from("build_templates").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.build.template.update", targetType: "build_template", targetId: String(body.id) });
  return NextResponse.json({ ok: true, template: data });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const { error } = await admin.from("build_templates").delete().eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.build.template.delete", targetType: "build_template", targetId: body.id });
  return NextResponse.json({ ok: true });
}
