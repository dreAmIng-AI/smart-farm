# TASK-028: Core 직접 FarmTask 등록

## Goal

owner/admin이 진행 중인 CropCycle에 직접 FarmTask를 추가하고, 그 작업을 기존 일정·Today·기록 흐름에서 바로 사용할 수 있게 한다.

## Background

팀 프로토타입에는 새 작업 일정 등록이 있다. Smart Farm Core의 `farm_tasks`는 이미 `source_type = manual`과 manager INSERT RLS를 지원하지만, 이를 사용하는 API와 UI가 없었다.

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
- GitHub Issue #33

## Scope

- `POST /api/crop-cycles/{cropCycleId}/tasks` 추가
- active CropCycle 및 owner/admin 확인 후 기존 `farm_tasks`에 직접 작업 저장
- 제목, 이유, 예정일, 우선순위 UI 추가
- 저장 후 Schedule, Today, 주간 보드, 월간 달력에 즉시 반영
- API 계약과 Domain/Data/Architecture 문서 갱신

## Out of Scope

- Migration, 새 테이블, RLS 정책 변경
- WBS, 반복 일정, 트리거, 별도 FarmPlan
- Weather, Disease, Sensor, Market, AI 및 농업 처방

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/api/crop-cycles/[cropCycleId]/tasks/`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/api/validation.*`
- `README.md`
- `docs/`
- `project/tasks/`

## Input

진행 중 CropCycle의 `title`, `reason`, Asia/Seoul 기준 `scheduledFor` 날짜, `priority`.

## Output

`sourceType: manual`, `taskType: manual`, `verificationStatus: draft`, `status: pending` FarmTask가 생성되어 기존 Core 흐름에 나타난다.

## Acceptance Criteria

- [x] owner/admin은 진행 중 CropCycle에 직접 작업을 생성한다.
- [x] farmer, 없는 CropCycle, 종료 작기는 생성할 수 없다.
- [x] 입력 검증과 Seoul 예정일 변환을 수행한다.
- [x] 생성 작업이 일정·Today·주간/월간 보기·상세에 반영된다.
- [x] lint, typecheck, test, build가 성공한다.

## Required Tests

- [x] unit: 직접 작업 입력 검증
- [x] route: 정상 생성, 종료 작기 거부, farmer 거부
- [ ] manual: owner/admin으로 직접 작업을 오늘 또는 미래 날짜에 등록하고 Today/일정에서 확인
- [x] lint
- [x] typecheck
- [x] build

## Security and Domain Safety

- Core 기능이며 기존 Farm membership/RLS와 `requireFarmManager`를 함께 적용한다.
- user가 직접 입력한 작업은 Crop Pack 처방이나 전문 검증을 의미하지 않는다.
- crop-specific Core 분기 없이 기존 `FarmTask` 구조를 재사용한다.
- Lab 결과와 외부 데이터는 사용하지 않는다.

## Handoff

- 변경 파일: 직접 등록 Route와 테스트, 입력 검증, 기존 페이지 연결, 구현 계약 문서, 이 Task.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (27 files / 96 tests), `pnpm build` 통과.
- DB, migration, RLS 정책 변경은 없다. 배포 Preview에서 owner/admin으로 직접 등록 후 manual 확인이 남아 있다.
