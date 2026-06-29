# SEO Content Studio + WordPress Publishing

Generate complete SEO blog packages with AI, edit them, and publish/schedule them
to one or more WordPress sites — modeled on the existing social-publishing workflow.

## Overview

- **Generate:** one keyword + a brief → a full SEO package (title/meta/slug, H1/H2/H3
  outline, full HTML article, FAQ, schema recommendation, image prompts + alt text,
  excerpt, tags, category, social captions, newsletter summary, internal/external
  links, SEO + readability scores).
- **Edit:** an in-app editor for title, meta, slug, body (HTML), tags, category, FAQ.
- **Publish:** to a connected WordPress site as **draft**, **publish now**, or
  **schedule** (WP `future` status). Status + history tracked in CreatorForge.
- **Plan:** a blog calendar (day/week/month) of scheduled + published articles.

## Dashboard modules (under "SEO Studio")

| Page | Route | What |
|---|---|---|
| SEO Dashboard | `/dashboard/seo` | Reports (generated/published/scheduled/drafts/sites/success rate) + recent articles |
| New SEO Article | `/dashboard/seo/new` | Brief form → generate package → editor → publish |
| WordPress Sites | `/dashboard/seo/sites` | Connect/manage multiple WP sites |
| Blog Calendar | `/dashboard/seo/calendar` | Day/week/month view of articles |

Public landing: **`/tools/seo-content-studio`**.

## WordPress integration

- **Connect:** Site URL + WP username + **Application Password**. We validate via
  `GET /wp-json/wp/v2/users/me` and store the password **encrypted** (AES-256-GCM,
  `encrypted_application_password`) — never raw, never returned to the client.
- **Publish** (`lib/seo/publish.ts` → `/wp-json/wp/v2/posts`): title, HTML content,
  excerpt, slug, status (`draft|publish|future` + `date`), categories + tags
  (resolved/created as term IDs), and Yoast/Rank Math SEO meta.
- Multiple sites per user; each article targets one site.

### WordPress Application Password setup (for users)
1. WordPress admin → **Users → Profile → Application Passwords**.
2. Name it "CreatorForge" → **Add New Application Password** → copy it.
3. In CreatorForge → **SEO Studio → WordPress Sites** → enter Site URL, username,
   the application password → **Connect & test**.
> If a managed host strips the `Authorization` header (LiteSpeed/Apache), add the
> header-passthrough rule to `.htaccess` (see `docs/PUBLISHING.md` WordPress notes).

## Database (migration `0009_seo_studio.sql`)

`seo_projects`, `wordpress_sites`, `seo_articles` (rich columns incl.
`outline_json`/`faq_json`/`image_prompts_json`/`alt_text_json` so the spec's child
tables live as JSON), `wordpress_publish_history`. All owner-RLS
(`auth.uid() = user_id`). Run in the Supabase SQL editor (fresh installs get it from
`schema.sql`).

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/seo/generate-article` | POST | Generate full SEO package + save draft (charges credits if real AI) |
| `/api/seo/articles` | GET | List the user's articles |
| `/api/seo/articles/[id]` | GET / PATCH / DELETE | Read / edit / delete an article |
| `/api/wordpress/sites` | GET / POST | List / connect (validate + encrypt) |
| `/api/wordpress/sites/[id]` | DELETE | Disconnect a site |
| `/api/wordpress/publish` | POST | Publish/schedule an article to a site |

## Credit usage (`SEO_CREDIT_COSTS`)

brief 2 · **full article 20** · image prompt 1 · featured image 3 · **publish 2** ·
report 1. Charged only when **real AI** runs (no key = free placeholder). The New
Article form shows the estimate before generating.

## AI prompt architecture

`lib/seo/generate.ts` prompts Claude for a single strict-JSON SEO package (keyword
research, brief, outline, full article, meta, FAQ, schema, captions, newsletter).
Without `ANTHROPIC_API_KEY` it returns a deterministic placeholder package so the
flow always works.

## Security

- Application passwords **encrypted at rest** (AES-256-GCM, `SECRETS_KEY`); never
  exposed to the frontend (list endpoints omit the column).
- WordPress URLs validated; REST responses verified before saving.
- Owner-only RLS on all SEO/WordPress tables — users can only see their own.
- Publishing + generation endpoints **rate-limited**; publish errors logged via
  `captureError` without exposing credentials.

## Environment variables

- `ANTHROPIC_API_KEY` — real SEO generation (else placeholder).
- `SECRETS_KEY` — required to encrypt WordPress passwords (already used app-wide).
- No new variables.

## Testing

1. SEO Studio → New SEO Article → enter a keyword → **Generate** → package appears.
2. Edit title/meta/body → **Save draft**.
3. SEO Studio → WordPress Sites → connect a site (validates live).
4. Back on the article → select the site → **Send draft** / **Publish** / **Schedule**.
5. Confirm the post on WordPress; check status + `wordpress_publish_history`.
6. Blog Calendar shows the scheduled/published article.

## Known limitations

- Featured-image *generation*/upload during WP publish is not yet wired (image
  prompts are generated; upload is a follow-up).
- Keyword Planner / Content Briefs / SEO Reports are folded into the SEO Dashboard
  (no dedicated pages yet).
- Reschedule is via the article editor (no drag-on-calendar yet for blog posts).
- SEO + readability scores are placeholders.
