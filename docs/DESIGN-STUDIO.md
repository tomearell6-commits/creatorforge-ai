# CreatorForge Design Studio

A professional visual-design workspace inside CreatorsForge: templates, an
editable layer-based editor, AI design concepts, brand kits, exports, and a Live
AI Footage Designer for video/motion concepts. Not just an AI image generator — a
full design surface with a structured layer model and export pipeline.

Lives under **Content Studio → Design Studio** (`/dashboard/design`).

---

## Architecture

Everything is driven by config + a small lib, mirroring the rest of the platform.

| Layer | Files |
|-------|-------|
| Taxonomy | `src/config/designStudio.ts` (8 groups, ~70 categories, 9 formats, 12 styles), `src/config/designTemplates.ts` (starter templates) |
| Types & logic | `src/lib/design/{types,layers,credits,generate,footage,render}.ts` |
| API | `src/app/api/design/*` + `src/app/api/admin/design/*` |
| Pages | `src/app/dashboard/design/*` (9 pages) + `src/app/admin/design` |
| Components | `src/components/design/*` (13) |
| Schema | `supabase/migrations/0027_design_studio.sql` (9 tables) |

### Category groups
Social Media · Advertising · Business · Website & SEO · Publishing · Ecommerce ·
Video & Motion · Brand. Each category has a default **format** and a **credit**
estimate. `slug` is the kebab-case of the name, so footer/marketplace labels map
to the wizard automatically.

### Formats
Square 1:1, Portrait 4:5, Story/Reel 9:16, Landscape 16:9, Wide 2:1, Pin 2:3,
A4, US Letter, Custom. Positions/sizes in the layer model are **percentages**
(0–100) so a design scales cleanly across export sizes.

---

## Layer system

`DesignLayerData` (`src/lib/design/types.ts`) is the editor's contract and the
`design_layers` row shape.

- **Types:** text, image, shape, icon, background, video, audio, animation, overlay.
- **Per-layer:** position (x/y %), size (w/h %), rotation, opacity, z-index,
  `styleJson` (color/font/fill/gradient/effects), `contentJson` (text/url/shape kind),
  locked, visible.
- Helpers in `layers.ts`: `createLayer`, `duplicateLayer`, `normalizeZIndex`, `blankCanvas`.
- Editor state + undo/redo live in the `useDesignEditor` hook; the four editor
  components (`DesignEditorCanvas`, `DesignToolbar`, `DesignLayerPanel`,
  `DesignPropertiesPanel`) all consume the same api object.

### Editing (first version)
Functional skeleton with a real, dependency-free canvas: add/edit/move/resize/
lock/duplicate/delete/reorder layers, text + color + font + opacity + transform
editing, undo/redo, save version, and export. Drag-to-move is pointer-based.
Advanced free-form editing (snapping, multi-select, rich effects) is designed to
layer on top later without schema changes.

---

## AI design generation

`generate.ts → generateDesignConcept(input)` returns a structured `DesignConcept`
(title, description, design prompt, suggested colors + typography, layout
structure, image prompt, text copy, CTA, export format, and **ready-to-edit
layers**). Uses Claude (`claude-opus-4-8`) when `ANTHROPIC_API_KEY` is set,
otherwise a deterministic placeholder — so the flow always works and placeholder
runs are free. Guarantees a background + headline layer so the editor never opens
empty.

## Live AI Footage Designer

`footage.ts → generateFootageConcept(input)` turns a scene idea + shot parameters
(subject, camera, lighting, background, motion, platform, duration, aspect ratio)
into a `FootageConcept`: video prompt (ready for Kling/Veo/Luma), scene script,
shot list, camera direction, visual style, thumbnail-frame prompt, voiceover, and
caption. Surfaced at `/dashboard/design/video-graphics` with a storyboard view and
"Send to Video Studio / Ad Studio" hand-offs. Saved to `video_graphic_concepts`.

---

## Template system

Ships with a built-in starter catalogue (`designTemplates.ts`, valid
`DesignLayer[]` snapshots) so the gallery is never empty. Admins can add DB
templates (`design_templates`, world-readable/active) via
`/api/admin/design/templates`; `GET /api/design/templates` merges both.
Filterable by category, format, style, difficulty. "Use template" creates a
project seeded with the template's layers and opens the editor.

## Brand kit integration

`brand_design_kits` stores logo, colors, fonts, tone, description, image + CTA
style. `BrandKitSelector` manages kits and applies palettes in the editor
(`applyBrandColors`) and the wizard. Concept generation accepts a `brandKitId`
so the AI writes on-brand copy and colors.

---

## Exports

Client-side, dependency-free rasterizer (`render.ts`) draws the layer model to a
canvas: **PNG** and **JPG** download directly (free); **PDF** opens a print view
of the rendered image (1 credit); **MP4/GIF** are recorded as `processing` —
architecture in place for animated export later. Every export is logged to
`design_exports` and listed at `/dashboard/design/exports`.

---

## Credit rules (`credits.ts`)

Manual editing is **always free**. Billed only on a successful **real-AI** result:

| Action | Credits |
|--------|---------|
| AI design concept | per-category (default 6) |
| AI image / background | 8 / 4 |
| AI prompt assist | 1 |
| Live footage concept | 10 |
| Premium template | 15 |
| PNG / JPG export | 0 (free) |
| PDF export | 1 |
| MP4 / animated export | 20 |

Estimates show before generation; routes pre-check the balance and return **402**
with `{ required, balance }` when short. Placeholder (no API key) runs are free.

---

## Database (migration 0027)

`design_projects`, `design_layers`, `design_assets`, `design_versions`,
`design_exports`, `brand_design_kits`, `design_generation_jobs`,
`video_graphic_concepts` — all owner-RLS (`auth.uid() = user_id`). Plus the
shared `design_templates` (RLS: world-read active rows, service-role writes).
**Run migration 0027 in the Supabase SQL editor before using the studio.**

## Admin controls

`/admin/design` (`AdminDesign`) shows usage metrics (designs, exports, templates,
brand kits, footage concepts, failed jobs, credits used) and manages the template
catalogue: create, feature/unfeature, show/hide, delete — all `requireAdmin` and
audit-logged (`admin.design.template.*`).

## Security

Owner-scoped RLS on all user tables; asset registration validates http(s) URLs
and caps length; AI output is original (no copying of third-party designs); private
assets are never exposed. Manual edits never touch the network beyond save/export.

## Integration points

- **Sidebar:** Workspace → Design Studio (`nav-config.ts`) + Content Studio section (`studios.ts`).
- **Homepage:** Studios showcase + Template Marketplace (`studio: "Design"`).
- **Global Create menu:** design category slugs redirect to the wizard
  (`create/[categorySlug]` → `/dashboard/design/new?category=…`).
- **Footer:** "AI Design Studio" column.
- **Assistant:** Design Studio knowledge in `assistant/prompt.ts`.
- **Guided tours:** create-first-design, use-template-design, apply-brand-kit,
  export-design, live-footage-design (`tours.ts`).

## Testing

`src/lib/design/design.test.ts` covers credit rules, layer helpers, config
integrity, and both placeholder AI generators. Manual QA flow: new project →
category/format → generate concept → edit text/layers → apply brand kit → save
version → export PNG/JPG/PDF → live footage prompt → send to Video Studio →
credit usage reflects only real-AI actions.

---

# Professional Industry Suites

Design Studio scales by industry via **Industry Suites** (`/dashboard/design/industries`)
— dedicated workspaces so users only see what their industry needs, instead of
one giant template library.

**Registry:** `src/config/industrySuites.ts` — 13 suites (Real Estate &
Architecture · Ecommerce · Restaurant & Hospitality · Healthcare · Education ·
Legal · Finance · Construction · Automotive · Fashion & Beauty · Travel &
Tourism · Event Management · Manufacturing). Real Estate is `active`; the rest
are `coming_soon` and already visible on the hub. Adding a suite later = flip
status + add category groups + templates. Admins can also seed/extend suites and
templates in the DB (`industry_suites` / `industry_suite_categories` /
`industry_templates`, migration 0028) without a deploy; the API merges config +
DB catalogues.

## Real Estate & Architecture Suite

`/dashboard/design/industries/real-estate-architecture` — the first active suite.

- **Categories:** 10 groups / ~120 categories (Architectural Concepts, Floor Plan
  Concepts, Exterior, Interior, Landscape, Construction & Materials, Real Estate
  Marketing, Property Branding, 3D Visualization, Real Estate Documents).
- **Wizard:** project basics (type, property, location, climate, plot, floors,
  beds/baths, budget, target market) + design direction (styles, roof, materials,
  landscape, brand) + one of 9 output types (Concept Prompt · Floor Plan ·
  Interior · Exterior · Landscape · Marketing Asset · Presentation · Storyboard ·
  Walkthrough).
- **Structured AI output** (`src/lib/design/realestate.ts → RealEstateConcept`):
  project summary, design concept, style direction, materials, color palette,
  space-planning notes, interior/exterior/landscape image prompts, marketing
  copy, listing description, social captions, video storyboard, walkthrough
  script, recommended export format and the **mandatory disclaimer**.
- **AI Property Walkthrough Designer** (suite tab): property + camera/lighting/
  music/voiceover/platform → scene list, camera movement, drone shot concepts,
  interior/exterior camera paths, voiceover script, caption, video prompt,
  thumbnail prompt, social description. Hands off to Video Studio, Ad Studio and
  the Publishing Calendar.
- **Templates:** 24 built-in (`src/config/industryTemplates.ts`) — Luxury Villa,
  Family House, Hotel, Hospital, Investment Deck, Listing Flyer, Facebook Ad,
  Walkthrough Video, etc. Each defines output type, required inputs, default
  prompt, credits, export formats and tags. Viewing templates is free.
- **Exports:** PDF (print view, 1 credit), prompt package JSON (free), copy
  image prompts (free); all recorded in `real_estate_exports`.
- **Credits:** per output type — concept/interior/exterior/landscape 8, floor
  plan 10, marketing 6, presentation 12, storyboard 10, walkthrough 12. Billed
  only on real-AI success; 402 pre-check; placeholder runs free.
- **Data:** `real_estate_projects`, `real_estate_design_outputs`,
  `real_estate_walkthroughs`, `real_estate_exports` (owner RLS, migration 0028).
- **Admin:** `/admin/design` → Industry Suites panel — activate/hide suites,
  create/feature/hide/delete DB industry templates, RE usage stats. Audited
  (`admin.industry.*`).

## Safety

Every generated concept carries: *"CreatorForge.io generates conceptual design,
marketing, and visualization materials. Architectural, engineering, legal, and
construction decisions should be reviewed by qualified professionals before use.
AI-generated floor plan concepts are not certified drawings."* The wizard,
suite overview and concept views all display it; the AI system prompts enforce
the conceptual-only framing.

---

# AI Image Rendering (fal.ai FLUX)

`src/lib/design/image.ts` + `POST /api/design/image` turn concept prompts into
real images in-app — no more copy-pasting prompts elsewhere.

- **Model:** FLUX 1.1 Pro **Ultra** (2K premium renders) via fal.ai (`FAL_IMAGE_MODEL` overrides; `FAL_KEY`
  already live). Sizes clamp to ≤1440px, multiples of 8, aspect preserved.
- **Persistence:** provider URLs are temporary, so every render is rehosted to
  Supabase Storage (`uploadFromUrl`) and registered in `design_assets`
  (source `ai`, prompt kept for provenance) + a `design_generation_jobs` row.
- **Where it surfaces:**
  1. Real Estate concept view — "Render images with AI" (Exterior / Interior /
     Landscape cards, download buttons)
  2. Design editor — AI-image bar under the toolbar; result lands on the canvas
     as a new image layer
  3. Design Assets — "Generate with AI" form
- **Billing:** `DESIGN_CREDIT_COSTS.aiImage` (8) charged only on real-AI
  success; 402 pre-check; 10 renders/min per user rate limit; placeholder
  (picsum) is free when FAL_KEY is absent.
