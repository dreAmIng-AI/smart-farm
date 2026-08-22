# TASK-025: Core Work Cycle entry UX

## Goal

로그인한 사용자가 현재 Farm·CropCycle·Today 상태에서 다음으로 해야 할 Core 행동을 바로 이해하게 한다.

## Background

Core v0.1의 Plan → Today → Record → Issue → Follow-up → History 기능은 동작하지만, 단일 페이지에 생성·설정·협업·일정·기록 화면이 함께 노출되어 현장 사용자의 첫 행동이 불분명할 수 있다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- GitHub Issue #27

## Scope

- 선택된 문맥에 따른 한 개의 다음 행동 안내와 기존 섹션 이동 링크를 제공한다.
- 선택한 Farm·CropCycle이 있을 때 새 Farm·CropCycle 생성과 관리 설정을 기본적으로 접는다.
- 안내 결정 로직을 단위 테스트한다.

## Out of Scope

- Migration, API, RLS, Domain, Crop Pack 데이터 변경
- Weather, Disease, Sensor, Market, AI와 농업 처방
- 완전한 디자인 시스템 또는 화면 재구성

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/components/`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/core/`
- `project/tasks/`

## Acceptance Criteria

- [x] Farm/작기/계획/Today/종료 상태에 맞는 다음 행동을 표시한다.
- [x] 기존 생성·선택·계획·Today·이력 기능은 같은 API와 권한으로 계속 동작한다.
- [x] 이미 선택한 문맥에서는 관리성 폼이 기본적으로 접혀 있다.
- [x] lint, typecheck, test, build가 성공한다.

## Security and Domain Safety

- Core UI Slice이며 DB·권한·RLS를 변경하지 않는다.
- 작물명으로 Core 로직을 분기하지 않는다.
- Draft Fixture를 농업 처방처럼 표시하지 않는다.

## Handoff

- DB migration과 Supabase SQL 실행은 필요하지 않다.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (25 files / 87 tests), `pnpm build`를 통과했다.
- Domain, API, migration, RLS 계약 변경은 없다.
