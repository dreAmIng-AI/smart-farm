# TASK-026: Core 주간 작업 운영 보기

## Goal

선택한 CropCycle의 실제 FarmTask를 서울 시간 기준 주간 보드에서 읽고, 한 번의 선택으로 기존 작업 상세 화면을 열 수 있게 한다.

## Background

팀 프로토타입은 일정 데이터를 월간 달력과 주간 타임라인으로 보여준다. Smart Farm Core에는 이미 작기 전체 일정과 Today가 있으나, 현장 사용자가 한 주의 작업량과 날짜별 분포를 빠르게 파악하는 보기 기능은 없다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- GitHub Issue #29

## Scope

- 실제 `FarmTask` 일정으로 월요일~일요일의 주간 보드를 구성한다.
- 이전 주·이번 주·다음 주로 이동한다.
- 상태, 우선순위, 후속 작업 여부를 표시하고 작업 선택은 기존 상세 조회를 재사용한다.
- 서울 시간 기준 날짜 그룹화 로직을 단위 테스트한다.

## Out of Scope

- Migration, 새 API, RLS, Domain 계약 변경
- 별도 `FarmPlan`, WBS, 반복/트리거 작업 엔진
- Weather, Disease, Sensor, Market, AI와 농업 처방

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/components/`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/core/`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- `project/tasks/`

## Input

선택된 Farm과 CropCycle의 `GET /api/crop-cycles/:id/schedule` 결과.

## Output

현장 사용자는 그 주의 날짜별 작업을 보고, 작업 카드를 눌러 기존 상세·결과 기록 흐름을 연다.

## Acceptance Criteria

- [x] 실제 저장된 FarmTask만 표시한다.
- [x] 서울 시간 기준 월요일~일요일에 작업을 올바르게 그룹화한다.
- [x] 이전·이번·다음 주 이동이 동작한다.
- [x] 작업 선택이 기존 상세 조회로 연결된다.
- [x] lint, typecheck, test, build가 성공한다.

## Required Tests

- [x] unit: 날짜 그룹화와 정렬
- [x] unit: 서울 시간 주간 경계
- [ ] manual: 로그인 후 CropCycle 선택, 주간 작업 카드, 상세 연결
- [x] lint
- [x] typecheck
- [x] build

## Security and Domain Safety

- Core UI Slice이며 기존 Farm membership/RLS와 조회 API만 사용한다.
- 작물명이나 품종으로 분기하지 않는다.
- Template의 draft 검증 상태는 기존 일정 화면에서 계속 표시하며, 주간 보드는 처방을 생성하거나 표시하지 않는다.
- Lab 결과나 외부 데이터는 Core의 선행 조건이 아니다.

## Handoff

- 변경 파일: 주간 보드 component와 날짜 그룹화 unit, 기존 단일 페이지 연결, 스타일, 프로토타입 매핑 문서, 이 Task.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (26 files / 89 tests), `pnpm build` 통과.
- DB, API, migration, RLS 계약 변경은 없다. 배포 Preview에서 로그인 후 manual 확인이 남아 있다.
