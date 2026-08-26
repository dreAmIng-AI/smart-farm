# TASK-043: FarmArea Work Context

## Goal

Owner/admin이 작기의 주 재배 구역과 직접 작업의 대상 재배 구역을 선택하고, 일정·Today·상세에서 확인할 수 있게 한다.

## Background

FarmArea 등록은 구현되었지만 기존 CropCycle과 FarmTask에는 재배 구역 문맥이 없었다. Platform v0.2 FR-03은 별도 FarmPlan이나 작물별 Core 분기 없이 이 선택적 관계를 요구한다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md` (FR-03)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- GitHub Issue #59

## Scope

- `crop_cycles.farm_area_id`, `farm_tasks.farm_area_id` 추가
- 같은 Farm의 FarmArea만 연결하도록 DB composite foreign key와 API 검증 추가
- 작기의 주 재배 구역을 새 template FarmTask에 상속
- 작기 생성·편집, 직접 작업 생성, 일정·Today·상세의 선택·표시 연결

## Out of Scope

- 기존 FarmTask의 일괄 재배정
- FarmArea 수정·삭제 UI/API, GIS, 주소, 센서 또는 FarmArea별 날씨
- Follow-up FarmTask의 재배 구역 상속 변경

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `supabase/migrations/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Restricted Files

- Supabase Secret, Service Role Key, provider key
- 기존 migration 변경 또는 Core domain rename

## Input

- 선택적 UUID `farmAreaId`; 지정하면 현재 Farm과 같은 FarmArea여야 한다.

## Output

- camelCase API의 선택적 `farmAreaId`
- Template 생성 작업의 inherited FarmArea, 직접 작업의 chosen FarmArea

## Acceptance Criteria

- [x] FarmArea가 없는 기존 CropCycle/FarmTask가 계속 조회된다.
- [x] owner/admin이 CropCycle 생성 또는 편집 시 주 재배 구역을 선택·해제할 수 있다.
- [x] 새 template FarmTask는 선택된 CropCycle FarmArea를 상속한다.
- [x] 직접 FarmTask는 같은 Farm의 선택적 FarmArea를 보관한다.
- [x] 다른 Farm의 FarmArea는 API와 DB에서 거부된다.
- [x] 일정, Today, 상세가 `farmAreaId`를 반환·표시한다.

## Required Tests

- [x] CropCycle/FarmTask input validation
- [x] 다른 FarmArea API 거부 regression
- [x] lint, typecheck, test, build
- [ ] Supabase SQL Editor migration 확인

## Security and Domain Safety

- Operations Core 변경이며 작물 전용 분기가 없다.
- 기존 Farm, CropCycle, TaskTemplate, FarmTask, ActionLog, IssueRecord, Attachment를 유지한다.
- Fixture 및 Template의 `draft` 검증 상태를 변경하지 않는다.
- RLS를 우회하지 않고 database foreign key를 추가 보호로 사용한다.

## Handoff

- Merge 후 `202608260001_platform_v02_farm_area_work_context.sql` 전체를 **새 Supabase SQL Editor query**로 한 번 실행한다.
- Migration 실행 전 FarmArea, Observation, Measurement, Weather와 Observation-origin IssueRecord migration이 적용돼 있어야 한다.
- 기존 일정은 자동으로 재배 구역을 바꾸지 않는다. 필요한 경우 owner/admin이 작기를 지정한 뒤 새 template 계획 또는 직접 작업부터 사용한다.
