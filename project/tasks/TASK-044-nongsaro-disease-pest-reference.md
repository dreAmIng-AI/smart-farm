# TASK-044 — Nongsaro Disease/Pest Official Reference

**Status:** Ready for review

## Goal

Show the latest official Nongsaro occurrence bulletins in Today without allowing a provider failure to interrupt the Operations Core.

## Background and References

- GitHub Issue #65
- `docs/PRD_PLATFORM_V0.2.md` FR-09, FR-11, FR-12
- `docs/INTEGRATION_CONTRACT.md`
- `docs/PUBLIC_DATA_SOURCES.md`

## Scope

- Call Nongsaro `dbyhsCccrrncInfoList` only from the server using `NONGSARO_API_KEY`.
- Normalize bulletin title, published date and official attachment link; never return XML to the client.
- Reuse the Farm-scoped snapshot store with a 24-hour fresh TTL and seven-day stale limit.
- Add a small Today card with provenance and an explicit nationwide-reference, non-diagnostic notice.

## Out of Scope

- Crop/cultivar/growth-stage-specific content, diagnosis, treatment, chemical recommendation or FarmTask creation.
- Crop Information, Market Information, AI, sensor, automation, a raw provider-response store, Redis or queues.

## Allowed Files

- `apps/web/src/app/api/farms/**/information/**`, `apps/web/src/app/components/**`, `apps/web/src/lib/integrations/**`
- one dedicated migration, `.env.example` and implementation contracts

## Acceptance Criteria

1. A Farm member sees normalized official bulletin metadata, provenance and retrieved time in Today.
2. Provider failure returns a Korean unavailable state or a clearly labelled last successful result; Today work and records remain usable.
3. The card does not say that a disease/pest was found at the Farm and does not give advice or create work automatically.
4. Snapshot data remains Farm-scoped and RLS-protected; API keys and raw XML are never exposed.

## Required Tests

- Nongsaro XML normalizer success and provider-error tests.
- Disease/Pest route fresh-cache, stale fallback and provider-success tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security and Domain Safety

- This is a Baseline Module, not a Crop Pack or Lab. It has no crop-specific Core branch.
- The nationwide official bulletin is reference material, not a diagnosis, prescription or verified farm fact.
- No mock or draft agricultural content is added.

## Manual Migration and Handoff

After merge, run only `supabase/migrations/202608270001_platform_v02_nongsaro_disease_pest.sql` as a new Supabase SQL Editor query. It requires the prior Weather snapshot migration. Keep `NONGSARO_API_KEY` server-only in Vercel Production and Preview, then redeploy.
