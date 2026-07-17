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

function auth(): { headers: Record<string, string>; project: string; teamQs: string } {
  return {
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    project: process.env.VERCEL_PROJECT_ID!,
    teamQs: process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "",
  };
}

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
  const { headers, project, teamQs } = auth();
  try {
    const res = await fetchWithTimeout(`${API}/v10/projects/${project}/domains${teamQs}`, {
      method: "POST", headers, body: JSON.stringify({ name: host }),
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
  const { headers, project, teamQs } = auth();
  try {
    // Project-level record: is Vercel satisfied the domain points here?
    const dRes = await fetchWithTimeout(`${API}/v9/projects/${project}/domains/${encodeURIComponent(host)}${teamQs}`, { headers }, 20_000);
    const d = await dRes.json().catch(() => ({}));
    if (!dRes.ok) return { verified: false, records: [], error: d?.error?.message ?? `Vercel ${dRes.status}` };

    // Domain-level config: misconfigured => DNS isn't right yet.
    const cRes = await fetchWithTimeout(`${API}/v6/domains/${encodeURIComponent(host)}/config${teamQs}`, { headers }, 20_000);
    const c = await cRes.json().catch(() => ({}));
    const misconfigured = c?.misconfigured !== false;

    const records: { type: string; name: string; value: string }[] = [];
    // Vercel returns challenges when it needs a TXT to prove ownership.
    for (const v of (d?.verification ?? []) as { type: string; domain: string; value: string }[]) {
      records.push({ type: v.type?.toUpperCase() ?? "TXT", name: v.domain, value: v.value });
    }
    if (misconfigured && records.length === 0) {
      // Standard pointing records when no ownership challenge is outstanding.
      const apex = host.split(".").length === 2;
      records.push(apex
        ? { type: "A", name: "@", value: "76.76.21.21" }
        : { type: "CNAME", name: host.split(".")[0], value: "cname.vercel-dns.com" });
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
  const { headers, project, teamQs } = auth();
  try {
    const res = await fetchWithTimeout(`${API}/v9/projects/${project}/domains/${encodeURIComponent(host)}${teamQs}`, {
      method: "DELETE", headers,
    }, 20_000);
    if (res.ok || res.status === 404) return { ok: true };
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: j?.error?.message ?? `Vercel ${res.status}` };
  } catch {
    return { ok: false, error: "Couldn't reach Vercel." };
  }
}
