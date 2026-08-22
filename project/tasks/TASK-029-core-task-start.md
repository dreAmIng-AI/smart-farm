# TASK-029: Core 작업 시작 및 진행 상태 기록

## Goal

Farm 구성원이 Today의 대기 FarmTask를 시작하고, 기존 ActionLog와 FarmTask에 실행 시작과 진행 상태를 남길 수 있게 한다.

## Background

현재 Domain과 DB는 이미 `FarmTask.pending → in_progress → completed`, `ActionLog.action_type = started`를 정의한다. 하지만 API, RPC, UI는 완료·미확인·문제 기록만 지원해 실제 작업 시작이 이력과 상태에 남지 않았다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- GitHub Issue #35

## Scope

- `POST /api/tasks/{taskId}/action-logs`에서 `started` ActionLog 입력을 허용한다.
- `pending` FarmTask만 시작해 `in_progress`로 원자적으로 전환하는 기존 RPC 확장 migration을 추가한다.
- Today에 대기 작업의 `작업 시작` 동작과 현재 작업 상태를 표시한다.
- 이력에서 ActionLog 종류를 사람이 읽을 수 있는 한국어 라벨로 표시한다.
- migration, 구현 계약, 테스트를 함께 갱신한다.

## Out of Scope

- 반복 작업, WBS, 트리거, 새 FarmPlan 또는 새 작업 상태
- 작업 배정, 타이머, 소요 시간·근무시간 추적
- Weather, Disease, Sensor, Market, AI 또는 농업 처방
- UI/UX 전면 개편

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/api/tasks/[taskId]/action-logs/`
- `apps/web/src/lib/api/validation.*`
- `supabase/migrations/`
- `README.md`
- `docs/`
- `project/tasks/`

## Restricted Files

- 기존 migration 수정
- Auth, Farm membership 모델, 외부 서비스 설정

## Input

접근 가능한 Farm의 `pending` FarmTask ID, 선택 메모, 선택 UTC 수행 시각.

## Output

`action_type = started`, `result_code = started` ActionLog와 `status = in_progress` FarmTask. 시작 뒤의 기존 완료·미확인·문제 기록 흐름은 유지한다.

## Acceptance Criteria

- [x] `pending` FarmTask를 시작하면 ActionLog가 생성되고 FarmTask가 `in_progress`가 된다.
- [x] 이미 진행 중이거나 종료된 FarmTask에는 시작 기록을 중복 생성할 수 없다.
- [x] Today에 진행 상태와 대기 작업의 시작 동작이 표시된다.
- [x] 시작 후 Today·일정·이력이 기존 조회 흐름으로 갱신된다.
- [x] 새 migration, API·Domain·Data 계약, validation·route tests를 함께 갱신한다.

## Required Tests

- [x] unit: `started` ActionLog 입력 검증
- [x] route: 정상 시작, 진행 중 작업의 중복 시작 거부
- [ ] manual: migration 적용 후 pending 작업 시작 → Today 진행 상태 → 이력 시작 기록 확인
- [x] lint
- [x] typecheck
- [x] test (27 files / 99 tests)
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 이미 ActionLog 실행 기록과 FarmTask 상태를 재사용한다.
- RPC는 기존처럼 `auth.uid()`와 `has_farm_access`를 확인하며 RLS를 우회하지 않는다.
- 새 역할, 새 테이블, 작물별 분기, 농업 규칙·처방을 추가하지 않는다.
- Fixture·Crop Pack의 검증 상태와 외부 Lab 범위에 영향을 주지 않는다.

## Handoff

- 변경 파일: ActionLog validation·route·tests, Today UI, task-start migration, 구현 계약 문서, 이 Task.
- 검증: `pnpm lint`, `pnpm typecheck`, `pnpm test` (27 files / 99 tests), `pnpm build`를 통과했다.
- DB 변경: `202608220001_core_v01_task_start.sql`을 Supabase SQL Editor에서 적용해야 한다.
- 남은 manual evidence: 배포 Preview에서 migration 적용 후 대기 작업 시작과 이력 표시 확인.
- 후속 Task: 사용자 검증 후 모바일 작업 입력 흐름과 정보 밀도 개선을 별도 범위로 검토한다.
