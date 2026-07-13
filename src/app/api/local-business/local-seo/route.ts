/**
 * POST /api/local-business/local-seo { locationId, planType }
 * Generates a local content plan (weekly ideas, monthly calendar, service/
 * location topics, seasonal campaigns, FAQ + blog + landing ideas). Credit-
 * metered. No keyword stuffing / misleading location content.
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

  const { locationId, planType } = (await request.json().catch(() => ({}))) as { locationId?: string; planType?: "monthly" | "full" };
  if (!locationId) return NextResponse.json({ error: "Select a business location." }, { status: 400 });
  const type = planType === "full" ? "full" : "monthly";

  const { data: loc } = await supabase.from("local_business_locations").select("business_name, primary_category, address").eq("id", locationId).single();
  if (!loc) return NextResponse.json({ error: "Location not found." }, { status: 404 });

  const charge = await chargeLb(type === "full" ? "full_local_seo_plan" : "monthly_content_plan");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const fallback = {
    weeklyIdeas: ["Business update", "Product/service spotlight", "Customer appreciation", "Local community post"],
    monthlyCalendar: ["Week 1: Announcement", "Week 2: Offer", "Week 3: Educational tip", "Week 4: Behind the scenes"],
    serviceTopics: ["Detail your top service", "Explain your process", "Answer a pricing question"],
    seasonalCampaigns: ["Seasonal promotion", "Holiday hours reminder"],
    faqIdeas: ["What areas do you serve?", "What are your hours?", "How do I book?"],
    blogIdeas: ["Local guide relevant to your business", "How-to for your service"],
    landingIdeas: ["Service + location landing page"],
  };
  let plan = fallback;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 900,
        system: "You are a local marketing planner. Return ONLY JSON {\"weeklyIdeas\":[],\"monthlyCalendar\":[],\"serviceTopics\":[],\"seasonalCampaigns\":[],\"faqIdeas\":[],\"blogIdeas\":[],\"landingIdeas\":[]}. Practical, honest, no keyword stuffing or misleading location claims.",
        messages: [{ role: "user", content: `Business: ${loc.business_name} (${loc.primary_category ?? "local business"}) in ${loc.address ?? "its area"}. Plan type: ${type}.` }],
      });
      const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      plan = { ...fallback, ...p };
    } catch { /* fallback */ }
  }

  await supabase.from("local_business_reports").insert({ user_id: user.id, location_id: locationId, report_type: `local_seo_${type}`, data_json: plan, credits_used: charge.charged });
  return NextResponse.json({ plan, charged: charge.charged });
}
