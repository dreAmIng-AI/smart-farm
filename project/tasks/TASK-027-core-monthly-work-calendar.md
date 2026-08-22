# TASK-027: Core 월간 FarmTask 캘린더

## Goal

선택한 CropCycle의 실제 FarmTask 일정 분포를 월간 달력에서 보고, 날짜와 작업을 선택해 기존 작업 상세 흐름으로 이어간다.

## Background

팀 프로토타입은 월간 달력과 주간 타임라인으로 작업을 관리한다. Core에는 작기 전체 일정과 주간 보드가 있으나, 사용자가 한 달 단위로 작업의 분포와 특정 날짜의 작업을 확인하는 기능은 없다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- GitHub Issue #31

## Scope

- 저장된 FarmTask를 서울 시간 기준 일요일 시작 6주 달력으로 표시한다.
- 이전 달·이번 달·다음 달을 이동한다.
- 날짜를 선택하면 해당 날짜의 모든 작업과 상태·우선순위를 표시한다.
- 작업 선택 시 기존 작업 상세·결과 기록 위치로 이동한다.
- 월 경계와 서울 날짜 변환을 단위 테스트한다.

## Out of Scope

- Migration, 새 API, RLS, Domain 계약 변경
- WBS, 반복 일정, 트리거 규칙, 별도 FarmPlan
- Weather, Disease, Sensor, Market, AI와 농업 처방

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/components/`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/core/`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- `project/tasks/`

## Input

선택한 CropCycle의 기존 Schedule 조회 결과.

## Output

사용자는 월간 일정 분포와 날짜별 작업을 확인하고 기존 상세·결과 기록으로 이동한다.

## Acceptance Criteria

- [x] 실제 저장된 FarmTask만 표시한다.
- [x] 서울 시간 기준 날짜와 월 경계가 맞다.
- [x] 이전·이번·다음 달 이동이 동작한다.
- [x] 날짜별 모든 작업과 작업 상세 연결을 제공한다.
- [x] lint, typecheck, test, build가 성공한다.

## Required Tests

- [x] unit: 6주 달력 범위와 날짜별 작업 그룹화
- [x] unit: 서울 시간 기준 월 이동
- [ ] manual: 로그인 후 CropCycle 선택, 날짜 선택, 작업 상세 연결
- [x] lint
- [x] typecheck
- [x] build

## Security and Domain Safety

- Core UI Slice이며 Farm membership/RLS와 기존 조회 API만 사용한다.
- 작물·품종별 Core 분기가 없다.
- 주간 보드와 달력은 기존 저장 데이터를 읽을 뿐, 농업 처방을 만들지 않는다.
- 외부 Lab 결과는 Core의 선행 조건이 아니다.

## Handoff

- 변경 파일: 월간 달력 component와 날짜 그룹화 unit, 기존 단일 페이지 연결, 스타일, 프로토타입 매핑 문서, 이 Task.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (26 files / 90 tests), `pnpm build` 통과.
- DB, API, migration, RLS 계약 변경은 없다. 배포 Preview에서 로그인 후 manual 확인이 남아 있다.
