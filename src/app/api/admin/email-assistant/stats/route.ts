import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email-assistant/stats — aggregate counts ONLY.
 * Admins never see email content, addresses, subjects, or drafts.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const countAll = async (table: string, filter?: [string, string]) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count } = await q;
    return count ?? 0;
  };

  const [accounts, connected, errored, messages, drafts, sent, attention, rules] = await Promise.all([
    countAll("email_accounts"),
    countAll("email_accounts", ["status", "connected"]),
    countAll("email_accounts", ["status", "error"]),
    countAll("email_messages"),
    countAll("email_draft_replies"),
    countAll("email_draft_replies", ["status", "sent"]),
    countAll("email_attention_items"),
    countAll("email_automation_rules"),
  ]);

  const { data: creditRows } = await admin.from("email_draft_replies").select("credits_used");
  const draftCredits = (creditRows ?? []).reduce((n, r) => n + (r.credits_used ?? 0), 0);
  const { data: reportRows } = await admin.from("email_summary_reports").select("credits_used");
  const summaryCredits = (reportRows ?? []).reduce((n, r) => n + (r.credits_used ?? 0), 0);

  return NextResponse.json({
    ok: true,
    stats: {
      accounts, connected, failedSyncs: errored, messages, drafts, sent, attention, rules,
      creditsUsed: draftCredits + summaryCredits,
    },
  });
}
