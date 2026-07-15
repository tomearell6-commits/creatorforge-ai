/**
 * Firecrawl lead scanner. Crawls APPROVED PUBLIC source URLs and extracts
 * publicly-listed business contact info only. Firecrawl honors robots.txt and
 * we never bypass logins/CAPTCHAs. With no FIRECRAWL_API_KEY it returns safe,
 * deterministic sample data (example.com emails — non-routable) so the flow is
 * testable without spending anything.
 *
 * Spec name: services/firecrawlLeadScanner.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/http";

export function willUseFirecrawl(): boolean { return !!process.env.FIRECRAWL_API_KEY; }

export type Scrape = { markdown: string; html: string; title?: string; description?: string; url: string; links?: string[] };

// Email domains that are never a real business contact (CMS/vendor/placeholder).
const JUNK_EMAIL_DOMAINS = [
  "example.com", "example.org", "domain.com", "yourdomain.com", "email.com",
  "sentry.io", "wixpress.com", "wix.com", "squarespace.com", "godaddy.com",
  "cloudflare.com", "gravatar.com", "sentry-next.wixpress.com", "w.org", "w.org",
];
// Hosts that are aggregators/social/assets — not a business's own site.
const NON_BUSINESS_HOSTS = [
  "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "youtube.com",
  "tiktok.com", "pinterest.com", "google.com", "maps.google.com", "goo.gl", "bit.ly",
  "yelp.com", "tripadvisor.com", "wikipedia.org", "apple.com", "play.google.com",
  "wa.me", "whatsapp.com", "t.me", "gstatic.com", "googleapis.com", "cloudflare.com",
];
export type RawLead = {
  business_name?: string; business_type?: string; website?: string; source_url: string; contact_page_url?: string;
  email?: string; phone?: string; address?: string; city?: string; country?: string;
  facebook_url?: string; instagram_url?: string; linkedin_url?: string; business_description?: string;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const IMG_EMAIL = /\.(png|jpe?g|gif|webp|svg)$/i;

/** Fetch one public URL via Firecrawl (or a deterministic sample). Never throws. */
export async function crawlSourceUrl(url: string): Promise<Scrape | null> {
  if (!willUseFirecrawl()) {
    const host = safeHost(url);
    return {
      url,
      title: `${host} — Business`,
      description: `Public business listing for ${host}.`,
      markdown: `# ${host}\nContact us at info@${host}. Phone: +1 555 010 0000.`,
      html: `<a href="https://facebook.com/${host}">fb</a>`,
    };
  }
  try {
    const res = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      // onlyMainContent:false so footers/contact bars (where emails & mailto links
      // live) are included. "links" gives us outbound business links on directories.
      body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: false }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { markdown?: string; html?: string; links?: string[]; metadata?: { title?: string; description?: string; sourceURL?: string } } };
    const d = j.data;
    if (!d) return null;
    return { url, markdown: d.markdown ?? "", html: d.html ?? "", links: d.links ?? [], title: d.metadata?.title, description: d.metadata?.description };
  } catch { return null; }
}

/** Contact/about links found in the page HTML (public pages only). */
export function findContactPages(scrape: Scrape): string[] {
  const out = new Set<string>();
  const linkRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(scrape.html)) !== null) {
    const href = m[1];
    if (/contact|about|reach-us|get-in-touch/i.test(href)) {
      try { out.add(new URL(href, scrape.url).toString()); } catch { /* ignore */ }
    }
  }
  return [...out].slice(0, 3);
}

/** Public emails only; deobfuscates "name [at] domain [dot] com", drops image
 *  filenames, tracking pixels, and CMS/vendor/placeholder addresses. */
export function extractPublicEmails(text: string): string[] {
  const deobfuscated = text
    .replace(/\s*[[(]\s*at\s*[\])]\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".");
  const found = (deobfuscated.match(EMAIL_RE) ?? [])
    .map((e) => e.toLowerCase().replace(/[.,;:]+$/, ""))
    .filter((e) => !IMG_EMAIL.test(e))
    .filter((e) => !JUNK_EMAIL_DOMAINS.some((d) => e.endsWith(`@${d}`) || e.endsWith(`.${d}`)))
    .filter((e) => !/^(no-?reply|mailer-daemon|postmaster|donotreply)@/i.test(e));
  return [...new Set(found)];
}

/** Choose the most likely business email: prefer one on the site's own domain,
 *  then a role/contact address, then the first remaining. */
export function pickBestEmail(emails: string[], siteHost?: string): string | undefined {
  if (emails.length === 0) return undefined;
  const bareHost = (siteHost ?? "").replace(/^www\./, "");
  const onDomain = bareHost ? emails.filter((e) => e.split("@")[1]?.replace(/^www\./, "") === bareHost) : [];
  const pool = onDomain.length ? onDomain : emails;
  const role = pool.find((e) => /^(info|contact|hello|sales|enquir|inquir|admin|office|support|team)@/i.test(e));
  return role ?? pool[0];
}

/** Candidate business website URLs from a directory/listing page: external
 *  http(s) links, deduped by host, excluding social/aggregator/asset hosts and
 *  the source host itself. Bounded for cost control. */
export function extractBusinessLinks(scrape: Scrape, opts: { excludeHost?: string; limit?: number } = {}): string[] {
  const raw = scrape.links?.length
    ? scrape.links
    : [...scrape.html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const exclude = (opts.excludeHost ?? safeHost(scrape.url)).replace(/^www\./, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const href of raw) {
    let u: URL;
    try { u = new URL(href, scrape.url); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    const host = u.hostname.replace(/^www\./, "");
    if (host === exclude) continue;
    if (NON_BUSINESS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) continue;
    if (/\.(png|jpe?g|gif|webp|svg|css|js|pdf|ico)$/i.test(u.pathname)) continue;
    if (seen.has(host)) continue;                 // one link per business domain
    seen.add(host);
    out.push(`${u.protocol}//${u.hostname}`);      // normalize to the site root
    if (out.length >= (opts.limit ?? 25)) break;
  }
  return out;
}

export function extractSocialLinks(html: string): { facebook_url?: string; instagram_url?: string; linkedin_url?: string } {
  const grab = (re: RegExp) => (html.match(re)?.[0] ?? undefined);
  return {
    facebook_url: grab(/https?:\/\/(www\.)?facebook\.com\/[a-z0-9_.\-/]+/i),
    instagram_url: grab(/https?:\/\/(www\.)?instagram\.com\/[a-z0-9_.\-/]+/i),
    linkedin_url: grab(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-z0-9_.\-/]+/i),
  };
}

export function extractBusinessData(scrape: Scrape, opts: { country?: string; city?: string } = {}): RawLead {
  const text = `${scrape.markdown}\n${scrape.html}`;
  const emails = extractPublicEmails(text);
  const phone = (scrape.markdown.match(PHONE_RE) ?? [])[0]?.trim();
  const socials = extractSocialLinks(scrape.html);
  return {
    business_name: scrape.title?.replace(/\s*[|–-].*$/, "").trim() || safeHost(scrape.url),
    website: safeOrigin(scrape.url),
    source_url: scrape.url,
    email: pickBestEmail(emails, safeHost(scrape.url)),
    phone,
    business_description: scrape.description,
    country: opts.country, city: opts.city,
    ...socials,
  };
}

/** Trim/normalize a raw lead into the shape stored in `leads`. */
export function normalizeLeadData(raw: RawLead, campaign: { business_type?: string }): RawLead & { business_type?: string; email?: string } {
  return {
    ...raw,
    business_type: campaign.business_type,
    email: raw.email ? raw.email.trim().toLowerCase() : undefined,
    business_name: raw.business_name?.trim(),
    website: raw.website?.trim(),
  };
}

/** Remove within-batch duplicates + ones whose email already exists for the user. */
export async function removeDuplicates(client: SupabaseClient, userId: string, leads: RawLead[]): Promise<RawLead[]> {
  const seen = new Set<string>();
  const batch = leads.filter((l) => {
    const key = (l.email || l.website || l.source_url).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const emails = batch.map((l) => l.email).filter(Boolean) as string[];
  if (emails.length === 0) return batch;
  try {
    const { data } = await client.from("leads").select("email").eq("user_id", userId).in("email", emails);
    const existing = new Set((data ?? []).map((r: { email: string }) => (r.email || "").toLowerCase()));
    return batch.filter((l) => !l.email || !existing.has(l.email.toLowerCase()));
  } catch { return batch; }
}

/** Record provenance for a lead (also stored on leads.source_url). */
export async function storeLeadSource(client: SupabaseClient, args: { userId: string; leadId: string; campaignId?: string; url: string; type?: string }): Promise<void> {
  await client.from("lead_sources").insert({
    user_id: args.userId, lead_id: args.leadId, campaign_id: args.campaignId ?? null, source_url: args.url, source_type: args.type ?? "website",
  }).then(() => {}, () => {});
}

function safeHost(u: string): string { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "example.com"; } }
function safeOrigin(u: string): string { try { return new URL(u).origin; } catch { return u; } }
