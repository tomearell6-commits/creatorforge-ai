import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/** Editable template fields (owner-scoped). */
const FIELDS = ["name", "subject", "preview_text", "body", "cta_label", "cta_url", "sender_name", "signature"] as const;

function pick(b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in b) out[f] = typeof b[f] === "string" ? (b[f] as string) : b[f] ?? null;
  return out;
}

/** GET /api/leads/templates — list the user's outreach templates. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("lead_outreach_templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ templates: data ?? [] });
}

/** POST /api/leads/templates — create a template. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-template-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });

  const { data, error } = await supabase.from("lead_outreach_templates").insert({ user_id: user.id, ...pick(b), name }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ template: data });
}

/** PATCH /api/leads/templates — update a template by id. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-template-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { data, error } = await supabase.from("lead_outreach_templates")
    .update({ ...pick(b), updated_at: new Date().toISOString() })
    .eq("id", b.id).eq("user_id", user.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ template: data });
}

/** DELETE /api/leads/templates?id= — delete a template. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-template-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabase.from("lead_outreach_templates").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
