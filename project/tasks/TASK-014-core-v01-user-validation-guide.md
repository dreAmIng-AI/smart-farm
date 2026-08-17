# TASK-014: Core v0.1 사용자 검증 가이드

## Goal

Core v0.1 구현 후 사용자 검증을 동일한 절차와 성공 기준으로 실행할 수 있게 한다.

## Background

Core v0.1의 Plan → Today → Execute → Record → Issue → Follow-up → History 흐름이 구현되었다. 다음 로드맵 단계는 사용자가 이 흐름을 실제로 이해하고 사용할 수 있는지 확인하는 것이다.

## References

- `README.md`
- `docs/DEVELOPMENT_ROADMAP.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`

## Scope

- 계획·Today, 결과·문제·이력, 초대·권한의 최소 검증 시나리오를 제공한다.
- 참가자 관찰 질문, 결과 기록 형식, 문제 중요도 기준을 제공한다.
- Draft fixture, 개인정보, 초대 링크의 안전 경계를 명확히 한다.

## Out of Scope

- 새로운 UI, API, DB migration, RLS 또는 외부 서비스
- 실제 농업 처방 검증
- Weather, AI, Disease, Sensor, Market 기능

## Allowed Files

- `README.md`
- `project/USER_VALIDATION_GUIDE.md`
- `project/tasks/**`

## Restricted Files

- `apps/**`
- `supabase/migrations/**`
- 환경 변수와 secret

## Input

- Core v0.1 현재 기능과 Development Roadmap의 User Validation 목표

## Output

- 팀원과 검증 참여자가 사용할 수 있는 재현 가능한 사용자 검증 가이드

## Acceptance Criteria

- [x] Core Work Cycle 전체를 검증하는 시나리오가 있다.
- [x] 초대 수락·재발급·권한 차이를 확인하는 시나리오가 있다.
- [x] 관찰 질문과 결과 기록 형식이 있다.
- [x] Draft fixture와 개인정보·초대 링크의 안전 경계가 있다.

## Required Tests

- [x] Markdown 링크·표·용어 수동 검토
- [x] `git diff --check`

## Security and Domain Safety

- Core Platform 사용자 검증 문서이며 Crop-specific Core hardcoding이 없다.
- 실제 농업 처방이나 자동 실행을 유도하지 않는다.
- RLS, secret, 외부 API, Lab 결과를 변경하지 않는다.

## Handoff

- DB/API/RLS 변경이 없다.
- 검증 결과의 P0/P1/P2 항목은 각각 독립 Issue·Branch·PR로 처리한다.
