# TASK-032: Platform v0.2 Pilot Foundation Documents

## Goal

Core Platform v0.1의 실제 구현을 보존하면서 v0.2 Real Data Pilot과 Senior-Friendly UX의 제품·통합·검증 기준을 문서로 고정한다.

## Background

현재 Core는 Farm, CropCycle, FarmTask, ActionLog, IssueRecord, Attachment, Follow-up과 History를 구현한다. 그러나 v0.2에서 필요한 FarmArea, standalone Observation/Measurement, Baseline Module, 공공데이터 provenance, cache/failure와 Today-first UX 계약이 없다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/INTEGRATION_CONTRACT.md`
- GitHub Issue #41

## Scope

- v0.2 Product Plan, PRD, Architecture, Domain, Data, API, Roadmap 문서화
- Integration Contract, Public Data Sources, UX Guidelines, Pilot Validation Guide 신규 작성
- v0.1 PRD를 Historical baseline으로 보존
- 실제 구현 상태와 planned contract를 명시적으로 구분

## Out of Scope

- Supabase migration, RLS 변경, API Route, UI refactor
- 실제 provider key 발급·저장 또는 Public API 호출
- FarmArea, Observation, Measurement, external snapshot table 구현

## Allowed Files

- `README.md`, `AGENTS.md`, `docs/`, `project/tasks/`

## Restricted Files

- `apps/`, `supabase/migrations/`, deployment/environment configuration

## Acceptance Criteria

- [x] v0.1 implementation baseline과 v0.2 planned contract가 문서상 구분된다.
- [x] Baseline Modules와 Labs의 책임이 분리된다.
- [x] FarmArea, Observation, Measurement, provenance, cache/failure 경계가 migration 없이 설계된다.
- [x] UX-01~UX-10과 Pilot validation flow가 문서화된다.
- [x] 공식 KMA, Nongsaro, KAMIS 후보와 key/verification prerequisites가 기록된다.
- [x] local Markdown link and terminology review
- [x] lint
- [x] typecheck
- [x] test (28 files, 111 tests)
- [x] build

## Security and Domain Safety

- Provider key와 raw response를 문서·client·logs에 노출하지 않는다.
- Observation은 사실, IssueRecord는 확인이 필요한 문제이며 diagnosis가 아니다.
- planned data structures are not treated as an applied database schema.

## Handoff

- Next implementation Issue: Frontend Foundation / Today-first UX.
- [DECISION REQUIRED] Weather location collection/mapping and provider key issuance must be settled before real data integration.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (28 files, 111 tests) and `pnpm build` passed.
