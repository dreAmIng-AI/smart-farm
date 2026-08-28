# TASK-049 — Farm Operations Dashboard UX

- GitHub Issue: #75
- Status: In progress

## Goal

Present the existing Operations Core as a clear, senior-friendly Farm dashboard without changing the underlying Farm → CropCycle → FarmTask → ActionLog / IssueRecord work cycle.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md` (UX-01 through UX-10)
- `docs/UX_GUIDELINES.md`
- `AGENTS.md`
- GitHub Issue #75

## Scope

- Make Today a dashboard led by today tasks, overdue tasks and active issues.
- Add text-labelled quick actions for work, observation and schedule.
- Place existing Weather, Disease/Pest, Crop Information and Market cards in a responsive information grid.
- Make Farm/CropCycle switching a compact disclosure when a current cultivation is already selected.
- Preserve mobile-first large touch targets and add wider desktop dashboard columns.

## Out of Scope

- DB migration, API contract, RLS, domain model, provider adapter or cache changes.
- New data, diagnosis, recommendation, automation, sensor or AI behavior.
- Removing any existing schedule, recording, Farm management or collaboration flow.

## Acceptance Criteria

- [x] A selected Farm/CropCycle dashboard exposes today, overdue and issue counts as clear links.
- [x] Work, observation and schedule have large text-labelled quick actions.
- [x] Existing official-information cards retain their source, freshness and failure behavior.
- [x] Mobile stays single-column/readable; wider screens use responsive dashboard columns.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.

## Security and Domain Safety

- Presentation only: existing API requests, RLS and role controls remain final authorization.
- The dashboard does not change a FarmTask, ActionLog, IssueRecord or external reference simply by viewing it.
- It does not describe Draft Crop Pack tasks as agricultural prescriptions.

## Handoff

No Supabase SQL Editor or Vercel environment step is needed. Manual Pilot feedback should determine a later, separate navigation/visual-polish slice.
