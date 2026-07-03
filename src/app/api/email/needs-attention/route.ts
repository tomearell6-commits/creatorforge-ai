import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * GET  /api/email/needs-attention — open attention items with message context
 *      and any existing draft, sorted critical-first then by deadline.
 * PATCH { itemId, resolved } — resolve / reopen an item.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("email_attention_items")
    .select("*, email_messages(id, from_name, from_address, subject, snippet, received_at, is_demo, email_classifications(category, summary, is_sensitive), email_draft_replies(id, status, tone))")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .limit(100);
  if (error) return apiError(error.message, 500);

  const items = (data ?? []).sort((a, b) => {
    const p = (ORDER[a.priority] ?? 9) - (ORDER[b.priority] ?? 9);
    if (p !== 0) return p;
    return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
  });

  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ itemId?: string; resolved?: boolean }>(request);
  if (!body?.itemId) return apiError("itemId is required", 400);

  const { data, error } = await supabase
    .from("email_attention_items")
    .update({ resolved: body.resolved ?? true, resolved_at: body.resolved === false ? null : new Date().toISOString() })
    .eq("id", body.itemId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ item: data });
}
