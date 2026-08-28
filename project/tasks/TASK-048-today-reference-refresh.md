# TASK-048 — Today Reference Refresh

- GitHub Issue: #73
- Status: In progress

## Goal

Let a farmer re-request the normalized Today reference cards after saving a forecast location or enabling an external integration, without reloading the entire page or changing Core operational data.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md` (FR-07, FR-11, FR-12)
- `docs/UX_GUIDELINES.md`
- `docs/INTEGRATION_CONTRACT.md`
- GitHub Issue #73

## Scope

- Add a mobile-readable Today action that re-mounts the existing Weather, Disease/Pest, Crop Information and Market cards.
- Keep the current Farm/CropCycle request context, provider cache TTL and normalized server endpoints unchanged.
- Show a clear status message directing the user to each card's source and confirmation time.
- Document that the action refreshes the displayed server result rather than forcing a public provider request.

## Out of Scope

- Provider cache invalidation, a new endpoint, migration, environment key or background job.
- Diagnosis, recommendation, automatic task generation or any Core record mutation.
- KMA special-alert regional matching; the current Farm KMA grid does not yet have a reviewed mapping to the provider's city/county warning regions.

## Acceptance Criteria

- [x] A selected Farm/CropCycle can re-request all four Today reference cards with one labelled action.
- [x] A user cannot trigger duplicate refresh clicks during the initial action acknowledgement.
- [x] Existing fresh/stale/unavailable text and source timestamps are preserved.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.

## Security and Domain Safety

- The browser calls only existing authenticated Farm-scoped routes; no provider key, raw payload or RLS bypass is introduced.
- No provider response can change FarmTask, Observation, IssueRecord, history or an agricultural recommendation.

## Handoff

No Supabase SQL Editor or Vercel environment change is required. The next weather-alert slice requires an explicit, reviewed Farm grid-to-KMA warning-region mapping before it can show a regional alert.
