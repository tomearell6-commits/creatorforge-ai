import type { MetadataRoute } from "next";

const BASE = "https://www.creatorsforge.io";

// Phase 8 — Module 14 (SEO). Allow public pages; keep app/admin/api private.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api"] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
