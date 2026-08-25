# TASK-036 — Pilot Measurement Foundation

**Status:** Ready for review

## Goal

Allow every Farm member to record and read a standalone, manual numeric Measurement without requiring a FarmTask.

## Scope

- Add append-only `measurements` storage with same-Farm FarmArea/CropCycle validation.
- Add member read/create RLS policies and no update/delete grant or endpoint.
- Add `GET/POST /api/farms/{farmId}/measurements`.
- Add a mobile-first Measurement entry and latest-record list.
- Synchronize v0.2 product, domain, data and API documentation.

## Out of scope

- Sensor ingestion, device connection, automated advice, diagnosis or facility control.
- Photos or Storage changes.
- Creating an IssueRecord from an Observation.
- FarmArea links on CropCycle or FarmTask.
- Weather, public data, AI and map/GPS work.

## Acceptance criteria

1. A signed-in Farm member can save a metric, numeric value and unit with the current UTC time and no FarmTask.
2. FarmArea and CropCycle are optional; any selected value must belong to the same Farm in the API and database.
3. Members can read only their Farm's latest-first measurements.
4. A Measurement is a manual record, not a sensor feed, diagnosis, recommendation or control command.
5. Existing v0.1 action, issue, attachment and history flows keep working.

## Required verification

- Route tests: list, member create, inaccessible Farm, wrong-Farm area rejection.
- Validation tests: valid numeric record and invalid metric/value/unit/time rejection.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Manual migration

After merge, run only the content of `supabase/migrations/202608240003_platform_v02_measurements.sql` as a new Supabase SQL Editor query. The migration requires the previously applied FarmArea and Observation migrations.
