# TASK-039 — Weather location retry and fallback

**Status:** Ready for review

## Goal

Make a browser location timeout distinguishable from KMA Weather failure and preserve a safe, practical way for an owner/admin to configure a Farm forecast grid when browser permission is unavailable.

## Background and References

- GitHub Issue #55
- `docs/PRD_PLATFORM_V0.2.md` FR-08, FR-11 and FR-12
- `docs/INTEGRATION_CONTRACT.md`
- `docs/UX_GUIDELINES.md`

## Scope

- Request a fresh, high-accuracy device position for up to 30 seconds.
- Explain that browser position timeout occurs before a KMA request.
- Provide a clearly secondary one-time manual latitude/longitude → KMA-grid conversion in the browser.
- Clear fallback coordinate fields after conversion and transmit/persist only the existing label and KMA grid.

## Out of Scope

- Address geocoding, maps, GIS, location history, raw GPS persistence, new providers, schema/migration changes and KMA adapter changes.

## Acceptance Criteria

1. Position timeout is described as a device-location step, not KMA provider failure.
2. The browser attempts a fresh high-accuracy position for up to 30 seconds.
3. Manual coordinate input converts locally to KMA X/Y, rejects invalid input and clears the source values after success.
4. No source coordinate reaches a route handler, database, provider request or log.
5. The current label + grid save and Weather-card flow remain unchanged.

## Required Tests

- Manual coordinate conversion success/invalid-value unit tests.
- Browser failure-message unit test.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- This is Farm forecast-context setup only. It is not a GPS tracking, map or GIS feature.
- Weather remains reference information and never creates automatic FarmTasks.

## Handoff

No Supabase migration or SQL Editor action is required. After deployment, use a mobile browser with location permission when possible. If it times out, use the secondary coordinate conversion and confirm only the saved KMA grid is shown.
