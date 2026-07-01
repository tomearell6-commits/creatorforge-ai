import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateLeadAccess, COMPLIANCE_POLICY_VERSION } from "@/lib/leads/access";

/** GET /api/leads/access/status — the signed-in user's Lead Generator access state + policy version. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await evaluateLeadAccess(supabase, user.id, !!user.email_confirmed_at);
  return NextResponse.json({ access, policyVersion: COMPLIANCE_POLICY_VERSION });
}
