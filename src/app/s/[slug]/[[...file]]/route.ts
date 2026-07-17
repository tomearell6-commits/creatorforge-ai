/**
 * GET /s/{slug}            -> the published site's index.html
 * GET /s/{slug}/{file}.html -> a specific page of that site
 *
 * Serves websites published from Build Studio. Supabase Storage force-serves
 * HTML as text/plain (their anti-XSS policy), so it can't host pages directly —
 * we stream the stored file and set the real content type here.
 *
 * SECURITY — why this is safe even though it's on our domain:
 * every response carries `Content-Security-Policy: sandbox`, which drops the
 * document into a UNIQUE OPAQUE ORIGIN. It therefore cannot read
 * creatorsforge.io cookies or localStorage, and scripts are disabled outright.
 * Our generated sites are pure HTML+CSS, so full sandbox costs nothing.
 *
 * FRAMING: these responses intentionally omit X-Frame-Options (see
 * next.config.ts, which excludes /s/*) so the in-app preview can embed them.
 * `frame-ancestors` keeps that tight — only our own dashboard may frame a site,
 * everyone else is refused, so a customer's page can't be clickjacked.
 *
 * The public host is env-configurable (SITES_BASE_URL) so these sites can be
 * moved to a dedicated domain later without changing any stored URLs.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "media";

function notFound() {
  return new NextResponse("Site not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Sentinel used by middleware for customer domains: /s/by-host/{host}/{path} */
const BY_HOST = "by-host";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string; file?: string[] }> }) {
  const { slug, file } = await ctx.params;
  if (!slug) return notFound();

  // Public read: visitors aren't signed in, and build_sites is owner-RLS.
  const admin = createAdminClient();

  // A request that arrived on a customer's own domain: resolve host -> site.
  // Only a VERIFIED domain serves, so a stale/hijacked DNS entry can't.
  const byHost = slug === BY_HOST;
  const segments = byHost ? (file ?? []).slice(1) : (file ?? []);
  const host = byHost ? decodeURIComponent((file ?? [])[0] ?? "") : null;
  if (byHost && !host) return notFound();

  const { data: site } = byHost
    ? await admin.from("build_sites").select("storage_path, status, domain_status")
        .eq("custom_domain", host).eq("domain_status", "verified").maybeSingle()
    : await admin.from("build_sites").select("storage_path, status, domain_status")
        .eq("slug", slug).maybeSingle();

  if (!site || site.status !== "published" || !site.storage_path) return notFound();

  // Only ever serve .html files from inside this site's own folder.
  const requested = segments.join("/");
  const name = requested === "" ? "index.html" : requested;
  if (name.includes("..") || name.startsWith("/") || !/^[a-z0-9._/-]+\.html$/i.test(name)) return notFound();

  const { data: blob, error } = await admin.storage.from(BUCKET).download(`${site.storage_path}/${name}`);
  if (error || !blob) return notFound();

  // Pages link to each other with root-relative-looking `href="./about.html"`.
  // A browser resolves those against the current directory, so at `/s/{slug}`
  // (Next strips trailing slashes) `./about.html` becomes `/s/about.html` and
  // 404s. Rewrite those links to the correct absolute base for how this site is
  // being served — `/s/{slug}/` normally, or `/` on a customer's own domain.
  // Surgical: only `href="./…"` is touched, so in-page `#anchors`, mailto:,
  // and absolute asset URLs (hero image, fonts) are left alone.
  const basePath = byHost ? "/" : `/s/${slug}/`;
  const html = (await blob.text()).split('href="./').join(`href="${basePath}`);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Opaque origin (no access to app cookies/localStorage, no scripts) AND
      // framable only by our own dashboard for the in-app preview.
      "Content-Security-Policy": "sandbox; frame-ancestors 'self' https://*.creatorsforge.io https://creatorsforge.io",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "Cache-Control": "public, max-age=60",
    },
  });
}
