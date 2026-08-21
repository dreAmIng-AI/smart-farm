# TASK-024: Core operations dashboard

## Goal

선택한 Farm과 CropCycle의 실제 Work Cycle 데이터를 한 화면에서 요약해, 현장 사용자가 오늘 해야 할 일과 관리가 필요한 문제를 빠르게 판단할 수 있게 한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`

## Scope

- 현재 Farm/CropCycle 문맥과 Today FarmTask, 전체 일정, IssueRecord 이력을 읽어 운영 현황을 표시한다.
- 오늘 작업, 지연 작업, 오늘 완료, 열림/검토 필요 문제와 심각도 높음 수를 표시한다.
- 이후 예정된 활성 FarmTask 최대 세 개와 기존 Plan/Today/Farm 화면 이동 링크를 제공한다.
- 순수 요약 함수를 unit test로 검증한다.

## Out of Scope

- Migration, 새 API, 외부 데이터 연동, 새 권한 모델
- Weather, Disease, Sensor, Market, AI, 반복 일정, WBS, trigger rule
- Crop-specific Core 로직, 농업 처방 또는 진단

## Acceptance Criteria

- [ ] 선택된 Farm에 작기가 없으면 CropCycle 선택을 안내한다.
- [ ] 선택된 작기의 실제 Today, 일정, IssueRecord 데이터만 요약한다.
- [ ] 지연 작업과 오늘 작업을 구분한다.
- [ ] 완료/취소 FarmTask와 해결된 IssueRecord는 다음 작업·관리 필요 수에서 제외한다.
- [ ] DB migration 없이 기존 membership RLS 경계를 유지한다.
- [ ] lint, typecheck, test, build가 성공한다.

## Handoff

- Supabase SQL 실행은 필요하지 않다.
- 로그인 후 Farm과 CropCycle을 열고, Plan/Today 데이터를 새로고침하면 운영 현황이 같은 데이터를 요약한다.
