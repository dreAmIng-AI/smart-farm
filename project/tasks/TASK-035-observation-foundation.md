# TASK-035 — Pilot Observation Foundation

**Status:** Ready for review

## Goal

Allow every Farm member to record and read a standalone, fact-based Observation without requiring a FarmTask.

## Scope

- Add append-only `observations` storage with same-Farm FarmArea/CropCycle validation.
- Add member read/create RLS policies and no update/delete grant or endpoint.
- Add `GET/POST /api/farms/{farmId}/observations`.
- Add a mobile-first Observation entry and latest-record list.
- Synchronize v0.2 product, domain, data and API documentation.

## Out of scope

- Manual Measurement, sensor ingestion, automated advice or diagnosis.
- Photos or Storage changes.
- Creating an IssueRecord from an Observation.
- FarmArea links on CropCycle or FarmTask.
- Weather, public data, AI and map/GPS work.

## Acceptance criteria

1. A signed-in Farm member can save a fact with the current UTC observation time and no FarmTask.
2. FarmArea and CropCycle are optional; any selected value must belong to the same Farm in the API and database.
3. Members can read only their Farm's latest-first observations.
4. Observation is an observed fact, not a diagnosis or recommendation.
5. Existing v0.1 action, issue, attachment and history flows keep working.

## Required verification

- Route tests: list, member create, inaccessible Farm, wrong-Farm area rejection.
- Validation tests: valid standalone record and invalid fact/time rejection.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Manual migration

After merge, run only the content of `supabase/migrations/202608240002_platform_v02_observations.sql` as a new Supabase SQL Editor query. The migration requires the previously applied FarmArea migration.
