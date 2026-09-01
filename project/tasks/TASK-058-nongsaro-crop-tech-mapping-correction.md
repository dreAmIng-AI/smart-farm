# TASK-058 — Nongsaro Crop Technical Mapping Correction

## Linked Issue

- GitHub Issue #92 — `[fix] 농사로 딸기 재배자료 작물 분류 매핑 보정`

## Goal

Correct the Nongsaro `cropTechInfo` integration without changing Core Farm, CropCycle or task domains.

## Scope

- Store evidence-checked Nongsaro technical-reference category codes in the Crop Pack profile.
- Query only the registered crop's disease/pest technical-reference categories.
- Keep unregistered Crop Packs unavailable; never substitute another crop's material.
- Retain server-only API-key handling, normalized output, stale snapshot behavior and non-diagnostic UI language.

## Verification

- The Strawberry Crop Pack uses the verified Nongsaro `VC / VC01 / VC010804 / GP / GP01, GP02` category path.
- Adapter tests confirm provider requests derive from Crop Pack data.
- Repository lint, typecheck, test and build pass.

## Out of Scope

- New Farm address fields or address-to-grid geocoding.
- Market-price freshness-policy changes.
- Crop-specific diagnosis, treatment, or automatic FarmTask generation.
