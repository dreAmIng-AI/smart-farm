# TASK-045 — Crop-context Nongsaro Reference Information

**Status:** Ready for review

## Goal

Show Crop Pack-mapped, official Nongsaro crop-specific disease/pest reference links in Today without letting an external provider block the Operations Core.

## Background and References

- GitHub Issue #67
- `docs/PRD_PLATFORM_V0.2.md` FR-09, FR-11, FR-12
- `docs/INTEGRATION_CONTRACT.md`
- `docs/PUBLIC_DATA_SOURCES.md`

## Scope

- Add an extension-oriented Crop Pack profile that maps an internal `cropCode` to an official Nongsaro crop name.
- Use the server-only Nongsaro `cropTechInfo` category chain and display only exact crop-name matches from its Disease/Pest category.
- Normalize title, optional registration date and official original link; keep a Farm-scoped 24-hour fresh and 30-day stale snapshot.
- Show Today provenance and a non-diagnostic data-absence/failure state.

## Out of Scope

- Cultivar- or growth-stage-specific prescription, diagnosis, symptom judgement, pesticide recommendation or automatic FarmTask.
- CropCycle redesign, Market, AI, Sensor, raw XML storage, Redis and queues.

## Acceptance Criteria

1. An unregistered Crop Pack never falls back to another crop's official data.
2. The implementation contains no crop-specific Core `if` branch; a contributor extends provider mapping through Crop Pack data.
3. Every successful result is normalized, sourced, time-stamped and cache-backed; provider errors never break Today work or records.
4. The UI clearly says reference material, not a diagnosis or instruction.

## Required Tests

- Crop Pack mapping, Nongsaro XML category/normalizer success and exact-name mismatch tests.
- Crop route missing context, unregistered Crop Pack, fresh cache, stale fallback and provider-success tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- This is a Baseline Module and Crop Pack extension, not Core or a Lab.
- `NONGSARO_API_KEY` remains a server-only Vercel variable. Raw XML, request URL and key never reach React, snapshots or logs.
- The profile only maps names; it is `evidence_checked` metadata and does not encode agricultural advice.

## Manual Migration and Handoff

After merge, run only `supabase/migrations/202608270002_platform_v02_crop_reference_information.sql` as a new Supabase SQL Editor query. It requires the prior Weather and Disease/Pest snapshot migrations. Redeploy after verifying the server-only Nongsaro key is set in Production and Preview.
