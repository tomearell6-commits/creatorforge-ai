import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inquiryLooksSensitive } from "@/lib/business/ai";

/** Inquiry Center: list/create/update (owner). */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const admin = createAdminClient();
  let q = admin
    .from("business_inquiries")
    .select("*, inquiry_replies(id, draft_text, tone, status, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data: inquiries } = await q;
  return NextResponse.json({ inquiries: inquiries ?? [] });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.subject && !body?.message) {
    return NextResponse.json({ error: "Provide a subject or message." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: created, error } = await admin.from("business_inquiries").insert({
    user_id: user.id,
    source: "manual",
    customer_name: typeof body.customer_name === "string" ? body.customer_name.slice(0, 200) : null,
    customer_email: typeof body.customer_email === "string" ? body.customer_email.slice(0, 200) : null,
    customer_phone: typeof body.customer_phone === "string" ? body.customer_phone.slice(0, 60) : null,
    subject: String(body.subject ?? "").slice(0, 300),
    message: String(body.message ?? "").slice(0, 8000),
    is_sensitive: inquiryLooksSensitive(`${body.subject ?? ""} ${body.message ?? ""}`),
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not save the inquiry." }, { status: 500 });
  return NextResponse.json({ inquiry: created });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (["new", "in_progress", "replied", "closed", "spam"].includes(body.status)) patch.status = body.status;
  if (["low", "normal", "high", "critical"].includes(body.priority)) patch.priority = body.priority;
  if (typeof body.deadline === "string" || body.deadline === null) patch.deadline = body.deadline;

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("business_inquiries").update(patch).eq("id", body.id).eq("user_id", user.id).select("*").maybeSingle();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ inquiry: updated });
}
