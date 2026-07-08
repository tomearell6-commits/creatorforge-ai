# Native Blog + Automated SEO (creatorsforge.io/blog)

A first-party marketing blog on the main domain, powered by the platform's own
SEO Content Studio generator. This is the publishing DESTINATION that lets the
owner automate SEO for creatorsforge.io itself (the SEO Studio + Autopilot were
built to publish to WordPress; creatorsforge.io is Next.js, so it needed its own
blog to publish into).

## The automated workflow
1. **Admin → Blog & SEO** (`/admin/blog`): type a topic/keyword →
   **Generate article**. The platform's `generateSeoPackage()` writes a full,
   SEO-optimized article (title, meta description, headings, body, FAQ, tags).
2. Saved as a **draft** (review) or **published immediately** (checkbox).
3. Optionally **Schedule** a draft for a future date/time → the cron
   auto-publishes it.
4. Published posts appear at **`/blog`** and each at **`/blog/<slug>`**, and are
   automatically added to **`/sitemap.xml`** for Google.

## Files
- Migration `0036_blog.sql` — `blog_posts` (public-read where `status='published'`,
  all writes service-role/admin only; updated_at trigger).
- `src/lib/blog/blog.ts` — types + helpers (slugify, reading-time, date, HTML
  sanitizer, public column list).
- Public pages: `src/app/blog/page.tsx` (listing, ISR 5 min) +
  `src/app/blog/[slug]/page.tsx` (article, full OG/Twitter metadata + BlogPosting
  & FAQPage JSON-LD).
- `src/app/sitemap.ts` — now async; appends published posts (best-effort).
- Admin: `src/app/admin/blog/page.tsx` + `src/components/admin/AdminBlog.tsx`
  (generator form + article table with publish/unpublish/schedule/delete).
- API: `src/app/api/admin/blog/route.ts` (GET/POST/PATCH/DELETE) +
  `.../blog/generate/route.ts` (AI draft via SEO generator, `maxDuration=60`).
- Cron: `src/app/api/cron/blog/route.ts` (publishes due scheduled posts; hourly
  in `vercel.json`; CRON_SECRET fail-closed).
- Article typography: `.blog-content` styles in `globals.css` (no external
  prose plugin).

## Costs
The owner's marketing blog does **not** consume user credits — it's first-party
content generated on the platform's own AI budget. Real AI runs when
`ANTHROPIC_API_KEY` is set; otherwise a deterministic placeholder article is
saved (clearly noted in the admin success message) so the flow always works.

## SEO notes
- Every article emits canonical URL, Open Graph, Twitter Card, and JSON-LD
  (`BlogPosting` + `FAQPage`).
- `robots.txt` already allows `/blog`; `/dashboard`, `/admin`, `/api` stay blocked.
- After publishing a few posts, use Google Search Console → URL Inspection →
  Request Indexing on the new `/blog/<slug>` URLs to speed up first indexing.

## Not included (future)
- Auto-generation from a keyword queue on a schedule (currently the AI writes on
  demand; scheduling applies to publishing, not generation).
- Per-post AI cover-image generation button (posts render a branded gradient
  placeholder when `cover_image_url` is null).
- Categories/tag archive pages and pagination beyond the latest 60.
