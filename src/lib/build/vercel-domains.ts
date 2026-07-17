/**
 * Vercel Domains API client (SERVER-ONLY) — attaches a customer's own domain to
 * our Vercel project so Vercel provisions and renews its SSL certificate.
 *
 * This is how custom domains work for published Build Studio sites. We never
 * fake success: every function returns Vercel's real error text so the UI can
 * show the customer exactly what's wrong with their DNS.
 *
 * Needs VERCEL_TOKEN (can modify the project — treat as a high-value secret) and
 * VERCEL_PROJECT_ID; VERCEL_TEAM_ID when the project lives in a team.
 */
import "server-only";
import { fetchWithTimeout } from "@/lib/http";

const API = "https://api.vercel.com";

export function vercelDomainsConfigured(): boolean {
  return !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Vercel needs a teamId for team-owned projects. Rather than make the operator
 * paste a third value, resolve it from the token itself: a team-scoped token
 * lists exactly the team it can act on. VERCEL_TEAM_ID overrides when an account
 * belongs to several teams and the guess would be ambiguous.
 *
 * Cached for the lifetime of the lambda — the answer can't change under us.
 */
let teamIdCache: string | null | undefined;

async function teamId(): Promise<string | null> {
  if (process.env.VERCEL_TEAM_ID) return process.env.VERCEL_TEAM_ID;
  if (teamIdCache !== undefined) return teamIdCache;
  try {
    const res = await fetchWithTimeout(`${API}/v2/teams?limit=2`, { headers: headers() }, 15_000);
    const j = await res.json().catch(() => ({}));
    const teams: { id: string }[] = j?.teams ?? [];
    // Exactly one team => unambiguous. Zero => personal account, no teamId
    // needed. More than one => we must not guess; the operator sets it.
    teamIdCache = teams.length === 1 ? teams[0].id : null;
  } catch {
    return null; // don't cache a network blip
  }
  return teamIdCache;
}

/** `?teamId=…` (or "") for a Vercel API path. */
async function teamQs(): Promise<string> {
  const id = await teamId();
  return id ? `?teamId=${encodeURIComponent(id)}` : "";
}

function projectId(): string {
  return process.env.VERCEL_PROJECT_ID!;
}

/**
 * Only used when Vercel's config endpoint doesn't tell us where to point. These
 * are their published defaults; the API's own answer always wins.
 */
const FALLBACK_APEX_IP = "76.76.21.21";
const FALLBACK_CNAME = "cname.vercel-dns.com";

/** Hostnames we must never let a customer claim. */
const RESERVED = [/(^|\.)creatorsforge\.io$/i, /(^|\.)creatorsforge\.net$/i, /(^|\.)vercel\.app$/i];

/** Validate a customer-supplied hostname. Returns a normalized host or an error. */
export function normalizeDomain(input: string): { host?: string; error?: string } {
  let host = String(input ?? "").trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!host) return { error: "Enter a domain." };
  if (host.includes(" ") || host.includes("@")) return { error: "That doesn't look like a domain." };
  // Basic hostname shape: labels separated by dots, a real TLD.
  if (!/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(host)) {
    return { error: "That doesn't look like a valid domain (example: mybusiness.com)." };
  }
  if (host.length > 253) return { error: "That domain is too long." };
  if (RESERVED.some((re) => re.test(host))) return { error: "That domain is reserved." };
  return { host };
}

export type DomainConfig = {
  verified: boolean;
  /** DNS records the customer must create, straight from Vercel. */
  records: { type: string; name: string; value: string }[];
  error?: string;
};

/** Attach a domain to the project. Idempotent-ish: an existing domain is fine. */
export async function addDomain(host: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelDomainsConfigured()) return { ok: false, error: "Custom domains aren't configured on the server yet." };
  const project = projectId();
  try {
    const res = await fetchWithTimeout(`${API}/v10/projects/${project}/domains${await teamQs()}`, {
      method: "POST", headers: headers(), body: JSON.stringify({ name: host }),
    }, 20_000);
    const j = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true };
    const code = j?.error?.code;
    // Already attached to THIS project — treat as success.
    if (code === "domain_already_in_use" && j?.error?.projectId === project) return { ok: true };
    if (code === "domain_already_in_use") {
      return { ok: false, error: "That domain is already connected to another project or account." };
    }
    return { ok: false, error: j?.error?.message ?? `Vercel ${res.status}` };
  } catch {
    return { ok: false, error: "Couldn't reach Vercel. Try again in a moment." };
  }
}

/**
 * Read the domain's live status: whether it's verified and, if not, the exact
 * DNS records the customer still needs to add.
 */
export async function getDomainConfig(host: string): Promise<DomainConfig> {
  if (!vercelDomainsConfigured()) return { verified: false, records: [], error: "Custom domains aren't configured on the server yet." };
  const project = projectId();
  const qs = await teamQs();
  try {
    // Project-level record: is Vercel satisfied the domain points here?
    const dRes = await fetchWithTimeout(`${API}/v9/projects/${project}/domains/${encodeURIComponent(host)}${qs}`, { headers: headers() }, 20_000);
    const d = await dRes.json().catch(() => ({}));
    if (!dRes.ok) return { verified: false, records: [], error: d?.error?.message ?? `Vercel ${dRes.status}` };

    // Domain-level config: misconfigured => DNS isn't right yet.
    const cRes = await fetchWithTimeout(`${API}/v6/domains/${encodeURIComponent(host)}/config${qs}`, { headers: headers() }, 20_000);
    const c = await cRes.json().catch(() => ({}));
    const misconfigured = c?.misconfigured !== false;

    const records: { type: string; name: string; value: string }[] = [];
    // Vercel returns challenges when it needs a TXT to prove ownership.
    for (const v of (d?.verification ?? []) as { type: string; domain: string; value: string }[]) {
      records.push({ type: v.type?.toUpperCase() ?? "TXT", name: v.domain, value: v.value });
    }
    if (misconfigured && records.length === 0) {
      // Standard pointing records when no ownership challenge is outstanding.
      // Prefer the target Vercel reports for THIS account: hardcoding their
      // apex IP would silently break every customer's DNS the day it changes.
      const apex = host.split(".").length === 2;
      const ip = c?.recommendedIPv4?.[0]?.value ?? c?.recommendedIPv4?.[0] ?? FALLBACK_APEX_IP;
      const cname = c?.recommendedCNAME?.[0]?.value ?? c?.recommendedCNAME?.[0] ?? FALLBACK_CNAME;
      records.push(apex
        ? { type: "A", name: "@", value: typeof ip === "string" ? ip : FALLBACK_APEX_IP }
        : { type: "CNAME", name: host.split(".")[0], value: typeof cname === "string" ? cname : FALLBACK_CNAME });
    }

    const verified = d?.verified === true && !misconfigured;
    return { verified, records };
  } catch {
    return { verified: false, records: [], error: "Couldn't reach Vercel. Try again in a moment." };
  }
}

/** Detach a domain from the project (on removal or admin takedown). */
export async function removeDomain(host: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelDomainsConfigured()) return { ok: true }; // nothing to detach
  try {
    const res = await fetchWithTimeout(`${API}/v9/projects/${projectId()}/domains/${encodeURIComponent(host)}${await teamQs()}`, {
      method: "DELETE", headers: headers(),
    }, 20_000);
    if (res.ok || res.status === 404) return { ok: true };
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: j?.error?.message ?? `Vercel ${res.status}` };
  } catch {
    return { ok: false, error: "Couldn't reach Vercel." };
  }
}
