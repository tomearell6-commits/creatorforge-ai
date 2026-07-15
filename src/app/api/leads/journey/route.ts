/**
 * GET /api/leads/journey — progress for the guided Lead → Outreach journey.
 * Returns per-step completion (from the user's real data), provider readiness
 * (so users see which API keys are live), and the sender-profile status. Drives
 * the step-by-step stepper on the Lead Generator overview.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { willUseFirecrawl } from "@/lib/leads/firecrawl";
import { willUseNeverBounce } from "@/lib/leads/neverbounce";
import { willUseBrevo } from "@/lib/leads/brevo";

const VERIFIED_STATUSES = ["verified", "ready", "synced", "contacted", "opened", "clicked", "replied"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const head = { count: "exact" as const, head: true };
  const [sender, leads, verified, lists, templates, campaigns] = await Promise.all([
    supabase.from("lead_sender_profiles").select("id", head),
    supabase.from("leads").select("id", head),
    supabase.from("leads").select("id", head).in("lead_status", VERIFIED_STATUSES),
    supabase.from("lead_lists").select("id", head),
    supabase.from("lead_outreach_templates").select("id", head),
    supabase.from("lead_campaigns").select("id", head),
  ]);

  return NextResponse.json({
    providers: {
      firecrawl: willUseFirecrawl(),
      verify: willUseNeverBounce(),
      brevo: willUseBrevo(),
    },
    counts: {
      senderProfile: sender.count ?? 0,
      leads: leads.count ?? 0,
      verified: verified.count ?? 0,
      lists: lists.count ?? 0,
      templates: templates.count ?? 0,
      campaigns: campaigns.count ?? 0,
    },
  });
}
