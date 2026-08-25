# TASK-038 — Today and field-recording UX corrections

**Status:** Ready for review

## Goal

Resolve Pilot feedback that made the Weather card hard to find, repeated Observation panels, made Measurement inputs unclear and left Farm weather-location confirmation ambiguous.

## Background and References

- GitHub Issue #53
- `docs/PRD_PLATFORM_V0.2.md` FR-07, FR-08, FR-11 and FR-12
- `docs/UX_GUIDELINES.md`
- `docs/INTEGRATION_CONTRACT.md`

## Scope

- Show Weather immediately after Farm selection when no CropCycle is selected and add a direct `날씨` navigation destination when a work cycle is active.
- Ensure the current page composition contains one Observation recording panel and retain a single Measurement panel.
- Present Measurement as item → numeric value + unit, with safe unit defaults for the initial manual metrics.
- Read and show saved Farm forecast location state, KMA grid and a direct Weather link.
- Explain browser location permission denial, unavailable position and timeout in Korean without showing raw GPS/browser details.
- Add the read-only `GET /api/farms/{farmId}/weather-location` contract; existing Farm RLS remains final access protection.

## Out of Scope

- Supabase schema or migration changes, raw GPS/address storage, geocoding, FarmArea-specific Weather and KMA special-alert mapping.
- Disease/Pest, Crop Information, Market, Sensor, AI, diagnosis or agricultural prescription.

## Allowed Files

- Weather, Observation, Measurement and navigation components; root page and styles
- Existing Weather location route and test; UI feedback utility and test
- `docs/API_CONTRACT.md`, `docs/UX_GUIDELINES.md`, this Task

## Acceptance Criteria

1. A selected Farm shows a clearly headed Weather card regardless of whether the user has selected a CropCycle.
2. Weather has a direct mobile navigation destination when the work-cycle navigation is shown.
3. The page renders a single Observation panel and one Measurement panel for the selected Farm.
4. Measurement defaults a safe display unit for Temperature, Humidity and Soil Moisture; the user can edit it for other manual measurements.
5. An owner/admin can see the saved Weather label and KMA grid after reload, follow a direct Weather link, and understand why a one-time browser location request failed.
6. The client never sends or displays raw GPS coordinates, a street address, provider errors or API keys.

## Required Tests

- Weather-location route read/save/manager authorization tests.
- Geolocation feedback unit tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- Weather remains official reference information, not advice or an automatic FarmTask.
- The stored label and KMA 5 km grid remain the only persisted location context.
- No migration is required because the route reads fields added by the already-applied Weather foundation migration.

## Handoff

No Supabase SQL action is required. After merge, Vercel deploys normally from `main`. Validate in a Farm selected from a phone: use `날씨`, save a location and follow `오늘 날씨 보기`; then ensure one Observation panel and one Measurement panel appear.
