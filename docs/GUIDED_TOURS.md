# Guided Tours (Forge AI Assistant)

Interactive, step-by-step tours that dim the page, highlight the target button or
section, and walk users through key workflows. Started from the assistant's
"Guided tours" quick actions. **Guided tours never cost credits** — only custom AI
questions (after the free allowance) do.

## Tours (10)

`create-first-video`, `ai-shorts`, `product-ad`, `seo-blog-post`,
`connect-wordpress`, `connect-social`, `render-export`, `top-up-credits`,
`schedule-content`, `use-templates` — defined in `src/lib/tours/tours.ts`.

Each step has a `target` (a `data-tour` attribute to highlight), optional `href`
(the page it lives on), and instruction copy. Cross-page tours auto-prompt to
navigate ("Go there") when the step's page isn't the current one.

## Components (`src/components/tours/`)

- **GuidedTourProvider** — hosts the active tour; mounted once in the dashboard
  layout so state survives client navigation. Exposes `useGuidedTour().startTour(id)`
  and listens for the `start-forge-tour` window event. Persists progress.
- **GuidedTourOverlay** — measures the target rect, positions the card, drives
  navigation, re-measures on scroll/resize.
- **GuidedTourStepCard** — instruction card with Back / Next / Skip / Finish.
- **TourHighlight** — dims the page and rings the target (box-shadow cutout); a
  full dim layer when the target isn't on screen.
- **TourProgressTracker** — step dots.

## data-tour attributes

Added to sidebar nav (rendered by `NavList`, shared with the mobile drawer):
`ai-video-studio`, `ai-ad-studio`, `seo-studio`, `wordpress-connect`,
`social-accounts`, `render-queue`, `publishing-calendar`, `credit-topup`,
`templates`. Add more by setting `tour` on a `NavItem` or putting `data-tour="…"`
on any element.

## Assistant integration

The widget shows a "Guided tours (free)" row of quick actions: *Guide me to create
my first video, Show me how to use AI Shorts, Help me connect WordPress, Help me
top up credits, Show me how to publish content*. Clicking dispatches
`start-forge-tour` and closes the panel so the highlighted UI is visible. No chat
API call, so no credits are used.

## Database (migration `0013_guided_tours.sql`)

`guided_tours` (catalogue, world-readable, seeded with the 10 tours),
`guided_tour_steps` (reference; interactive content is in code),
`user_tour_progress` (owner-only: `current_step`, `completed`, `skipped`,
`completed_at`, unique per user+tour). Progress is saved via
`POST /api/tours/progress` on every step/skip/finish, so completed tours don't
auto-repeat (and tours are only ever started manually).

## Testing

1. Open the assistant → "Guided tours" → start one; the panel closes and the
   first target is highlighted.
2. Next/Back navigate steps; cross-page steps show "Go there" and navigate.
3. Skip closes the tour and records `skipped`; Finish records `completed`.
4. Progress persists (reload → `user_tour_progress` reflects last step).
5. Highlights/cards are responsive (mobile uses the same NavList targets).
6. No `/api/assistant/chat` call is made → no credits deducted.
