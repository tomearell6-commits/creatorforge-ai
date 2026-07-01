/**
 * Email verification for the Lead Generator. Supports NeverBounce
 * (NEVERBOUNCE_API_KEY) and ZeroBounce (ZEROBOUNCE_API_KEY); if both are set,
 * NeverBounce wins. With neither, a deterministic heuristic keeps the flow
 * testable for free. Only "valid"/"catchall" results are outreach-eligible.
 *
 * Spec name: services/neverbounceVerifier.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerificationStatus } from "./constants";

/** True when any real verification provider is configured (drives credit billing). */
export function willUseNeverBounce(): boolean { return !!(process.env.NEVERBOUNCE_API_KEY || process.env.ZEROBOUNCE_API_KEY); }
function activeProvider(): "neverbounce" | "zerobounce" | "none" {
  if (process.env.NEVERBOUNCE_API_KEY) return "neverbounce";
  if (process.env.ZEROBOUNCE_API_KEY) return "zerobounce";
  return "none";
}

const DISPOSABLE = new Set(["mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com", "yopmail.com", "trashmail.com"]);
const ROLE = /^(info|contact|hello|sales|support|admin|office|team)@/i;

export type VerifyResult = { email: string; result: VerificationStatus; score: number; provider?: string };

/** NeverBounce result → 0–100 quality score. */
export function calculateEmailQualityScore(result: VerificationStatus, email: string): number {
  const base: Record<VerificationStatus, number> = { valid: 95, catchall: 70, unknown: 40, disposable: 10, invalid: 0, failed: 0 };
  let score = base[result];
  if (result === "valid" && ROLE.test(email)) score -= 10; // role addresses slightly lower
  return Math.max(0, Math.min(100, score));
}

/** Map a ZeroBounce status + sub_status to our verification status. */
function mapZeroBounce(status: string, sub: string): VerificationStatus {
  if (sub === "disposable" || sub === "toxic") return "disposable";
  switch (status) {
    case "valid": return "valid";
    case "invalid": return "invalid";
    case "catch-all": return "catchall";
    case "spamtrap": case "abuse": case "do_not_mail": return "invalid";
    default: return "unknown"; // "unknown" and anything else
  }
}

/** Verify one email via the active provider. Never throws. */
export async function verifySingleEmail(email: string): Promise<VerifyResult> {
  const clean = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { email: clean, result: "invalid", score: 0 };
  const domain = clean.split("@")[1];
  const provider = activeProvider();

  if (provider === "none") {
    // Heuristic: disposable domains → disposable; example.com sample → catchall; else valid.
    const result: VerificationStatus = DISPOSABLE.has(domain) ? "disposable" : domain === "example.com" ? "catchall" : "valid";
    return { email: clean, result, score: calculateEmailQualityScore(result, clean), provider: "heuristic" };
  }

  try {
    if (provider === "zerobounce") {
      const params = new URLSearchParams({ api_key: process.env.ZEROBOUNCE_API_KEY!, email: clean });
      const res = await fetch(`https://api.zerobounce.net/v2/validate?${params.toString()}`);
      if (!res.ok) return { email: clean, result: "failed", score: 0, provider };
      const j = (await res.json()) as { status?: string; sub_status?: string };
      const result = mapZeroBounce(j.status ?? "unknown", j.sub_status ?? "");
      return { email: clean, result, score: calculateEmailQualityScore(result, clean), provider };
    }
    // NeverBounce
    const params = new URLSearchParams({ key: process.env.NEVERBOUNCE_API_KEY!, email: clean });
    const res = await fetch(`https://api.neverbounce.com/v4/single/check?${params.toString()}`);
    if (!res.ok) return { email: clean, result: "failed", score: 0, provider };
    const j = (await res.json()) as { result?: string; status?: string };
    const map: Record<string, VerificationStatus> = { valid: "valid", invalid: "invalid", disposable: "disposable", catchall: "catchall", unknown: "unknown" };
    const result = map[j.result ?? "unknown"] ?? "unknown";
    return { email: clean, result, score: calculateEmailQualityScore(result, clean), provider };
  } catch { return { email: clean, result: "failed", score: 0, provider }; }
}

/** Verify a batch (sequential, bounded by the caller). */
export async function verifyBulkEmails(emails: string[]): Promise<VerifyResult[]> {
  const out: VerifyResult[] = [];
  for (const e of emails) out.push(await verifySingleEmail(e));
  return out;
}

/** Persist a verification result to `lead_verifications` and update the lead. */
export async function updateVerificationStatus(client: SupabaseClient, userId: string, leadId: string, r: VerifyResult): Promise<void> {
  await client.from("lead_verifications").insert({ user_id: userId, lead_id: leadId, email: r.email, result: r.result, score: r.score, provider: r.provider ?? "neverbounce" }).then(() => {}, () => {});
  const eligible = r.result === "valid" || r.result === "catchall";
  await client.from("leads").update({
    verification_status: r.result, email_quality_score: r.score,
    lead_status: r.result === "invalid" ? "invalid" : eligible ? "ready" : "verified",
    updated_at: new Date().toISOString(),
  }).eq("id", leadId).eq("user_id", userId);
}

/** Mark clearly-invalid leads so they're excluded from outreach. */
export async function rejectInvalidEmails(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client.from("leads").update({ lead_status: "invalid", updated_at: new Date().toISOString() })
    .eq("user_id", userId).in("verification_status", ["invalid", "disposable", "failed"]).select("id");
  return data?.length ?? 0;
}
