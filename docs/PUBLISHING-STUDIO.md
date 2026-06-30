# CreatorForge Publishing Studio

The Publishing Studio is an end-to-end AI book-writing platform: plan a book, generate
a concept and chapter outline, draft and edit chapters with AI assistance, design an
original cover, export the manuscript, and generate launch marketing — all in one place.

## 1. Overview

A book moves through a simple lifecycle:

1. **Create** — set the basics (title, audience, category, style, tone, target length) in the New Book wizard, optionally from a starter template.
2. **Outline** — AI generates a concept (hook, description, objectives, USPs) and a chapter-by-chapter outline; chapter rows are created automatically.
3. **Write** — the Chapter Editor drafts, expands, rewrites, and improves chapters. Everything autosaves and keeps a version history.
4. **Design** — Cover Studio generates original cover artwork.
5. **Export** — download the finished manuscript (TXT / MD / HTML / DOC; PDF via print).
6. **Market** — generate descriptions, blurbs, keywords, social posts, launch emails, press releases, and ad copy.

All content is generated as **original prose/artwork** — prompts explicitly forbid reproducing copyrighted text.

## 2. Dashboard pages

Navigation group **"Publishing Studio"** (`src/components/dashboard/nav-config.ts`):

| Page | Route | Component |
| --- | --- | --- |
| Dashboard | `/dashboard/books` | `BooksList` |
| My Books | `/dashboard/books/library` | `BooksList` (draft / writing / published / archived / favorites filters) |
| New Book | `/dashboard/books/new` | `BookWizard` |
| Book Templates | `/dashboard/books/templates` | `BookTemplates` |
| Chapter Editor | `/dashboard/books/[id]` | `BookEditor` (outline sidebar, AI tools, autosave, version history) |
| Book Marketing | `/dashboard/books/marketing` | `BookMarketing` |
| Cover Studio | `/dashboard/books/cover` | `BookCover` |
| Export Center | `/dashboard/books/export` | `BookExport` |
| Settings | `/dashboard/books/settings` | `BookSettings` (credit model + privacy) |

The Chapter Editor is reached by opening any book; it is not a standalone nav item.

## 3. Database (migration `0020_publishing.sql`)

11 tables, all owner-only RLS (templates are public-read), idempotent (safe to re-run):

`books`, `book_chapters`, `book_versions`, `book_outlines`, `book_templates`,
`book_exports`, `book_covers`, `book_illustrations`, `book_marketing_assets`,
`book_campaigns`, `book_statistics`.

RLS is applied with a loop over the table list; `book_templates` gets a public read policy
and is seeded with 19 starter templates.

## 4. Export formats

`src/lib/books/export.ts` assembles the book from its chapters:

- **Native (free, no AI):** `txt`, `md`, `html`, `doc` (HTML payload, `application/msword`).
- **PDF:** open the HTML export and use the browser's Print → Save as PDF.
- **Roadmap:** EPUB and native DOCX packaging (need a zip/document library).

Exports are gated by auth and ownership (`/api/books/export`), and each export is logged in `book_exports`.

## 5. Marketing workflow

`/api/books/marketing` (GET saved assets, POST generate). Asset types: sales description,
back-cover blurb, author bio, store keywords, social launch posts, launch email,
press release, ad copy. Each generated asset is saved and listed with copy-to-clipboard.

## 6. AI integrations

`src/lib/books/generate.ts` uses Claude (`claude-opus-4-8`) via `@anthropic-ai/sdk`:

- `generateConcept`, `generateOutline`, `generateChapter`
- `chapterTool(action, …)` — `rewrite | expand | shorten | continue | summarize | improve | grammar | examples | tone`
- `generateMarketing`

`willUseRealBookAI()` reports whether a real key is configured. With no `ANTHROPIC_API_KEY`,
deterministic placeholder text is returned so the whole flow is testable for free.
Covers use the shared image provider (`getImageProvider`), placeholder when no key.

## 7. Credit model

Charged **only when real AI runs** (`BOOK_CREDIT_COSTS`):

| Action | Credits |
| --- | --- |
| Concept | 2 |
| Outline | 5 |
| Draft chapter | 10 |
| Chapter AI tool | 2 |
| Cover | 3 |
| Illustration | 3 |
| Marketing asset | 3 |
| Export | Free (text) |

Manual writing, editing, organizing, and text exports never cost credits. Balance checks
happen before generation; deductions only fire when AI actually produced output.

## 8. Testing summary

- `npm run build` passes (App Router types + ESLint).
- Placeholder mode (no keys) exercises create → outline → draft → tools → marketing → export end to end without spending credits.
- With keys, credits are checked pre-generation and deducted post-generation.
- Autosave (debounced PATCH) and version snapshots verified against `/api/books/chapters` and `/api/books/chapters/versions`.

## 9. Security review

- **Ownership everywhere:** every books/* query filters by `user_id`; RLS enforces it at the DB layer too.
- **No cross-user exposure:** chapters, versions, covers, exports, and marketing all scoped to the owner.
- **Protected exports:** `/api/books/export` requires auth + ownership before assembling/downloading.
- **Version history:** prior content is snapshotted before any AI replacement, so nothing is lost.
- **Rate limiting:** chapter generation is rate-limited (`book-chapter`, 30/min).
- **Original content:** generation prompts require original prose/artwork; covers carry no text/logos.

## 10. Future roadmap

- EPUB + native DOCX/PDF packaging (server-side zip/document builder).
- Illustration Studio (in-chapter images) — table + credit cost already in place.
- Publishing calendar + analytics (`book_campaigns`, `book_statistics` tables seeded).
- Collaborative editing and AI book-wide consistency passes.
- One-click publish to KDP / store integrations.
