import "server-only";
import { fetchWithTimeout } from "@/lib/http";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";

export type PageInfo = { title: string; description: string; h1: string; headings: string[]; text: string };

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&nbsp;/g, " ");
const strip = (h: string) => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Read what a public page currently says (title, description, headings, opening text). Null if it cannot be read. */
export async function readPage(url: string): Promise<PageInfo | null> {
  const ok = await validateAuditUrl(url);
  if (!ok.ok) return null;
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CreatorsForgeBot/1.0)" }, redirect: "follow" }, 12_000);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 500_000);
    const pick = (re: RegExp) => decode(re.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const h1 = strip(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "");
    const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 10);
    const main = /<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i.exec(html)?.[1] ?? html;
    return { title, description, h1, headings, text: strip(main).slice(0, 1800) };
  } catch {
    return null;
  }
}
