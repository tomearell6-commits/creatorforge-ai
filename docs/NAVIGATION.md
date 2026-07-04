# Dashboard Navigation — Create · Grow · Manage

The dashboard's master IA. Single source of truth:
`src/config/dashboardNavigation.ts` — 3 areas → 14 sections → ~70 children,
each with id/label/route/icon/description/tour/requiredPlan/isEnabled/order.
The sidebar, dashboard home, area hubs, breadcrumbs, Quick Create and global
search all render from it. Every route points at a page that already exists.

## Areas

- **Create** — Content Studio · Design Studio · Build Studio · Publishing Studio
- **Grow** — Marketing Studio · Automation Studio · Analytics Studio · Business Studio
- **Manage** — Subscription & Billing · Credit Wallet · Notifications · Security · Integrations · Settings

## Components

- `NavList` — collapsible areas (persisted in localStorage `cf-nav-open-areas`),
  sections with expandable children, tooltips (title), active states,
  plan-locked children (lock icon → /dashboard/billing/plans), "Soon" badges for
  disabled items, admin group appended. Shared by `Sidebar` (desktop) and
  `MobileNav` (slide-out drawer). The dashboard layout passes `plan` down.
- `Breadcrumbs` — Dashboard → Area → Section → Tool, resolved from the config
  with prettified-segment fallback; mounted in the dashboard layout.
- `QuickCreateButton` — global Create menu in the topbar (8 actions).
- `GlobalSearch` — Ctrl/Cmd+K palette over the nav tree + content categories +
  templates; results tagged Create/Grow/Manage. (Project/report *content*
  search is not included — only destinations.)
- `AreaHub` — /dashboard/create, /dashboard/grow, /dashboard/manage hubs.
  /dashboard/create keeps the category grid (CreateHub) below the overview and
  shows it directly when `?group=` is present, so every legacy
  `/dashboard/create?group=…` link behaves exactly as before.
- `HomeAreaSections` — dashboard home's three sections with the 12 quick cards.

## Route aliases

`/dashboard/<area>/<section>` static pages redirect to the canonical hubs
(e.g. `/dashboard/grow/analytics-studio` → `/dashboard/studio/analytics`) —
see `SECTION_REDIRECTS`. `/dashboard/manage/integrations` is a real hub page.
Static segments take precedence over `/dashboard/create/[categorySlug]`, so
category links are unaffected.

## Invariants (tested in dashboardNavigation.test.ts)

- All 11 guided-tour targets (`data-tour`) survive — tours keep working.
- No duplicate labels/ids within a section.
- Every route stays inside /dashboard.
- Disabled items are excluded from search.
- Plan gate: free < creator(Starter) < pro(Professional) < agency(Business).

Legacy configs still power the pages themselves: `config/studios.ts` (studio
hubs), `config/contentCategories.ts` (Create Hub grid). `nav-config.ts` was
removed (dead after the rewrite).
