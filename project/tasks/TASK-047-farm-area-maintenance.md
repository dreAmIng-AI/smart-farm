# TASK-047 — FarmArea Maintenance

- GitHub Issue: #71
- Status: In progress

## Goal

Allow an owner or admin to correct a FarmArea name or memo and safely remove an unused FarmArea without losing operational context.

## Background

FarmArea is now an optional context for CropCycle, FarmTask, Observation and Measurement. The original first slice intentionally exposed only create/list, which makes correcting a typo or retiring an unused area cumbersome.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md` (FR-02, FR-03)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- GitHub Issue #71

## Scope

- Add owner/admin-only `PATCH /api/farm-areas/{farmAreaId}` for name and optional memo.
- Add owner/admin-only `DELETE /api/farm-areas/{farmAreaId}` for unused FarmAreas.
- Return a user-safe `409 FARM_AREA_IN_USE` before deletion when any CropCycle, FarmTask, Observation or Measurement is linked.
- Add compact edit/delete controls to the existing FarmArea panel.
- Synchronize the domain, data and API contracts and route tests.

## Out of Scope

- Any automatic reassignment, archive state, history deletion or record mutation.
- GIS, address, GPS, sensors, FarmArea-specific Weather or new tables/migrations.
- Crop-specific Core behavior or changes to Farm, CropCycle, FarmTask, ActionLog, IssueRecord or Attachment semantics.

## Acceptance Criteria

- [x] owner/admin can update an accessible FarmArea name and memo.
- [x] farmer cannot update or delete a FarmArea.
- [x] an unused FarmArea is deleted successfully.
- [x] a linked FarmArea returns `409 FARM_AREA_IN_USE` and no record is deleted or reassigned.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.

## Security and Domain Safety

- Existing FarmArea update/delete RLS policies remain final authorization.
- Existing `on delete restrict` foreign keys remain the race-safe database guard after the API's user-safe preflight.
- No migration is required because the existing FarmArea migration already grants and protects these operations.

## Handoff

No Supabase SQL Editor step is required for this task. After deployment, an owner/admin can use the FarmArea panel to correct an unused label; an in-use label is deliberately preserved.
