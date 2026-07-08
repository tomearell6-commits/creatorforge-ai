/**
 * Blog module — shared types + helpers for the native creatorsforge.io blog.
 *
 * The blog is the publishing DESTINATION for the SEO Content Studio: the same
 * generateSeoPackage() output that publishes to WordPress for users can be
 * published to this first-party blog for our own domain. Public pages read
 * published posts via the anon client (RLS allows status='published'); admin
 * routes and the cron write via the service role.
 */

export type BlogStatus = "draft" | "scheduled" | "published";
export type BlogSource = "manual" | "ai" | "autopilot";

export type BlogFaq = { q: string; a: string };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[];
  category: string | null;
  focus_keyword: string | null;
  faq_json: BlogFaq[];
  status: BlogStatus;
  scheduled_for: string | null;
  published_at: string | null;
  author: string;
  source: BlogSource;
  reading_minutes: number;
  seo_score: number | null;
  created_at: string;
  updated_at: string;
};

/** Columns safe to expose on public pages (no internal bookkeeping needed). */
export const PUBLIC_BLOG_COLUMNS =
  "slug,title,meta_title,meta_description,excerpt,content_html,cover_image_url,cover_image_alt,tags,category,faq_json,author,published_at,reading_minutes";

/** URL-safe slug from any string, capped to a sane length. */
export function slugifyBlog(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "post";
}

/** Estimate reading time from HTML (strips tags, ~220 wpm, floor of 1). */
export function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}

/** Human date for article pages, e.g. "July 8, 2026". Deterministic (UTC). */
export function formatBlogDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Very small HTML sanitizer for AI/admin content: drop <script>/<style>/<iframe>
 *  blocks and inline event handlers. Content originates from our own admin +
 *  our own AI generator (not arbitrary users), so this is defense-in-depth. */
export function sanitizeBlogHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
