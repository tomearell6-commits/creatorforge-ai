# Unified User Workflow Standard

Every project follows one journey:

**Create → Review → Connect → Publish → Promote → Analyze**

Built on top of the unified publishing system (see `UNIFIED_PUBLISHING.md`).

## 1. Architecture

A shared six-stage layer that studios *adopt* — the stepper reflects saved state
and the completion screen shows the checklist — **without rewriting studio
internals**. State is auto-saved to `project_workflow_state` via `/api/workflow/state`.

## 2. Capability matrix

`src/config/workflowCapabilities.ts` — per content type: `steps` (required/optional),
`createTasks`, `reviewRequirements`, `promotionOptions`, `analyticsSources`
(honest live vs provider-gated), `estimatedCredits`. Composes with
`publishingCapabilities.ts`. Helpers: `getWorkflow`, `requiredSteps`,
`nextWorkflowStep`, `nextActionLabel`. Step status vocabularies in `STEP_STATUSES`.

## 3. Components created

- `UnifiedWorkflowStepper` — six-step header; completed/current/locked states;
  no-skip; a11y (aria-current, icon+text not colour); mobile horizontal scroll.
- `WorkflowActionBar` — primary action always right, secondary left; consistent
  labels/positions everywhere.
- `ContinueWorkflows` — dashboard "Continue where you left off" cards (step, %,
  next action).
- `ConnectionStatusBadge`, `ConnectAccountModal` — shared connection UI (also used
  by the publishing drawer + Connected Accounts Center).
- `ContentCompletionPanel` now renders the stepper as the completion checklist.

## 4. Routes

`/api/workflow/state` (GET single/list active · POST upsert, auto-save, free).

## 5. Database

Migration `0040_workflow_state.sql` — `project_workflow_state` (current_step,
completed_steps, per-step statuses, last/next action; owner-RLS; additive).

## 6. Dashboard

"Continue where you left off" section on the home page (hidden when empty).
Project cards show type, current step, progress %, and next action.

## 7. Forge AI

SYSTEM_PROMPT teaches the six-stage journey, step orientation ("you're reviewing
your video — next connect YouTube"), analyze honesty (limited data / provider
unavailable), and workflow quick actions.

## 8. Mobile

Stepper scrolls horizontally; action bar is sticky with the primary button always
visible; cards stack. (Further per-studio mobile passes pending.)

## 9. Accessibility

Stepper: `aria-current="step"`, per-step `aria-label` with state + "optional",
icon **and** text (never colour alone), keyboard-focusable navigable steps.
ConnectAccountModal: `role="dialog"`, `aria-modal`, labelled close, backdrop click.

## 10. Testing status

`tsc --noEmit` 0 errors + `next lint` clean on every commit; Vercel production
build green each push. **SEO Article** flow verified end-to-end: generate writes
`create→review`, publish writes `…→publish→analyze`, and the project surfaces in
"Continue where you left off".

## 11. Remaining inconsistencies (honest)

- Only **SEO Studio** writes workflow state so far; other studios (Video, Books,
  Design, Build, Ads, Real Estate) still need the same 3-line adoption + a mounted
  stepper/completion panel.
- **Analyze** step shows our own data (publishing success, credits, SEO); live
  platform metrics need each provider's OAuth app (the standing limitation).
- Workflow-status notifications (ready for review, connection expired, promotion
  approval, analytics ready) are defined as notification types but not yet emitted
  from every step.

## 12. UX recommendations / next

1. Adopt the six-stage writes in the remaining studios (small, mechanical — mirror
   the SEO Studio pattern).
2. Mount `UnifiedWorkflowStepper` at the top of each studio editor, driven by saved
   state, with `WorkflowActionBar` at the bottom.
3. Build a lightweight **Analyze** view per project (publishing success + credits +
   SEO today; provider metrics when OAuth lands).
4. Emit workflow-status notifications from each step transition.
5. Wire the first live social OAuth (YouTube) to unlock real Publish + Analyze.
