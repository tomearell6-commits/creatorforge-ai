# CreatorsForge Design System

One design language across all six Studios and the marketing site. This documents
the tokens and the shared primitives every screen should use instead of ad-hoc markup.

## Tokens

Defined in `tailwind.config.ts` + `src/app/globals.css` (HSL CSS variables, light/dark).

- **Brand (lime):** `brand-50 … brand-900`. Primary `brand-500` (#84cc16); bright CTA `brand-300`; hover `brand-400`/`brand-600`.
- **Ink (headings on light):** `ink` (#0f1b0a), `ink-soft` (secondary text).
- **Semantic surfaces (theme-aware):** `background`, `foreground`, `card`, `border`, `muted`, `muted-foreground`. Always prefer these over raw `gray-*` so dark mode works.
- **Status hues:** brand/lime = success, `amber-*` = warning, `red-*` = danger/error, `blue-*` = info.
- **Font:** Inter via `next/font` (`--font-sans`).
- **Radius/shadow:** cards `rounded-xl`/`rounded-2xl`, `shadow-sm` default, `shadow-md/lg` on hover. Pills `rounded-full`.

## Core primitives (`src/components/ui/`)

| Primitive | Use for | Key props |
| --- | --- | --- |
| `Button` | All actions | `variant` (primary/accent/secondary/outline/ghost), `size`, `asChild` |
| `Card`, `CardTitle`, `CardDescription` | Surfaces | `className` |
| `Input`, `Textarea`, `Label` | Forms | native attrs |
| `Badge` | Statuses, plans, counts, tags | `variant` (default/brand/success/warning/danger/info/outline), `dot` |
| `Spinner`, `LoadingState` | Inline + full-area loading | `size`, `label` (a11y) |
| `Skeleton`, `SkeletonCard` | Load placeholders (no layout shift) | `className`, `lines` |
| `EmptyState` | Zero-data states | `icon`, `title`, `description`, `actionLabel`, `href`/`onAction` |
| `Alert` | Validation / error / success / warning | `variant`, `title`, `action` (e.g. retry) |

### When to use which

- **Status pill?** → `<Badge>`, never an inline `rounded-full px-2 text-xs` span.
- **Loading?** → `<Spinner>` inline, `<LoadingState>` for a panel, route `loading.tsx` for navigation. Skeletons when you know the final shape.
- **No data?** → `<EmptyState>` — always give it an action that moves the user forward.
- **Something to tell the user?** → `<Alert>`. `error`/`warning` get `role="alert"`; recoverable failures pass a retry `action`.

## Motion

CSS-only (no animation library). Utilities in `globals.css`: `cf-reveal`/`.is-visible`
(scroll reveal via the `Reveal` component), `cf-drift`/`cf-drift-slow` (gradient blobs),
`cf-glow` (CTA pulse), `cf-fade`, `cf-slide-in`. **All gated by `prefers-reduced-motion`.**
Keep motion subtle: hover lifts (`-translate-y-0.5/1`), icon `scale-110`, 200–600ms easing.

## Accessibility baseline

- Icon-only buttons must have `aria-label`.
- Inputs need a `<Label>` or `aria-label`.
- Spinners carry an `sr-only` label + `role="status"`.
- Accordions/menus set `aria-expanded`.
- Use semantic landmarks (`header`/`main`/`nav`/`section`/`footer`).
- Respect `prefers-reduced-motion` (handled globally for `cf-*`).

## Performance

- Server components by default; `"use client"` only where interactivity is needed.
- Route-level `loading.tsx` for instant navigation feedback.
- Lazy/`unoptimized` images where remote; SVG/icons over raster for marketing visuals.
- No animation lib; IntersectionObserver reveals disconnect after firing.

## Icon system

One internal library, one brand-mark component — no mixed icon packs, no emoji or
clip-art in the UI chrome.

### Internal icons — Lucide (only)

- **Library:** [`lucide-react`](https://lucide.dev) is the single approved icon set for all CreatorsForge features. Do not introduce Heroicons/Tabler/Font Awesome/emoji as UI icons.
- **Sizing:** `h-4 w-4` (inline/labels), `h-5 w-5` (default/buttons/list rows), `h-6 w-6` (card headers), `h-7 w-7`+ (hero/empty-state). Keep Lucide's default stroke (2px) — don't override per-icon.
- **Spacing:** icon + text use `gap-2` (or `gap-1.5` in dense pills).
- **Color:** icons inherit `currentColor`. Use semantic tokens only — `text-brand-600` (primary), `text-muted-foreground` (secondary), and `text-amber-*/red-*/blue-*` strictly for warning/error/info. Never hardcode hex on an icon.
- **Studio icons (canonical, from `config/studios.ts`):** Content → `Video`, Marketing → `Megaphone`, Publishing → `BookOpen`, Automation → `Workflow`, Analytics → `BarChart3`, Business → `Briefcase`. These are reused everywhere a Studio is shown (sidebar, dashboard cards, hubs, footer).
- **Tool/category icons** live in `config/studios.ts` (per tool) and `config/contentCategories.ts`; assign one Lucide glyph per tool and reuse it consistently.

### Brand marks — `components/icons/BrandIcon.tsx`

Official platform logos are NOT in Lucide, so they live in one component using
authentic [Simple Icons](https://simpleicons.org) path data (inlined — no runtime
dependency). Marks are never stretched, recolored, or distorted.

```tsx
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
<BrandIcon platform="wordpress" title="WordPress" />   // labelled (role=img + <title>)
<BrandIcon platform="x" monochrome className="h-4 w-4" /> // decorative, single-color UI
{hasBrandIcon(id) && <BrandIcon platform={id} />}        // guard for unknown platforms
```

- **Covered (16):** youtube, tiktok, instagram, facebook, linkedin, x, pinterest, wordpress, google, anthropic, elevenlabs, paddle, supabase, cloudflare, github, brevo.
- **Color:** official brand color by default; near-black marks (x, tiktok, github, anthropic, elevenlabs) use `currentColor` so they survive dark mode; pass `monochrome` for consistent single-color rows (e.g. footer).
- **Accessibility:** decorative by default (`aria-hidden`); pass `title` to expose a labelled image. When the mark sits inside an already-labelled control (e.g. an `<a aria-label>`), leave it decorative.
- **Omitted:** OpenAI (and other marks companies have asked icon sets to drop) — `hasBrandIcon` returns false so callers fall back to a neutral Lucide icon. Don't fabricate path data.
- **Used in:** Connected Ad Accounts, Social Accounts, homepage footer. Extend by adopting `BrandIcon` wherever a platform is named.

### Convenience wrappers

- **`PlatformIcon`** (`components/icons/PlatformIcon.tsx`) — give it a platform id/name; renders the `BrandIcon` when one exists, else a neutral `Globe`. Use for social/publishing platforms (Publish composer, Calendar, Analytics, Social Accounts, template cards).
- **`CategoryIcon`** (`components/icons/CategoryIcon.tsx`) — one Lucide glyph per content category (keyed by `CATEGORIES[].slug`), `Folder` fallback. Use for project category badges. Replaces the old per-category emoji.

### Contributing an icon

1. Feature/tool icon → pick the closest existing Lucide glyph; add it in the relevant `config/*`. Don't add a new icon library.
2. New platform mark → add an entry to `BRANDS` in `BrandIcon.tsx` using the authentic Simple Icons path (regenerate from the `simple-icons` package; never hand-draw). Set `currentColor` if the mark is near-black.
3. Decorative vs meaningful → default decorative; add `title`/`aria-label` only when the icon is the sole label.

## Adoption status

Primitives are live and adopted in representative high-traffic surfaces (dashboard
home, Books library, studio route loading). Remaining screens should migrate their
inline status pills / empty / loading blocks to these primitives opportunistically —
no big-bang rewrite required; the primitives match existing visual styling.
