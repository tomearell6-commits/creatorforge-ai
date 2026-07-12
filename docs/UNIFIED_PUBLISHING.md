# Unified Publishing, Promotion & Connected Accounts

One consistent way to publish, schedule, promote and export **any** finished
CreatorsForge project — without leaving the project page.

Status: **Phase 1 shipped** (foundation, engine, completion UI, SEO Studio mount,
Connected Accounts Center, Publishing Calendar, Forge AI intents). Remaining
studio mounts + live social/ads OAuth are tracked under "Remaining work".

---

## 1. Architecture

Built **on top of** the existing publishing pipeline (`social_accounts`,
`publish_jobs`, `scheduled_posts`, `executePost`, `oauth.ts`) — not a duplicate.

```
Studio completion point
   └─ <ContentCompletionPanel contentType=… sourceId=… />   (reusable)
        └─ <PublishPromoteDrawer />  tabs: Publish | Schedule | Promote | Export | Automation
             ├─ GET  /api/publishing/capabilities?contentType=…   (matrix + connected accounts)
             ├─ POST /api/publishing/prepare      (AI per-platform metadata, credit-metered)
             ├─ POST /api/publishing/publish       → lib/publishing/orchestrate.ts runPublish()
             ├─ POST /api/publishing/schedule
             └─ POST /api/promotion/create          (AI ad copy + export packages)
```

**Single source of truth:** `src/config/publishingCapabilities.ts` — every
content type → destinations, ad platforms, export formats, schedule options,
metadata fields, automation actions, required account types, credit estimates,
and completion-panel actions. No page hardcodes publishing logic.

**Per-destination independence:** `runPublish()` records one
`publish_job_destinations` row + one `publishing_events` row per destination. One
destination failing never fails the others.

**Honesty guarantee:** only live providers report `published`. Everything else
returns a labelled `export_ready` package — never a fake success.

---

## 2. Connected Accounts Center

`Manage → Integrations → Connected Accounts` (`/dashboard/manage/integrations`).
Four categories — Social, Advertising, Websites & Publishing, Email — each showing
connected accounts + connect options with honest live/coming-soon states. Reused
from inside every publish flow. Official sign-in only; **no social passwords**.
Tokens are AES-256-GCM encrypted (`lib/security/secrets.ts`) and never returned
to the client.

---

## 3. Content completion workflows

`ContentCompletionPanel` shows, after any project completes:
- **Primary:** Preview · Download · Publish now · Schedule · Promote · Save draft
- **Secondary:** Duplicate · Edit again · Create variation · Add to campaign · Share · Analytics

Available actions vary by content type (from the matrix). Mounted so far in **SEO
Studio**; other studios pending (see Remaining work).

---

## 4. Video publishing workflow

Destinations: YouTube, TikTok, Instagram/Facebook Reels, LinkedIn, X, Pinterest.
Configurable metadata: title, description, caption, hashtags, thumbnail, playlist,
visibility, publish date/time/timezone, first comment, CTA. "Optimize per
platform" writes distinct copy per destination (credit-metered). Not-yet-live →
export package; wire real OAuth to flip to auto-publish.

## 5. Book promotion workflow

Export: PDF, DOCX (roadmap), EPUB (roadmap), Markdown, HTML. Promote: social posts,
email campaign, Meta/Google/YouTube ad packages, launch copy — generated via the
ad-copy engine, credit-metered, delivered as ready-to-paste packages.

## 6. SEO & WordPress workflow (LIVE)

SEO Studio → generate article → completion panel → Publish/Schedule to a connected
WordPress site (real), + social promo packages + export. WordPress/WooCommerce use
`publishArticleToWordPress` (Yoast + Rank Math meta, taxonomy, scheduling).

## 7. Advertising integration

`/api/promotion/create` builds a campaign (`promotion_campaigns`), AI assets
(`promotion_assets`), and one export-ready job per platform (`promotion_jobs`).
Objective, budget, country, audience, landing URL, CTA. **No ad platform is live
for auto-creation yet** — packages are ready to paste into each Ads Manager. High-
risk ad actions always require confirmation.

## 8. Publishing Calendar

`/dashboard/calendar` — `PublishingActivity` shows every destination of every
publish (published / scheduled / package-ready / failed) with type + status
filters, alongside the existing calendar view.

---

## 9. Database (migration 0039, additive)

`social_accounts.category` (social|advertising|website|email) · `last_error` ·
new tables: `publish_job_destinations`, `publish_metadata`, `promotion_campaigns`,
`promotion_assets`, `promotion_jobs`, `account_connection_logs`,
`publishing_approvals`, `publishing_events`. All owner-RLS.

## 10. API routes

`/api/integrations/accounts` · `/api/publishing/{capabilities,prepare,publish,
schedule,status,history}` · `/api/promotion/{create,prepare-ad,status}`. Existing
`/api/social`, `/api/wordpress/sites`, `/api/ads/*` reused for connect + accounts.

## 11. Security

Official OAuth (via existing `oauth.ts`); AES-256-GCM token encryption; tokens
never sent to client; owner-scoped RLS on every table; `auth.getUser()` on every
route; connect/disconnect logged (`account_connection_logs`); per-destination
tracking prevents double-publish confusion; credits charged only on verified AI
work. No raw passwords stored anywhere.

## 12. Credit model

**Charged:** AI metadata optimization (~2/platform), ad creative (~5), campaign
package (~8). **Free:** connecting accounts, previews, viewing schedules, manual
editing, and the publish action itself. Estimates shown before spending.

## 13. Provider capability matrix

| Category | Providers | Live now |
|---|---|---|
| Websites | WordPress, WooCommerce, custom webhook | ✅ real publish/schedule |
| Websites | Shopify, Webflow | connect + package |
| Social | YouTube(+Shorts), TikTok, Instagram(+Reels), Facebook(+Reels), LinkedIn, X, Pinterest | connect + package |
| Advertising | Meta, Google, YouTube, TikTok, LinkedIn, Pinterest Ads | AI package (paste to Ads Manager) |
| Email | Brevo, Mailchimp | ready-to-send package / Email Studio hand-off |

## 14. Known limitations

- **Live auto-posting to social/ads requires each platform's OAuth app + review**
  (the Gmail-style gate). Until then those destinations produce export packages —
  clearly labelled, never faked as "published".
- Brevo per-user campaign send needs a list + verified sender; Phase 1 hands off a
  ready package to the Email Studio.
- DOCX/EPUB book export is on the books roadmap.
- Completion panel is mounted in SEO Studio; other studios pending.

## Remaining work (Phase 2)

- Mount `ContentCompletionPanel` in Video render, Books, Design, Build, Ads, Real
  Estate completion points.
- Inline `ConnectAccountModal` inside the drawer (connect without leaving flow).
- Wire the first live social OAuth (YouTube via the existing Google project) to
  flip `PUBLISH_DESTINATIONS.youtube.live = true`.
- Scheduler/cron to fire scheduled non-WordPress destinations when their live
  adapters land.
