# TASK-022: Core FarmTask detail

## Goal

Any Farm member can open one planned or Today FarmTask and understand its reason, schedule, priority, evidence, and verification status before recording a result.

## Background

Schedule and Today list the most important summary fields, but the documented `GET /api/tasks/{taskId}` contract was not implemented. A stable task-detail boundary is needed before contributors add Crop Pack or Lab-adjacent views.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` FR-06
- `AGENTS.md`
- `docs/API_CONTRACT.md`
- `docs/DATA_DICTIONARY.md`

## Scope

- Implement RLS-protected `GET /api/tasks/{taskId}` using the existing `farm_tasks` fields.
- Add a minimal mobile-first detail panel selectable from Schedule or Today.
- Show the task reason, schedule/due time, priority, verification state, source type, result requirement, and evidence.
- Add route tests and update the API contract.

## Out of Scope

- New database tables, migrations, TaskTemplate authoring, editing, rescheduling, or external data calls.
- Crop-specific Core logic, agriculture recommendations, Weather, AI, Disease, Sensor, or Market features.

## Allowed Files

- `apps/web/src/app/**`
- `docs/API_CONTRACT.md`
- `README.md`
- `project/tasks/TASK-022-core-task-detail.md`

## Restricted Files

- Supabase migrations, RLS policies, and production secrets.
- Existing domain names and TaskTemplate/FarmTask relationships.

## Input

- An authenticated Farm member and an RLS-visible `farm_tasks` row.

## Output

- A safe task-detail API response and selectable detail panel for schedule/Today tasks.

## Acceptance Criteria

- [ ] Valid task IDs return existing FarmTask context in camelCase.
- [ ] Invalid IDs return validation errors and inaccessible tasks return `TASK_NOT_FOUND`.
- [ ] The UI exposes task detail from both Schedule and Today.
- [ ] Evidence and `draft` verification state are visibly distinct from agricultural instructions.
- [ ] No migration or crop-specific branch is added.

## Required Tests

- [ ] unit: mapped task detail response
- [ ] unit: invalid task ID and RLS-hidden task
- [ ] manual: select a schedule and Today task detail
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build

## Security and Domain Safety

- This is a Core Platform read-only feature. Existing FarmTask RLS is the authorization boundary.
- Evidence and verification state are displayed as stored data; `draft` is not presented as a validated agricultural instruction.
- No Crop Pack, Lab, user data, or authentication secret is duplicated or exposed.

## Handoff

- No Supabase SQL action is required.
- Validate one owner/admin/farmer account can read only a shared FarmTask.
- Later Crop Pack contributors can extend TaskTemplate data without adding crop-specific Core branches.
