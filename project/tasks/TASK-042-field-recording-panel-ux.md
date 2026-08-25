# TASK-042 — Field recording panel UX correction

**Status:** Ready for review

## Goal

Keep exactly one primary Observation panel for a selected Farm and make manual numeric Measurement a voluntary secondary record rather than a required Today workflow step.

## Background and References

- GitHub Issue #62
- `docs/PRD_PLATFORM_V0.2.md` UX-01, UX-02 and UX-06
- User Pilot feedback: duplicated Observation panels and burdensome Measurement entry

## Scope

- Do not remount Observation or Measurement components merely because the selected CropCycle changes.
- Synchronize their optional CropCycle selection from the selected context.
- Keep one always-visible Observation panel.
- Place Measurement under a collapsed “필요할 때만” disclosure and mount it only after the user opens it.

## Out of Scope

- Database/API changes, new measurement catalogue, sensor ingestion, automation, deletion of existing Measurement data, or a full UI redesign.

## Acceptance Criteria

1. Farm/CropCycle restoration leaves one Observation panel in the rendered page.
2. Switching a CropCycle changes the optional default context without creating another panel.
3. Measurement is not visible or loaded until the user explicitly opens its optional section.
4. Existing Observation and Measurement endpoints and data remain unchanged.

## Required Tests

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Handoff

No Supabase SQL action is required. After deployment, select a Farm and switch CropCycles several times: there should be one `관찰 기록` panel. Expand `수치 기록은 필요할 때만 열기` only when manually measured values need to be recorded.
