# TASK-003: Core v0.1 문제 기록·재확인·이력

## Goal

사용자가 Today의 FarmTask에서 관찰한 문제를 기록하고, 원본 문제를 추적하는 재확인 작업과 이력을 확인할 수 있게 한다.

## Background

TASK-001은 Farm부터 Today까지의 계획 흐름을, TASK-002는 완료·미확인 결과의 ActionLog를 구현했다. 이 Task는 PRD의 Problem Path를 최소 범위로 완성한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (FR-07~10, AC-07~09)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- `issue_records` migration, RLS, 원자적 문제 기록 RPC
- `issue_reported` ActionLog와 연결 IssueRecord 생성
- 미해결 IssueRecord에서 `parent_issue_id`를 가진 Follow-up FarmTask 생성
- Farm 단위 ActionLog·IssueRecord·Follow-up 관계 이력 조회
- Today의 문제 기록과 재확인 작업 UI

## Out of Scope

- Issue 해결·검토 상태 변경
- Attachment와 Supabase Storage
- Weather, AI, Disease, Sensor, Market
- 작물별 문제 판단, 진단, 처방 또는 자동 제어

## Acceptance Criteria

- [ ] 문제 기록은 ActionLog와 IssueRecord를 함께 만들고 원본 FarmTask를 `issue_reported`로 갱신한다.
- [ ] IssueRecord는 관찰 사실, 심각도, 전문가 확인 필요 여부를 보존한다.
- [ ] 미해결 IssueRecord에서만 재확인 작업을 만들고 `parent_issue_id`로 원본을 추적한다.
- [ ] Today·일정·이력에서 후속 작업과 관계를 확인할 수 있다.
- [ ] RLS로 접근 가능한 Farm의 데이터만 읽고 쓴다.

## Required Tests

- [ ] 문제 입력 검증
- [ ] 문제 기록 API의 ActionLog·IssueRecord RPC 호출
- [ ] 미해결 Issue의 Follow-up 생성과 해결된 Issue 거부
- [ ] ActionLog·IssueRecord·Follow-up 관계의 이력 순서
- [ ] lint, typecheck, test, build

## Security and Domain Safety

- `observed_symptom`은 사용자의 관찰 기록이며 확정 진단이 아니다.
- Core 로직은 작물명으로 분기하지 않는다.
- Follow-up은 기존 `farm_tasks`와 `source_type = issue_followup`을 사용하며 새 계획 테이블을 만들지 않는다.
- RLS를 우회하지 않는다.
