# TASK-006: Core v0.1 IssueRecord 상태 변경

## Goal

권한 있는 Farm 구성원이 History에서 IssueRecord의 현재 상태를 변경하고, 해결됨 상태의 해결 시각을 확인할 수 있게 한다.

## Background

TASK-003은 IssueRecord 상태 모델과 미해결 Issue의 Follow-up FarmTask 생성을 구현했지만, 상태를 바꾸는 사용자 흐름은 제공하지 않았다. Core v0.1의 기존 IssueRecord 구조를 유지한 채 이 빈 흐름만 보완한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-003-core-v01-issues.md`

## Scope

- IssueRecord 상태 전용 PATCH API와 입력 검증
- History의 모바일 우선 상태 선택·저장 UI
- `resolved` 상태의 서버 UTC 해결 시각 기록
- FarmMembership 기반 RLS와 `status`, `resolved_at` 컬럼 전용 UPDATE 권한 migration
- 계약 문서와 API·검증 테스트 갱신

## Out of Scope

- IssueRecord 관찰 내용·심각도 편집
- 새 Issue 상태, 별도 Issue 이벤트 테이블, 알림·워크플로 엔진
- Weather, Disease, AI, Sensor, Market 기능

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `supabase/migrations/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Restricted Files

- 기존 migration 수정 금지; 새 migration만 추가
- 서비스 역할 키, RLS 우회, 작물별 Core 분기 금지

## Input

- 접근 가능한 IssueRecord ID
- `open`, `needs_review`, `resolved`, `closed_without_action` 중 하나의 상태

## Output

- 업데이트된 IssueRecord ID, 상태, `resolvedAt`
- History에 표시되는 최신 상태

## Acceptance Criteria

- [x] 권한 있는 Farm 구성원이 상태를 변경할 수 있다.
- [x] `resolved`에서만 `resolved_at`을 기록하고 다른 상태에서는 비운다.
- [x] 권한 없는 IssueRecord는 업데이트되지 않는다.
- [x] 해결·종료된 Issue는 기존 Follow-up 생성 제약을 계속 적용한다.
- [x] 원본 관찰 내용과 심각도에는 UPDATE 권한을 부여하지 않는다.

## Required Tests

- [x] 상태 입력의 정상·비정상 검증
- [x] API 정상 업데이트, 해결 시각 초기화, 접근 불가 거부
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 작업이며 Crop Pack·Lab 기능이 아니다.
- RLS를 적용하고 `status`, `resolved_at`만 column-level UPDATE 권한을 부여한다.
- 문제 기록은 관찰 사실이며 상태 변경으로 확정 진단이나 처방을 만들지 않는다.
- 작물·품종별 분기와 Fixture 변경은 없다.

## Handoff

- 새 Supabase migration을 순서대로 실행해야 한다.
- DB migration, Domain/API/Data Dictionary, Route Handler, UI와 테스트를 함께 갱신한다.
- 후속 작업은 실제 사용자 검증에서 확인되는 입력·이력 사용성 개선으로 한정한다.
