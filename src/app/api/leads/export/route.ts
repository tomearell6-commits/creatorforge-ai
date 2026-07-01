import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { guardLead, logUsage } from "@/lib/leads/access";

/** Columns exported (order matters). */
const COLUMNS = [
  "business_name", "business_type", "website", "source_url", "contact_page_url",
  "email", "phone", "city", "country", "verification_status",
  "email_quality_score", "lead_status", "created_at",
] as const;

/** RFC-4180 CSV field escaping. */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Minimal HTML escaping for the .xls (SpreadsheetML-free) table export. */
function htmlCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * GET /api/leads/export?format=csv|xlsx&listId=&campaignId=
 * Exports the user's leads. Suppressed leads (do_not_contact, unsubscribed) are
 * always excluded. `xlsx` returns an Excel-openable HTML table (.xls), no lib.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "search");
  if (gate instanceof NextResponse) return gate;
  await logUsage(supabase, user.id, "export");

  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";
  const listId = params.get("listId");
  const campaignId = params.get("campaignId");

  // If scoped to a list, resolve member lead ids first (owner-scoped).
  let listLeadIds: string[] | null = null;
  if (listId) {
    const { data: members } = await supabase.from("lead_list_members").select("lead_id").eq("user_id", user.id).eq("list_id", listId);
    listLeadIds = (members ?? []).map((m) => m.lead_id as string);
    if (listLeadIds.length === 0) listLeadIds = ["00000000-0000-0000-0000-000000000000"]; // force empty result
  }

  let q = supabase.from("leads").select(COLUMNS.join(", "))
    .eq("user_id", user.id)
    .eq("do_not_contact", false)
    .not("lead_status", "in", '("unsubscribed","do_not_contact")')
    .order("created_at", { ascending: false })
    .limit(5000);
  if (campaignId) q = q.eq("campaign_id", campaignId);
  if (listLeadIds) q = q.in("id", listLeadIds);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (format === "csv") {
    const lines = [COLUMNS.join(",")];
    for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
      },
    });
  }

  // xlsx → HTML table Excel opens natively.
  const head = `<tr>${COLUMNS.map((c) => `<th>${htmlCell(c)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${COLUMNS.map((c) => `<td>${htmlCell(r[c])}</td>`).join("")}</tr>`).join("");
  const html = `<html><head><meta charset="utf-8"/></head><body><table border="1">${head}${body}</table></body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": 'attachment; filename="leads.xls"',
    },
  });
}
