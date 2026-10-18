import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { cleanFacts } from "@/lib/seo-audit/facts";

/**
 * GET /api/seo-audit/facts?host=example.com  → the business details this user saved for that website.
 * PUT /api/seo-audit/facts { host, facts }    → save them (only known fields, short plain text).
 * Owner only (row level security); the details are used when writing the pages they ask for.
 */
const cleanHost = (h: unknown) => (typeof h === "string" ? h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : "");

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const host = cleanHost(new URL(request.url).searchParams.get("host"));
  if (!host) return apiError("Missing website.", 400);
  const { data } = await supabase.from("seo_business_facts").select("facts").eq("user_id", user.id).eq("host", host).maybeSingle();
  return NextResponse.json({ facts: cleanFacts(data?.facts) });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "seo-audit-facts", 30, 60_000);
  if (!rl.ok) return apiError("Please wait a moment.", 429);
  const body = await readJsonBody<{ host?: string; facts?: unknown }>(request);
  const host = cleanHost(body?.host);
  if (!body || !host) return apiError("Missing website.", 400);
  const facts = cleanFacts(body.facts);
  const { error } = await supabase.from("seo_business_facts").upsert({ user_id: user.id, host, facts, updated_at: new Date().toISOString() }, { onConflict: "user_id,host" });
  if (error) return apiError("Could not save your details. Please try again.", 500);
  return NextResponse.json({ facts });
}
