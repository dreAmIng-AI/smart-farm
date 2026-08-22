# TASK-031: Core FarmTask 담당자 배정

## Goal

owner/admin이 같은 Farm 구성원을 FarmTask 담당자로 배정해 팀이 작업을 조율할 수 있게 한다.

## Background

공유 Farm과 역할 기반 협업은 구현됐지만, 각 FarmTask를 누가 맡았는지 일정과 Today에서 구분할 방법이 없었다. 사용자 결정에 따라 담당자 배정은 표시·조율 기능으로 제공하고, 긴급 현장 대응을 위해 담당자가 아닌 구성원의 작업 실행·결과 기록은 계속 허용한다.

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
- GitHub Issue #39

## Scope

- 기존 `farm_tasks`에 선택적 `assigned_user_id`를 추가한다.
- owner/admin만 같은 Farm 구성원에게 pending 또는 in-progress FarmTask를 배정·해제한다.
- DB trigger와 role-checked security-definer RPC로 같은 Farm membership 무결성을 보장한다.
- Schedule, Today, Task Detail에 담당자 정보를 표시하고 owner/admin 상세 화면에서 변경한다.
- farmer는 자신의 담당 여부 또는 팀원 배정 여부만 확인하며 구성원 이메일 목록을 새로 받지 않는다.
- migration, 계약 문서, domain type, API tests를 갱신한다.

## Out of Scope

- 담당자만 시작·완료할 수 있는 실행 권한 제한
- 자동 배정, 작업량 분석, 알림, 반복 일정, WBS, 작업 시간 추적
- 새 역할, 별도 assignment table, Crop-specific 규칙
- Weather, Disease, Sensor, Market, AI

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/api/tasks/`
- `apps/web/src/app/api/crop-cycles/`
- `apps/web/src/app/api/farms/`
- `apps/web/src/lib/api/validation.*`
- `supabase/migrations/`
- `README.md`
- `docs/`
- `project/tasks/`

## Restricted Files

- 기존 migration 수정
- Auth, FarmMembership 역할 모델, 외부 서비스 설정

## Input

owner/admin의 FarmTask ID와 같은 Farm 구성원의 UUID 또는 배정 해제를 위한 `null`.

## Output

FarmTask의 `assigned_user_id`가 업데이트되고 Schedule, Today, Detail에 담당 조율 정보가 표시된다. 담당자는 실행 권한과 독립적이다.

## Acceptance Criteria

- [x] owner/admin은 같은 Farm 구성원을 pending 또는 진행 중 FarmTask에 배정·해제할 수 있다.
- [x] farmer는 배정·해제할 수 없고 403을 받는다.
- [x] 다른 Farm 사용자, 완료·문제·취소 FarmTask에는 배정할 수 없다.
- [x] DB trigger는 direct update에도 같은 Farm 구성원 관계를 강제하고 구성원 제거 시 담당자 값만 비운다.
- [x] 담당자 배정은 다른 구성원의 작업 시작·완료·문제 기록 권한을 제한하지 않는다.
- [x] 새 migration, Data Dictionary, Domain, API 계약, tests를 함께 갱신한다.

## Required Tests

- [x] unit: 담당자 UUID/null 입력 검증
- [x] route: 정상 배정, 해제, farmer 거부, 종료 작업 거부, 다른 Farm 사용자 DB 거부
- [ ] manual: migration 적용 후 owner/admin 배정·해제, farmer Today 표시, 작업 실행 권한 유지 확인
- [x] lint
- [x] typecheck
- [x] test (28 files, 111 tests)
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 FarmTask와 FarmMembership를 재사용한다.
- RLS는 manager update를 유지하고, role-checked RPC와 DB trigger가 같은 Farm 구성원만 배정하도록 중복 검증한다.
- farmer에게 전체 구성원 이메일을 노출하지 않는다. 자신이 아닌 담당자는 `팀원 배정됨`으로만 표시한다.
- 담당자 배정은 농업 처방, Crop Pack 데이터, 상태 전이 또는 ActionLog 실행 기록이 아니다.

## Handoff

- 변경 파일: task assignment migration, assignment API·tests, task read/list contract, page assignment UI, 구현 계약 문서, 이 Task.
- DB 변경: `202608220002_core_v01_task_assignment.sql`을 Supabase SQL Editor에서 적용해야 한다.
- 남은 manual evidence: 배포 Preview에서 owner/admin 배정·해제와 farmer의 Today 표시·실행 권한을 확인한다.
- 검증 결과: `pnpm lint`, `pnpm typecheck`, `pnpm test` (28 files, 111 tests), `pnpm build` 성공.
- 후속 Task: 사용자 검증을 바탕으로 모바일 작업 상세와 목록의 정보 밀도 개선을 별도 범위로 검토한다.
