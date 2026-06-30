# CreatorForge Design System

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

## Adoption status

Primitives are live and adopted in representative high-traffic surfaces (dashboard
home, Books library, studio route loading). Remaining screens should migrate their
inline status pills / empty / loading blocks to these primitives opportunistically —
no big-bang rewrite required; the primitives match existing visual styling.
