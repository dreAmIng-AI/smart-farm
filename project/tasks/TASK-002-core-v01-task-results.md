# TASK-002: Core v0.1 작업 결과 기록

## Goal

사용자가 Today의 FarmTask에 완료 또는 미확인 결과와 짧은 메모를 기록할 수 있게 한다.

## Background

TASK-001은 Farm부터 Today까지의 계획 흐름을 구현했다. PRD FR-07의 첫 단계로 ActionLog와 FarmTask 상태 갱신을 추가한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- ActionLog migration, RLS, 기록 RPC
- 완료·미확인 결과의 입력 검증과 API
- Today의 선택적 메모와 결과 기록 UI
- 완료 상태의 일정 표시와 Today 갱신

## Out of Scope

- IssueRecord, 문제 있음 결과, Follow-up FarmTask, History
- Attachment와 Supabase Storage
- Weather, AI, Disease, Sensor, Market

## Allowed Files

- `apps/web/**`
- `supabase/migrations/**`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `README.md`
- `project/tasks/**`

## Restricted Files

- 작물 전용 Core 로직
- `farm_plans` 테이블
- 외부 Integration 또는 미래 기능 전용 인프라

## Input

인증된 사용자의 접근 가능한 `pending` 또는 `in_progress` FarmTask, 결과 종류(`completed` 또는 `not_checked`), 선택 메모와 수행 시각.

## Output

불변 ActionLog와 갱신된 FarmTask 상태. 완료 작업은 Today 목록에서 빠지고, 미확인 작업은 재확인을 위해 남는다.

## Acceptance Criteria

- [ ] 완료 기록은 ActionLog와 `completed` FarmTask 상태를 함께 저장한다.
- [ ] 미확인 기록은 ActionLog만 남기고 FarmTask 상태를 유지한다.
- [ ] 다른 Farm 사용자에게는 기록·조회가 허용되지 않는다.
- [ ] 종료된 FarmTask의 중복 결과 기록은 거부된다.

## Required Tests

- [ ] 결과 입력 검증
- [ ] 완료 API의 ActionLog/RPC 호출
- [ ] 종료 상태 전이 거부
- [ ] lint, typecheck, test, build

## Security and Domain Safety

- Core Platform Slice이며 RLS를 우회하지 않는다.
- 작물명 기반 분기가 없다.
- 결과 메모는 사용자의 관찰·작업 기록이며 농업 처방이나 진단이 아니다.
- 문제 기록과 외부 Lab은 이 Slice의 선행 조건이 아니다.

## Handoff

- migration 적용 후 실제 Today 작업의 완료·미확인 기록을 확인한다.
- 다음 Slice에서 IssueRecord와 Follow-up FarmTask를 구현한다.
