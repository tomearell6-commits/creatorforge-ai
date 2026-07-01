import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { logUsage, COMPLIANCE_POLICY_VERSION } from "@/lib/leads/access";

/**
 * POST /api/leads/compliance/accept — record the user's acceptance of the current
 * Lead Generation Compliance Policy. Captures IP + user agent for the audit trail.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "lead-compliance-accept", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  const userAgent = request.headers.get("user-agent") || null;

  const { error } = await supabase.from("lead_compliance_acceptance").insert({
    user_id: user.id,
    version: COMPLIANCE_POLICY_VERSION,
    ip_address: ip,
    user_agent: userAgent,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logUsage(supabase, user.id, "compliance_accept", `version ${COMPLIANCE_POLICY_VERSION}`);
  return NextResponse.json({ ok: true, version: COMPLIANCE_POLICY_VERSION });
}
