# TASK-037 — KMA Weather Baseline Module

**Status:** Ready for review

## Goal

Show real KMA current-observation and short-forecast reference data in Today without allowing a provider failure to interrupt the Operations Core.

## Background and References

- GitHub Issue #51
- `docs/PRD_PLATFORM_V0.2.md` FR-07, FR-08, FR-11, FR-12
- `docs/INTEGRATION_CONTRACT.md`
- `docs/PUBLIC_DATA_SOURCES.md`

## Scope

- Save one Farm-level human-readable forecast label plus KMA grid X/Y.
- Use browser location only after an owner/admin explicitly requests it; convert locally and never store or transmit raw GPS or a street address.
- Add server-only KMA `getUltraSrtNcst` and `getVilageFcst` adapter/normalizer.
- Add KMA Weather `IntegrationResult`, focused snapshot cache, provenance, fresh/stale/unavailable behavior and Today card.
- Keep Farm membership RLS and manager-only location configuration.

## Out of Scope

- KMA special-alert area mapping, FarmArea-specific weather, map/GIS or persisted GPS.
- Disease/Pest, Crop Information, Market, sensor, AI, diagnosis, prescription, automatic task creation or facility control.
- Raw provider response storage, service-role key, Redis, queue or generic API-call warehouse.

## Allowed Files

- `apps/web/src/app/api/farms/**/weather*`
- `apps/web/src/app/components/weather*`, `today-home.tsx`, `page.tsx`, `styles.css`
- `apps/web/src/lib/integrations/**`, `apps/web/src/lib/api/validation*`
- one dedicated Supabase migration and referenced contract documents

## Acceptance Criteria

1. An owner/admin can save a named Farm weather point with a validated KMA grid and a farmer cannot change it.
2. Raw device coordinates and street addresses are neither requested by the API nor persisted.
3. A Farm member sees normalized KMA actual/short forecast data, source and update time when available.
4. Missing location, provider failure and stale fallback are Korean user-safe states; no provider error/key/raw JSON reaches React.
5. Cached Weather data remains Farm-scoped under RLS, and no Weather state can break Today, Task, Observation, Issue or History.

## Required Tests

- KMA grid conversion, normalizer success/malformed response, Weather route missing-location/fresh-cache/stale-fallback/provider-success tests.
- manager-only weather-location route test and validation test.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- KMA keys are only `KMA_API_KEY` or module-specific server variables in Vercel; never `NEXT_PUBLIC_*`.
- Weather is official reference context, not agricultural advice, diagnosis or an automatic action.

## Manual Migration and Handoff

After merge, run only `supabase/migrations/202608250001_platform_v02_weather_foundation.sql` as a new Supabase SQL Editor query. It requires the prior v0.1, FarmArea, Observation and Measurement migrations. Then verify Vercel has the KMA key in both Production and Preview, redeploy, and configure the Farm weather location from a device at the Farm.
