# CreatorsForge.io — Master Platform Architecture

CreatorsForge.io is an **AI Business Operating System**: one platform to create,
market, publish, automate, analyze, and grow a business. Every feature belongs to
exactly one of **six flagship Studios**, so users navigate professional workspaces
instead of hundreds of disconnected tools.

## 1. System architecture

- **Framework:** Next.js 15 App Router, React 19, TypeScript, Tailwind v3.
- **Data/auth:** Supabase (Postgres + Auth + Storage), owner-scoped RLS.
- **AI:** Claude (`claude-opus-4-8`) via `@anthropic-ai/sdk`; provider/registry pattern with placeholder fallbacks for media, video (Shotstack/fal), voice (ElevenLabs), images, avatars, and ad/publishing platforms.
- **Billing:** unified credit wallet + crypto top-ups (NOWPayments).
- **Single source of truth for IA:** `src/config/studios.ts` defines the six Studios (title, purpose, icon, quick actions, grouped tools). The sidebar, Master Dashboard, and Studio hub pages all derive from it — adding a tool there updates every surface.

## 2. The six Studios

| Studio | Purpose | Entry route |
| --- | --- | --- |
| **Content Studio** | Create original content (video, image, audio, writing) | `/dashboard/studio/content` |
| **Marketing Studio** | Ads, campaigns, sales copy, social | `/dashboard/studio/marketing` |
| **Publishing Studio** | Write, design, export, and promote books | `/dashboard/studio/publishing` |
| **Automation Studio** | Autopilot, scheduling, rules, publishing queue | `/dashboard/studio/automation` |
| **Analytics Studio** | SEO audits, reports, performance, usage | `/dashboard/studio/analytics` |
| **Business Studio** | Brand, team, billing, API, infrastructure, support | `/dashboard/studio/business` |

## 3. Navigation map

**Sidebar** (lean, derived from `STUDIOS`):

```
Dashboard
─ Studios
   Content Studio       → /dashboard/studio/content
   Marketing Studio     → /dashboard/studio/marketing
   Publishing Studio    → /dashboard/studio/publishing
   Automation Studio    → /dashboard/studio/automation
   Analytics Studio     → /dashboard/studio/analytics
   Business Studio      → /dashboard/studio/business
─ Workspace
   Templates            → /dashboard/templates
   Recent Projects      → /dashboard/projects
   Settings             → /dashboard/settings
   Help Center          → /dashboard/support
```

**Top bar** (`Topbar.tsx`): mobile nav, Credit Wallet badge, theme toggle, sign-out.
**Persistent Quick Create** (`DashboardPromptBar.tsx`): "Describe what you want to create…" on every dashboard page.
**Forge AI Assistant** (`ForgeAssistant.tsx`): floating, page-aware, launches guided tours.

## 4. Studio organization chart (every route mapped)

**Content** — Create Hub, AI Video/Image/Audio/Social studios, Blog & Script Writer,
Thumbnails, Voiceovers, Scene Builder, Viral Hook / Hashtag / YouTube Description tools,
Template Library, Media Library, Render Queue, Content Calendar, Projects.

**Marketing** — Ad Campaign Dashboard, Create Campaign, Ad Creative Studio, Creative
Library, Connected Ad Accounts, Audience Library, Landing/Sales/Email copy, Meta Title &
Description, Social Accounts, Campaign Calendar, Campaign Reports, Ad Settings.

**Publishing** — Publishing Dashboard, My Books, New Book, Book Templates, Cover Studio,
Book Marketing, Export Center, Publishing Tools, Publishing Settings.

**Automation** — Autopilot (Overview, Campaigns, Planner, Rules, Queue, Reports, History,
Settings), Automation Flows, WordPress Publishing, Notification Center.

**Analytics** — SEO Dashboard, SEO Audit, New Audit, SEO Calendar, Analytics Dashboard,
Campaign Reports, Credit Usage, API Usage.

**Business** — Brand Kit / White Label, Team Workspace, Affiliate, Referrals, Credit
Wallet, Billing & Subscription, API Center, Settings, Support Center, Infrastructure
Operations, Admin Portal.

## 5. Component library (key surfaces)

- `config/studios.ts` — Studio definitions + helpers (`getStudio`, `studioToolCount`).
- `components/dashboard/nav-config.ts` — sidebar groups derived from `STUDIOS`.
- `components/dashboard/NavList.tsx` — renders sidebar + mobile drawer (unchanged).
- `components/dashboard/StudioGrid.tsx` — six Studio cards on the Master Dashboard.
- `components/dashboard/StudioHub.tsx` — per-Studio hub (header + credits + quick actions + grouped tool cards).
- `app/dashboard/page.tsx` — Master Dashboard (wallet + Studio grid + recent projects).
- `app/dashboard/studio/[slug]/page.tsx` — Studio hub route (static params for all six).

## 6. Database

No schema changes in this reorganization — it is purely an information-architecture
layer over existing tables. Records remain where they were (`projects`, `books`, ad
tables, autopilot tables, SEO audit tables, wallet/ledger, infra). Studios are a
presentation grouping; existing owner-scoped RLS is untouched, so the reorg is fully
backward-compatible.

## 7. Developer guide — adding a tool

1. Add the page/route as usual under `src/app/dashboard/...`.
2. Add a `StudioTool` entry (label, href, icon) to the right section in `src/config/studios.ts`.
3. Done — it appears in that Studio's hub automatically. Add a `quickActions` entry if it deserves a shortcut. No sidebar or dashboard edits needed.

## 8. Administrator guide

The Business Studio surfaces the Admin Portal (`/admin`) and Infrastructure Operations
Center (`/admin/infra/*`: health, alerts, costs, usage, payments, storage, email, auth,
renewals, publishing, AI, API keys). Admin-only routes remain gated as before.

## 9. User guide

Log in → the Master Dashboard shows your six Studios with quick actions. Click **Enter
Studio** to open a workspace containing every related tool, your credit balance, and
one-click actions. The sidebar always lists the six Studios; the Forge Assistant and the
Quick Create bar are available on every page.
