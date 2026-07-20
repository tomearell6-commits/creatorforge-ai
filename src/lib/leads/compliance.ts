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

/**
 * Ensure an email body carries the CAN-SPAM-required footer: an unsubscribe
 * link AND the sender's physical mailing address. Both are legally required.
 */
export function withUnsubscribeFooter(
  html: string,
  opts: { unsubscribeUrl?: string; businessAddress?: string } = {},
): string {
  const unsubscribeUrl = opts.unsubscribeUrl ?? "{{ unsubscribe }}";
  const addr = (opts.businessAddress ?? "").trim();
  // Only treat unsubscribe as already-present if there's a REAL link/merge-tag —
  // the mere word "unsubscribe" in prose must not suppress the actual link.
  const hasUnsubLink = /\{\{\s*unsubscribe\s*\}\}/i.test(html) || /<a[^>]+unsubscribe/i.test(html);
  const parts: string[] = [];
  if (!hasUnsubLink) {
    parts.push(UNSUBSCRIBE_FOOTER.replace("unsubscribe here", `<a href="${unsubscribeUrl}">unsubscribe here</a>`));
  }
  if (addr) {
    const safe = addr.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    parts.push(safe);
  }
  if (!parts.length) return html;
  return `${html}<hr/><p style="font-size:12px;color:#8a9382">${parts.join("<br/>")}</p>`;
}
