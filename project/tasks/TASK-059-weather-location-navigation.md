# TASK-059 — Weather Location Navigation

## Goal

Let an owner or admin open the Farm weather-location form directly from an unavailable Today-weather card.

## Background

The Today-weather card previously linked only to a heading inside a collapsed Farm settings disclosure. From the information screen, that disclosure was not rendered, so the link gave no visible result.

## References

- `docs/PRD_PLATFORM_V0.2.md`
- `docs/INTEGRATION_CONTRACT.md` — Weather location and privacy boundary
- `docs/UX_GUIDELINES.md`
- GitHub Issue #94

## Scope

- Navigate from the unavailable weather card to the Farm section.
- Open and scroll to the weather-location disclosure.
- Refresh Today weather after a successful location save.
- Preserve the existing owner/admin access rule and KMA-grid-only storage model.

## Out of Scope

- Farm address storage or address geocoding.
- Weather provider, API, migration, RLS or KMA-grid changes.
- Any location permission prompt acceptance by the service.

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/components/weather-card.tsx`
- `apps/web/src/app/styles.css`
- Tests directly supporting this flow

## Acceptance Criteria

- A permitted user selecting `날씨 위치 설정` from Today sees the expanded Farm weather-location form.
- The control remains keyboard accessible and visibly focused.
- A successful save returns the user to Today reference information and reloads weather.

## Required Tests

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Security and Domain Safety

- The client sends no new address, GPS coordinate or API-key value.
- The existing explicit device-location permission flow remains unchanged.
- Only the KMA grid and user-confirmed label are persisted by the existing endpoint.

## Handoff

- GitHub Issue #94 created. Create the implementation PR from this branch.
