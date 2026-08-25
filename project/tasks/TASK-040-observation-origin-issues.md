# TASK-040 — Observation-origin IssueRecord

**Status:** Ready for review

## Goal

Allow a Farm member to record an existing, non-diagnostic `IssueRecord` from one standalone Observation without changing the established ActionLog-origin Issue flow.

## Background and References

- GitHub Issue #57
- `docs/PRD_PLATFORM_V0.2.md` FR-06 and AC-04
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- Keep `IssueRecord` and ActionLog-origin records unchanged.
- Add one optional `observation_id` origin with a database check that permits exactly one origin path.
- Let any member with access create one IssueRecord from an accessible Observation.
- Show the linked Issue state in the Observation list and in Farm history.
- Keep Issue attachment access Farm-scoped for both origin paths.
- Allow an owner/admin to create a regular draft Follow-up FarmTask only when the Observation has CropCycle context.

## Out of Scope

- Diagnosis, treatment guidance, automatic FarmTask creation, Observation editing/deletion, new Issue entity/table, and Observation photo attachments.

## Acceptance Criteria

1. Existing ActionLog → IssueRecord records and follow-ups remain valid.
2. One Observation can create exactly one IssueRecord; the second request receives a conflict.
3. A member without Farm access cannot read or create the IssueRecord.
4. History and optional Issue photos work for task- and Observation-origin records.
5. Observation-origin follow-up work is blocked in the UI without CropCycle context and remains a normal `FarmTask` when context exists.

## Required Tests

- Observation Issue API success, duplicate and inaccessible cases.
- Observation listing Issue summary, History origin handling and Issue attachment regression.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- RLS always derives Farm access from the original FarmTask or Observation; no client Farm ID is trusted for issue creation.
- Observation and IssueRecord record a fact requiring confirmation. They never mean a diagnosis or a prescription.

## Handoff

After merge, run the complete content of `supabase/migrations/202608250002_platform_v02_observation_issues.sql` once as a **new** Supabase SQL Editor query. It requires all prior v0.1 migrations and `202608240002_platform_v02_observations.sql`. Then deploy from `main`, make a standalone Observation, select its “확인이 필요한 문제로 기록” action, and confirm that the record appears in History.
