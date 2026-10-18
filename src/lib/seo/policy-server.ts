import "server-only";
import { fetchWithTimeout } from "@/lib/http";
import { screenSiteContent, type PolicyVerdict } from "./policy";

const UA = "Mozilla/5.0 (compatible; CreatorsForgeBot/1.0)";

/** Visible text of a site's homepage (title, meta description, body). Null when it cannot be read. */
export async function fetchSiteText(siteUrl: string): Promise<string | null> {
  try {
    const base = siteUrl.replace(/\/+$/, "");
    const res = await fetchWithTimeout(`${base}/`, { headers: { "User-Agent": UA }, redirect: "follow" }, 12_000);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
    const desc = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? "";
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&");
    return `${title} ${desc} ${body}`.replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

/** Screen a live website. Fails OPEN (not blocked) when the site cannot be read, so an outage never pauses a good site. */
export async function screenSite(siteUrl: string): Promise<PolicyVerdict & { checked: boolean }> {
  const text = await fetchSiteText(siteUrl);
  if (!text) return { blocked: false, reasons: [], checked: false };
  return { ...screenSiteContent(text), checked: true };
}
