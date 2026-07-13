/**
 * POST /api/local-business/optimize { locationId, section }
 * AI-improves one profile section (description, services, appointment CTA, …).
 * Returns current vs recommended with reason/priority/impact; stores the
 * recommendation. Credit-metered. Nothing is written to the live profile here —
 * the user applies changes explicitly.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeLb } from "@/lib/local-business/service";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId, section } = (await request.json().catch(() => ({}))) as { locationId?: string; section?: string };
  if (!locationId || !section) return NextResponse.json({ error: "locationId and section are required." }, { status: 400 });

  const { data: loc } = await supabase.from("local_business_locations").select("business_name, primary_category, description, website, address").eq("id", locationId).single();
  if (!loc) return NextResponse.json({ error: "Location not found." }, { status: 404 });

  const charge = await chargeLb("description_optimize");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const current = section === "description" ? (loc.description ?? "") : "";
  let recommended = current, reason = "", impact = "medium";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 400,
        system: "You improve Google Business Profile fields. Return ONLY JSON {\"recommended\":\"…\",\"reason\":\"…\",\"impact\":\"low|medium|high\"}. Accurate to the business, no ranking promises, no keyword stuffing.",
        messages: [{ role: "user", content: `Business: ${loc.business_name} (${loc.primary_category ?? "uncategorized"}), ${loc.address ?? ""}\nSection: ${section}\nCurrent: ${current || "(empty)"}\nWrite an improved ${section}.` }],
      });
      const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      recommended = String(p.recommended || current); reason = String(p.reason || ""); impact = String(p.impact || "medium");
    } catch { reason = "AI unavailable — kept current text."; }
  } else {
    recommended = current || `${loc.business_name} — ${loc.primary_category ?? "local business"} serving ${loc.address ?? "your area"}.`;
    reason = "Deterministic suggestion (set ANTHROPIC_API_KEY for AI).";
  }

  const priority = current.trim().length === 0 ? "high" : "medium";
  const { data: rec } = await supabase.from("local_business_recommendations").insert({
    user_id: user.id, location_id: locationId, section, current_value: current, recommended_value: recommended,
    reason, priority, impact, status: "suggested",
  }).select("id").single();

  return NextResponse.json({ id: rec?.id, section, current, recommended, reason, priority, impact, charged: charge.charged });
}
