# TASK-060 — Municipality Weather Location

## Goal

Let a Farm owner or admin choose a city, county, or district forecast reference without granting device-location permission or entering coordinates.

## Background

The original weather-location form began with browser GPS. Desktop and in-app browsers frequently cannot provide that permission or time out, and a Farm user should not need to know latitude and longitude to see a regional forecast.

## References

- docs/PRD_PLATFORM_V0.2.md
- docs/INTEGRATION_CONTRACT.md — Weather location and privacy boundary
- docs/API_CONTRACT.md — Existing weather-location route
- docs/PUBLIC_DATA_SOURCES.md — KMA official point table
- docs/UX_GUIDELINES.md

## Scope

- Bundle the KMA official city/county/district representative forecast-grid catalogue.
- Let the user search and select one regional forecast reference in the browser.
- Reuse the existing owner/admin weather-location route and stored label/grid.
- Keep device location as one optional advanced path, with no coordinate form.
- Explain the regional-forecast limitation in the UI.

## Out of Scope

- Farm address geocoding, map-provider integration, coordinate-entry UI, GPS storage or address storage.
- A database migration, new API key, new route or RLS policy.
- FarmArea weather overrides, special-weather regional mapping or agricultural recommendations.

## Allowed Files

- apps/web/src/app/components/weather-location-panel.tsx
- apps/web/src/app/styles.css
- apps/web/src/lib/integrations/kma-municipality-forecast-regions.*
- Supporting documentation and tests

## Input

- The current KMA API Hub 동네예보 지점 좌표(위경도) spreadsheet, source update 2026-07-01.

## Output

- 256 unique official city/county/district representative entries with a KMA forecast grid.
- A no-consent regional search and selection flow that saves only the label and grid.

## Acceptance Criteria

- Searching 김제시 shows 전북특별자치도 김제시 with its published representative grid.
- Search terms are resolved only against bundled browser data and are not sent to an external provider.
- Selecting a region enables the existing save action.
- Saved context remains readable to all Farm members and writable only by owner/admin through the existing route.
- The UI says this is a regional KMA forecast reference, not an exact Farm observation.

## Required Tests

- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

## Security and Domain Safety

- No API key, street address, raw coordinate, or raw GPS value is stored or transmitted by the default path.
- The existing RLS-protected weather-location endpoint remains the only persistence path.
- Weather remains reference context and does not create recommendations or FarmTasks.

## Handoff

- No migration or deployment environment change is required.
- GitHub Issue is created before the implementation PR.
