/**
 * GET  /api/social-business/inbox?provider=  — list inbox items (free)
 * POST /api/social-business/inbox            — manually add an item (message/
 *      comment/mention) to classify + draft a reply for, until live provider
 *      inbox retrieval is approved. Auto-classifies. Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SOCIAL_PROVIDERS } from "@/config/socialProviderCapabilities";

function classify(text: string): string {
  const t = text.toLowerCase();
  if (/\b(urgent|asap|emergency|immediately)\b/.test(t)) return "urgent";
  if (/\b(refund|complaint|angry|terrible|worst|disappointed)\b/.test(t)) return "complaint";
  if (/\b(buy|price|quote|order|purchase|interested in)\b/.test(t)) return "sales_lead";
  if (/\b(partner|collab|sponsor|affiliate)\b/.test(t)) return "partnership";
  if (/\b(help|issue|problem|broken|not working|support)\b/.test(t)) return "customer_support";
  if (/\b(free followers|crypto|click here|http)\b/.test(t)) return "spam";
  return "general_question";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider");
  let q = supabase.from("social_inbox_items").select("id, provider, item_type, author, text, classification, status, created_at").order("created_at", { ascending: false }).limit(100);
  if (provider) q = q.eq("provider", provider);
  const { data } = await q;
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { provider?: string; itemType?: string; author?: string; text?: string };
  if (!b.text) return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  const provider = b.provider && b.provider in SOCIAL_PROVIDERS ? b.provider : "instagram";
  const { data, error } = await supabase.from("social_inbox_items").insert({
    user_id: user.id, provider, item_type: b.itemType ?? "message", author: b.author ?? "Customer",
    text: b.text, classification: classify(b.text), received_at: new Date().toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
