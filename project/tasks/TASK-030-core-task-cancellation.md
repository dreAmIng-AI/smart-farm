# TASK-030: Core 예정 FarmTask 취소

## Goal

owner/admin이 아직 시작하지 않은 FarmTask를 취소하고, 취소 상태를 기존 일정에 보존할 수 있게 한다.

## Background

기존 Domain은 이미 `pending → cancelled` 전이를 정의하고 `farm_tasks.status`에 `cancelled` 값을 허용한다. 하지만 실제 API와 UI가 없어 잘못 등록했거나 더 이상 필요하지 않은 예정 작업을 안전하게 정리할 수 없었다.

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
- GitHub Issue #37

## Scope

- `PATCH /api/tasks/{taskId}`로 `pending` FarmTask의 `cancelled` 전환을 추가한다.
- 기존 manager UPDATE RLS에 더해 Route Handler에서 owner/admin 역할을 확인한다.
- Task Detail에서 권한 있는 사용자에게만 취소 동작을 표시한다.
- 취소 뒤 Schedule, Today, History 조회를 갱신한다.
- 구현 계약과 tests를 갱신한다.

## Out of Scope

- FarmTask 삭제, 복구, 재일정, 이유·취소 시각·취소자 새 필드
- `in_progress`, `completed`, `issue_reported`, 기존 `cancelled` 작업의 상태 변경
- ActionLog, 새 테이블, migration, RLS 정책 변경
- UI/UX 전면 개편 및 Crop-specific 규칙

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/api/tasks/[taskId]/`
- `apps/web/src/lib/api/validation.*`
- `README.md`
- `docs/`
- `project/tasks/`

## Restricted Files

- `supabase/migrations/`
- Auth, Farm membership 모델, 외부 서비스 설정

## Input

owner/admin이 접근 가능한 `pending` FarmTask ID와 `{ "status": "cancelled" }` 요청 본문.

## Output

기존 FarmTask가 삭제되지 않고 `status = cancelled`로 저장된다. Today에서는 보이지 않지만 전체 일정에는 취소 상태로 남는다.

## Acceptance Criteria

- [x] owner/admin은 pending FarmTask만 취소할 수 있다.
- [x] farmer는 취소할 수 없고 403을 받는다.
- [x] 시작·완료·문제·취소 상태의 재취소는 409로 거부된다.
- [x] 취소된 FarmTask가 Schedule에는 남고 Today 갱신 대상에서는 제외된다.
- [x] 새 table, migration, RLS 정책을 추가하지 않는다.

## Required Tests

- [x] unit: FarmTask 취소 입력 검증
- [x] route: manager 정상 취소, farmer 거부, 진행 중 작업 거부
- [ ] manual: owner/admin으로 pending 작업을 취소하고 Schedule/Today 상태 확인
- [x] lint
- [x] typecheck
- [x] test (27 files / 104 tests)
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 기존 FarmTask 상태와 manager UPDATE RLS를 재사용한다.
- Route Handler가 `has_farm_role(owner, admin)`를 추가 확인해 farmer의 취소를 막는다.
- 취소는 작업 실행 기록이 아니므로 ActionLog를 임의 생성하지 않으며 기존 기록을 삭제하지 않는다.
- 작물명 분기, Fixture 변경, 농업 처방, 외부 Lab 연동이 없다.

## Handoff

- 변경 파일: FarmTask Route·tests, validation, Task Detail UI, 구현 계약 문서, 이 Task.
- DB migration은 필요 없다.
- 검증: `pnpm lint`, `pnpm typecheck`, `pnpm test` (27 files / 104 tests), `pnpm build`를 통과했다.
- 후속 Task: 사용자 검증 뒤 작업 상세와 모바일 목록의 정보 밀도 개선을 별도 범위로 검토한다.
