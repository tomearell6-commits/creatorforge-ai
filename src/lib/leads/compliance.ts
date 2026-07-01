/**
 * Lead Generator compliance guardrails. Public business data only; every action
 * that touches outreach is logged. URL validation reuses the SEO-audit SSRF
 * checker (blocks private IP ranges, non-http(s), etc.).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";
import { UNSUBSCRIBE_FOOTER, SUPPRESSED_STATUSES, OUTREACH_ELIGIBLE, type LeadStatus, type VerificationStatus } from "./constants";

export type ComplianceAction =
  | "scan" | "skip_robots" | "extract" | "verify" | "sync" | "send"
  | "suppress_dnc" | "suppress_unsub" | "suppress_invalid" | "blocked_url";

export async function logCompliance(
  client: SupabaseClient,
  userId: string,
  action: ComplianceAction,
  detail: string,
  refs: { leadId?: string; campaignId?: string } = {},
): Promise<void> {
  await client.from("lead_compliance_logs").insert({
    user_id: userId, action, detail, lead_id: refs.leadId ?? null, campaign_id: refs.campaignId ?? null,
  }).then(() => {}, () => {});
}

/** Validate + normalize a source URL; blocks private IPs / non-public targets (SSRF). */
export async function safeSourceUrl(input: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const check = await validateAuditUrl(input);
  if (!check.ok) return { ok: false, error: check.error };
  return { ok: true, url: check.url.toString() };
}

/** A lead may be contacted only if not suppressed, not DNC, and email is outreach-eligible. */
export function canContact(lead: { lead_status?: string | null; do_not_contact?: boolean | null; verification_status?: string | null; email?: string | null }): { ok: boolean; reason?: ComplianceAction } {
  if (!lead.email) return { ok: false, reason: "suppress_invalid" };
  if (lead.do_not_contact) return { ok: false, reason: "suppress_dnc" };
  if (SUPPRESSED_STATUSES.includes((lead.lead_status ?? "") as LeadStatus)) {
    return { ok: false, reason: lead.lead_status === "unsubscribed" ? "suppress_unsub" : lead.lead_status === "do_not_contact" ? "suppress_dnc" : "suppress_invalid" };
  }
  if (!OUTREACH_ELIGIBLE.includes((lead.verification_status ?? "unknown") as VerificationStatus)) {
    return { ok: false, reason: "suppress_invalid" };
  }
  return { ok: true };
}

/** Ensure an email body carries the required unsubscribe footer. */
export function withUnsubscribeFooter(html: string, unsubscribeUrl = "{{ unsubscribe }}"): string {
  if (html.toLowerCase().includes("unsubscribe")) return html;
  const footer = UNSUBSCRIBE_FOOTER.replace("unsubscribe here", `<a href="${unsubscribeUrl}">unsubscribe here</a>`);
  return `${html}<hr/><p style="font-size:12px;color:#8a9382">${footer}</p>`;
}
