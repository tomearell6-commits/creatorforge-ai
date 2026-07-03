# Build Studio — AI Website & App Builder

Business Studio module (`/dashboard/build`) that turns an idea into a complete
digital-product PLAN: positioning, page structures with real copy, features,
user flow, sitemap, database + tech-stack suggestion, development roadmap and
a marketing launch plan — exportable as developer briefs.

**HONESTY RULE (shown throughout the UI):** Build Studio generates professional
plans, structures, copy and briefs — it does NOT deploy running websites or
apps. The prompt-package export is designed for AI coding tools (Claude Code)
or a developer to implement.

## Taxonomy (src/config/buildStudio.ts)
6 builders / 68 project types: Website (16) · Ecommerce (11) · Landing (10) ·
Web App (11) · Mobile App (11) · Funnel (9). 8 goals, 9 styles.
15 starter templates (buildTemplates.ts) + admin DB templates (merged by API).

## Generation (src/lib/build/generate.ts)
ONE batched Claude call → full BuildPackage (19 sections incl. name ideas,
copy per page, MoSCoW features w/ phases, sitemap tree, schema + tech stack,
3-4 phase roadmap, launch plan + email sequence). Deterministic placeholder
without an API key (free). `packageToMarkdown` renders the developer brief.

## Data (migration 0031)
build_projects (package_json) + normalized build_project_pages/features/
roadmaps/marketing_plans/app_specs + build_project_exports; owner RLS.
build_templates world-read/admin-write.

## API
/api/build/{projects,projects/[id],generate,templates,export} +
/api/admin/build (stats + template CRUD, audited). Generation: 20 credits,
402 pre-check, charged only on real-AI success. Exports: markdown/copy/prompt
packages free, PDF/DOCX brief 1 credit.

## Pages
/dashboard/build (dashboard + category grid) · /new (6-step wizard) ·
/templates · /projects · /editor?project= (tabs: Overview · Pages & Copy ·
App Spec · Sitemap · Roadmap · Marketing · Export) · /roadmap · /marketing ·
/export · /admin/build.

## Studio integrations (Overview tab hand-offs)
Content Studio (write content), Design Studio (assets), Marketing Studio
(ads), Video Studio (promo video), Analytics Studio (SEO audit). Footer link
"AI Website & App Builder"; Template Marketplace "Business" entries; create-
menu aliases; Forge Assistant knowledge.
