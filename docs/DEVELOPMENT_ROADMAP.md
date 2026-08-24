# Development Roadmap: v0.2 Real Data Pilot

**Status: CURRENT EXECUTION ROADMAP**

## Guiding Rule

Keep the v0.1 Operations Core running. Deliver one independently testable Vertical Slice at a time; do not land FarmArea, frontend rewrite, Observation, provider cache and four external APIs in one PR.

## Phase 0 — Repository and Documentation Audit

Completed in Issue #41.

- Confirm actual v0.1 routes, Supabase migrations, RLS and 111 tests
- Identify the single large `page.tsx` and Today-first UX gap
- Identify missing FarmArea, standalone Observation/Measurement, external contract and real data sources

## Phase 1 — v0.2 Foundation Documents

Issue #41.

- Product plan and v0.2 PRD
- Architecture, domain/data/API target boundary
- Integration Contract, public-source register, UX guide and Pilot validation guide
- Preserve `PRD_CORE_V0.1.md` as historical

## Phase 2 — Frontend Foundation and Today UX

Completed in Issue #43 / PR #44.

- Extract shared domain types and feature boundaries from the current `page.tsx` without changing existing API behaviour
- Add Today-first navigation and user-facing terminology
- Keep monthly/weekly schedules and full settings as secondary views
- Test keyboard/accessibility states and main task path

## Phase 3 — FarmArea

Implemented by Issue #45 with migration, RLS, API and tests.

- Create and list simple FarmArea records; update and removal stay out of the first FarmArea Slice
- Link CropCycle/FarmTask only when selected
- Preserve all existing Farm/CropCycle/FarmTask records

## Phase 4 — Observation and Measurement

Separate Issue/PR with migration, RLS, API and tests.

- Append-only Observation and manual Measurement records
- Safe distinction between observed fact, issue requiring confirmation and diagnosis
- Extend Issue origin only without breaking existing ActionLog-origin IssueRecords

## Phase 5 — Integration Runtime Foundation

Separate Issue/PR with no client-exposed key.

- Server-only provider adapter/normalizer boundary
- Provenance and freshness result envelope
- Focused durable last-successful snapshot/cache and RLS
- Human Korean unavailable/stale states

## Phase 6 — Real Weather

Separate Issue/PR after the KMA key and Farm forecast-location decision are available.

- Actual KMA current/short forecast data
- Farm context mapping and source/update display
- Timeout/no-data/stale-cache tests

## Phase 7 — Real Disease/Pest and Crop Information

Separate Issue/PR after Nongsaro key, endpoint and content review.

- Current CropCycle context and official reference content
- No diagnosis, treatment recommendation or automatic FarmTask
- Source, base date and data-absence UI

## Phase 8 — Real Market Information

Separate Issue/PR after KAMIS key and price-definition decision.

- Actual wholesale or retail reference price, clearly labelled
- Item/kind/grade/market/unit/base date mapping
- Recent trend only where source explicitly supplies it

## Phase 9 — Pilot Hardening

- Actual Farm end-to-end validation
- Senior-user usability observation
- RLS, provider failure, cache and migration review
- lint, typecheck, test, build, Preview and documentation sync

## Deferred Labs

Sensor, AI, analytics, automation, prediction, advanced market intelligence and additional Crop Packs remain independent Labs. They do not block Baseline Modules or Operations Core.

## Pilot Readiness

| State | Meaning |
|---|---|
| `NOT READY` | Core or security flow is blocked, or no real data source can be used. |
| `PARTIAL` | Current state: v0.1 operations flow works, but v0.2 additions are not all released and field-validated. |
| `READY` | A real Farm completes the v0.2 Pilot flow with actual sources, provenance, failure fallback and user validation. |
