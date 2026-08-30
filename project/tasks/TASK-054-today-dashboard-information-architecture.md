# TASK-054 — Today 대시보드 정보 구조 개선

- GitHub Issue: #85
- Status: Complete

## Goal

기존 Core 작업 흐름을 유지하면서 오늘 화면을 요약형 대시보드로 강화하고, 농장 설정을 단계별로 읽기 쉽게 정리한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `docs/UX_GUIDELINES.md`
- `docs/PROTOTYPE_DASHBOARD_INTEGRATION.md`
- `AGENTS.md`
- GitHub Issue #85

## Scope

- Today에서 오늘 할 일, 늦어진 일, 확인할 기록을 짧은 운영 요약으로 표시한다.
- 기록 화면은 오늘 작업 기록을 먼저, 관찰·수치 기록을 점진적 공개로 배치한다.
- 농장 화면은 농장 → 재배 작물 → 작업 계획 단계를 표시하고 선택 설정을 접는다.
- 내부 Domain 용어를 화면의 한국어 용어로 바꾼다.

## Out of Scope

- DB migration, RLS, API 계약, 외부 Provider 또는 농업 규칙 변경
- 팀 프로토타입 코드·브랜딩·AI 기능의 복사
- 새 Crop Pack 또는 작물별 Core 분기

## Acceptance Criteria

- [x] 현재 Farm/CropCycle/FarmTask/ActionLog/IssueRecord 접근 흐름을 유지한다.
- [x] Today에서 세 운영 상태와 다음 작업을 바로 파악할 수 있다.
- [x] 농장 설정의 다음 단계와 선택 설정을 구분한다.
- [x] 기록 화면에서 오늘 작업이 관찰·측정 입력보다 먼저 보인다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.

## Security and Domain Safety

- Core 화면의 표현만 바꾼다. 기존 API와 Farm membership RLS가 권한을 계속 판단한다.
- Draft 작업과 공식 참고정보의 검증 상태·출처·실패 표시는 바꾸지 않는다.
- `strawberry` 표시는 공공 참고정보 프로필의 사용자용 이름만 재사용하며 Core 작업 로직에 작물 분기를 추가하지 않는다.

## Handoff

- 계약 변경 및 Supabase SQL Editor 작업은 없다.
- 새 DB migration, Supabase SQL Editor 또는 Vercel 환경변수 작업은 없다.
- 모바일에서 실제 Farm/CropCycle을 선택한 상태의 Pilot 확인이 다음 확인 항목이다.
