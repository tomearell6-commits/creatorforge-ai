import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Admin management of Industry Suites.
 * GET   — suites + DB templates + real-estate usage stats.
 * PATCH — { kind: "suite", slug, status } flips a suite's status;
 *         { kind: "template", id, ...fields } updates an industry template.
 * POST  — create an industry template { suiteSlug, name, ... }.
 * DELETE— { id } removes an industry template. All audited.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const [{ data: suites }, { data: templates }] = await Promise.all([
    admin.from("industry_suites").select("*").order("sort_order", { ascending: true }),
    admin.from("industry_templates").select("*").order("sort_order", { ascending: true }),
  ]);

  const countAll = async (table: string) => {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [projects, outputs, walkthroughs, exportsCount] = await Promise.all([
    countAll("real_estate_projects"),
    countAll("real_estate_design_outputs"),
    countAll("real_estate_walkthroughs"),
    countAll("real_estate_exports"),
  ]);

  return NextResponse.json({
    ok: true,
    suites: suites ?? [],
    templates: templates ?? [],
    stats: { projects, outputs, walkthroughs, exports: exportsCount },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.suiteSlug || !body.name) return NextResponse.json({ ok: false, message: "suiteSlug and name are required" }, { status: 400 });

  const { data: suite } = await admin.from("industry_suites").select("id").eq("slug", body.suiteSlug).maybeSingle();
  if (!suite) return NextResponse.json({ ok: false, message: "Suite not found — run migration 0028 first." }, { status: 404 });

  const slug = String(body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const { data, error } = await admin
    .from("industry_templates")
    .insert({
      industry_suite_id: suite.id, name: body.name, slug,
      description: body.description ?? null, output_type: body.outputType ?? "concept_prompt",
      default_prompt: body.defaultPrompt ?? null, estimated_credits: body.estimatedCredits ?? 8,
      is_premium: body.isPremium ?? false, is_featured: body.isFeatured ?? false,
      tags_json: body.tags ?? [], export_formats_json: body.exportFormats ?? ["png", "jpg", "pdf"],
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.industry.template.create", targetType: "industry_template", targetId: data.id, metadata: { name: data.name, suite: body.suiteSlug } });
  return NextResponse.json({ ok: true, template: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { kind?: string; slug?: string; status?: string; id?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }

  if (body.kind === "suite") {
    if (!body.slug || !["active", "coming_soon", "hidden"].includes(body.status ?? "")) {
      return NextResponse.json({ ok: false, message: "slug and a valid status are required" }, { status: 400 });
    }
    const { data, error } = await admin
      .from("industry_suites")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("slug", body.slug)
      .select("slug, status")
      .single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.industry.suite.status", targetType: "industry_suite", targetId: body.slug, metadata: { status: body.status } });
    return NextResponse.json({ ok: true, suite: data });
  }

  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });
  const map: Record<string, string> = {
    name: "name", description: "description", outputType: "output_type", defaultPrompt: "default_prompt",
    estimatedCredits: "estimated_credits", isPremium: "is_premium", isFeatured: "is_featured",
    isActive: "is_active", sortOrder: "sort_order",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await admin.from("industry_templates").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.industry.template.update", targetType: "industry_template", targetId: String(body.id) });
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

  const { error } = await admin.from("industry_templates").delete().eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.industry.template.delete", targetType: "industry_template", targetId: body.id });
  return NextResponse.json({ ok: true });
}
