# TASK-050 — 단순한 농장 앱 화면 구조

- GitHub Issue: #77
- Status: Complete

## Goal

기존 Farm → CropCycle → FarmTask → ActionLog / IssueRecord 흐름을 보존하면서, 첫 화면의 선택지를 줄여 농장 운영자가 다음 행동을 바로 이해할 수 있게 한다.

## References

- `docs/PRD_PLATFORM_V0.2.md`
- `docs/UX_GUIDELINES.md`
- `AGENTS.md`
- GitHub Issue #77

## Scope

- `오늘`, `기록`, `정보`, `농장` 네 목적의 하단 화면 전환을 제공한다.
- `오늘`은 오늘·지연 작업과 확인할 문제의 시작점만 보여 준다.
- `기록`에는 작업 결과·관찰·선택적 측정을, `정보`에는 Weather·Disease/Pest·Crop·Market 카드를, `농장`에는 선택·작기·구역·구성원·설정을 배치한다.
- 작업 계획, 전체 일정, 이력은 기본 화면을 방해하지 않는 점진적 공개로 유지한다.

## Out of Scope

- Toss 브랜드·로고·아이콘·문구·화면의 복제
- DB migration, RLS, API 계약, 권한 또는 농업 규칙 변경
- 새로운 외부 데이터·AI·진단·자동화 기능

## Acceptance Criteria

- [x] Farm/CropCycle 선택 뒤 홈에서 오늘 작업 기록 화면을 한 번의 탭으로 연다.
- [x] 외부 참고정보는 별도의 정보 화면에서 기존 출처·신선도·실패 상태와 함께 보인다.
- [x] 관찰 및 측정 기록이 작업 계획·농장 설정과 섞여 보이지 않는다.
- [x] 기존 일정·이력·농장 관리 기능은 계속 접근할 수 있다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.

## Security and Domain Safety

- 표현과 화면 이동만 변경한다. 기존 API와 RLS가 계속 최종 권한을 판단한다.
- Draft TaskTemplate과 외부 참고 정보의 검증 상태·출처 표시는 유지한다.
