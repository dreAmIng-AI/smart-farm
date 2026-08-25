# TASK-041 — Weather location general-accuracy retry

**Status:** Ready for review

## Goal

Make the standard Farm weather-location setup work without expecting an operator to know latitude or longitude, especially where a desktop or embedded browser has no GPS-quality position.

## Background and References

- GitHub Issue #60
- `docs/PRD_PLATFORM_V0.2.md` FR-08, FR-12 and UX-08
- `docs/INTEGRATION_CONTRACT.md`
- `docs/UX_GUIDELINES.md`

## Scope

- Request ordinary browser Wi-Fi/network location first.
- Retry once with a fresh high-accuracy request only when ordinary location is unavailable.
- Keep source coordinates browser-local and convert directly to the existing KMA grid.
- Describe coordinate entry as an operator-only technical fallback, not a normal user step.

## Out of Scope

- Address geocoding, maps, GIS, location history, raw GPS persistence, a new location provider, database/API/KMA adapter changes.

## Acceptance Criteria

1. A browser that can provide ordinary location does not wait for high-accuracy GPS first.
2. An unavailable ordinary location retries a fresh high-accuracy request.
3. A denied location permission is not retried.
4. User messaging clearly distinguishes device/browser location from KMA and does not require general users to know coordinates.
5. Only the existing KMA grid and user label are saved.

## Required Tests

- Ordinary success, high-accuracy retry and permission-denied retry tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Handoff

No Supabase SQL action is required. After deployment, use a mobile Chrome or Safari browser with location permission enabled. An embedded or desktop browser that cannot supply location may still show the safe device-location message; it never means KMA data is disconnected.
