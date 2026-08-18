# TASK-023: Contributor start guide

## Goal

팀원이 현재 Core Platform에 독립 기능, Crop Pack 데이터, 또는 Lab 실험을 안전하게 탑재할 수 있는 짧은 실행 가이드를 제공한다.

## Background

Core v0.1 P0 Work Cycle과 자동 CI는 구현되어 있지만, 기여자가 어느 영역에 작업을 두고 어떤 계약·검증을 함께 바꿔야 하는지 한 문서에서 따라갈 수 없었다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- Core Platform, Crop Pack, Lab, Integration의 기여 경계를 설명한다.
- 기존 TaskTemplate 기반 Crop Pack Fixture 추가 경로와 검증 상태 규칙을 명시한다.
- 한 Task·Branch·PR 흐름, DB 변경 동반 문서, CI 검증과 PR 전달 형식을 제공한다.

## Out of Scope

- 새 기능, API, migration, RLS, 외부 API 또는 자동 이메일 구현.
- Crop-specific Core logic, 실제 농업 처방, Lab의 Core 승격.

## Allowed Files

- `README.md`
- `docs/CONTRIBUTOR_GUIDE.md`
- `project/tasks/TASK-023-contributor-start-guide.md`

## Restricted Files

- `apps/**`
- `supabase/migrations/**`
- 인증, RLS, Secret, 외부 서비스 설정

## Input

- 구현된 Core v0.1 Work Cycle, existing `task_templates`, migration 규칙, GitHub Actions Core CI.

## Output

- 팀원이 첫 독립 PR을 만들고 Core와 Crop Pack/Lab의 경계를 지킬 수 있는 실행 가이드.

## Acceptance Criteria

- [ ] 기여자는 Core / Crop Pack / Lab 중 작업 영역을 판단할 수 있다.
- [ ] Crop Pack 기여자는 기존 `TaskTemplate` 필드, `draft` Fixture 규칙, 작물 독립성 조건을 알 수 있다.
- [ ] DB·API·RLS 변경 시 필요한 동반 작업과 PR 검증 명령이 명시된다.
- [ ] 외부 Integration·Secret·농업 안전성의 승인 경계가 명시된다.

## Required Tests

- [ ] Markdown 링크와 경로 수동 검토
- [ ] `git diff --check`

## Security and Domain Safety

- 이 작업은 문서만 바꾸며 Core 도메인, RLS, DB, Crop Pack Fixture를 변경하지 않는다.
- 검증 상태가 없는 농업 정보를 실제 처방으로 표현하지 않는다.
- Lab 결과와 외부 서비스는 Core의 선행 조건이 아니다.

## Handoff

- Supabase SQL 작업은 없다.
- 다음 기여자는 이 가이드를 따라 하나의 독립 Task와 PR을 생성한다.
