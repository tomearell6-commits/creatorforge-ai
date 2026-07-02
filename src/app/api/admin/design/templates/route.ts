import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Admin management of the shared design_templates catalogue.
 * GET all / POST create / PATCH update / DELETE — all requireAdmin + audited.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("design_templates")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: data });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.name) return NextResponse.json({ ok: false, message: "name is required" }, { status: 400 });

  const { data, error } = await admin
    .from("design_templates")
    .insert({
      name: body.name, category: body.category ?? null, format: body.format ?? null,
      width: body.width ?? 1080, height: body.height ?? 1080, preview_url: body.previewUrl ?? null,
      layers_json: body.layersJson ?? [], brand_compatible: body.brandCompatible ?? true,
      credits_required: body.creditsRequired ?? 0, supported_exports: body.supportedExports ?? ["png", "jpg", "pdf"],
      tags: body.tags ?? [], difficulty: body.difficulty ?? "beginner", industry: body.industry ?? null,
      style: body.style ?? null, is_premium: body.isPremium ?? false, is_featured: body.isFeatured ?? false,
      is_active: body.isActive ?? true, sort_order: body.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.design.template.create", targetType: "design_template", targetId: data.id, metadata: { name: data.name } });
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
    name: "name", category: "category", format: "format", width: "width", height: "height",
    previewUrl: "preview_url", layersJson: "layers_json", brandCompatible: "brand_compatible",
    creditsRequired: "credits_required", supportedExports: "supported_exports", tags: "tags",
    difficulty: "difficulty", industry: "industry", style: "style", isPremium: "is_premium",
    isFeatured: "is_featured", isActive: "is_active", sortOrder: "sort_order",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await admin.from("design_templates").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.design.template.update", targetType: "design_template", targetId: String(body.id) });
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

  const { error } = await admin.from("design_templates").delete().eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.design.template.delete", targetType: "design_template", targetId: body.id });
  return NextResponse.json({ ok: true });
}
