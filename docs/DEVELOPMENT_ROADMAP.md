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

- Append-only Observation implemented in Issue #47; manual Measurement implemented in Issue #49; Observation-origin IssueRecord implemented in Issue #57
- Safe distinction between observed fact, issue requiring confirmation and diagnosis
- Existing ActionLog-origin IssueRecords remain unchanged while an Observation can create one IssueRecord

## Phase 5 — Integration Runtime Foundation

Separate Issue/PR with no client-exposed key.

- Implemented for KMA Weather in Issue #51: server-only provider adapter/normalizer, provenance/freshness envelope, focused durable snapshot/RLS and Korean unavailable/stale states

## Phase 6 — Real Weather

Implemented in Issue #51 after the KMA key and Farm forecast-location decision.

- Actual KMA current/short forecast data
- User-confirmed Farm grid, source/update display and no stored raw GPS/address
- Malformed-response and stale-cache tests
- Follow-up: KMA special-alert area-to-Farm-grid mapping

## Phase 7 — Real Disease/Pest and Crop Information

The first Disease/Pest occurrence-bulletin Slice is implemented in Issue #65: server-only Nongsaro `dbyhsCccrrncInfoList`, normalized nationwide bulletin metadata, Farm-scoped stale fallback and Today provenance/data-absence UI. Issue #67 adds a Crop Pack-mapped Nongsaro `cropTechInfo` Slice that requires an exact official crop-name category match before showing crop-specific technical reference titles/original links.

- The bulletin is not crop-specific and is explicitly not a diagnosis, treatment recommendation or automatic FarmTask.
- A next small Issue must validate cultivar/growth-stage fields before adding a more specific Disease/Pest or Crop Information context.

## Phase 8 — Real Market Information

The first Market Slice is implemented in Issue #69, pending deployment credentials: KAMIS server-only `dailyPriceByCategoryList`, Crop Pack item/category/preferred-grade mapping, whole-region default wholesale context, Farm-scoped 6-hour snapshot cache and 48-hour stale fallback.

- The Today card is labelled “전국 도매 참고가” and preserves the provider basis as `전체지역`, plus item/kind/grade/unit/base date.
- It shows a preceding provider price only when the same response supplies one; it is not a price trend, Farm sale-price or revenue forecast.
- Follow-up: Farm-configured local wholesale-market comparison after each Farm’s actual shipping context is explicitly collected and validated.

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
